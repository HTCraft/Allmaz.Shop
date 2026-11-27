import { Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import {
  REVENUE_STATUSES,
  buildSalesReport,
  isValidTimeZone,
  resolveRange,
} from './stats/sales-report';

const LOW_STOCK_THRESHOLD = 5;
const DEFAULT_TIMEZONE = 'Europe/Moscow';

/** Часовой пояс магазина (граница суток в отчётах): SHOP_TIMEZONE, по умолчанию Москва */
function shopTimezone(): string {
  const tz = process.env['SHOP_TIMEZONE']?.trim();
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

@Injectable()
export class AdminStatsService {
  async getStats() {
    const [productsCount, categoriesCount, usersCount, outOfStockCount, pendingOrdersCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.user.count(),
        prisma.product.count({ where: { stock: 0 } }),
        prisma.order.count({ where: { status: 'PENDING' } }),
      ]);

    return { productsCount, categoriesCount, usersCount, outOfStockCount, pendingOrdersCount };
  }

  /**
   * Отчёт по продажам за период (по умолчанию 30 дней) со сравнением с предыдущим периодом такой же
   * длины. Заказы и позиции загружаются одной выборкой и агрегируются в памяти — этого хватает для
   * магазина до десятков тысяч заказов в год; при росте — перенести группировку в SQL.
   */
  async getSalesReport(query: { from?: string; to?: string; days?: number }) {
    const tz = shopTimezone();
    const range = resolveRange(query, tz);

    const [orders, items, lowStock] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: range.previous.startUtc, lt: range.endUtc } },
        select: {
          createdAt: true,
          status: true,
          totalCents: true,
          discountCents: true,
          promoCode: { select: { code: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: REVENUE_STATUSES },
            createdAt: { gte: range.startUtc, lt: range.endUtc },
          },
        },
        select: { productId: true, productTitle: true, quantity: true, priceCents: true },
      }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stock: 'asc' }, { title: 'asc' }],
        take: 10,
        select: { id: true, title: true, sku: true, stock: true },
      }),
    ]);

    return { ...buildSalesReport({ orders, items, range, tz }), lowStock };
  }
}
