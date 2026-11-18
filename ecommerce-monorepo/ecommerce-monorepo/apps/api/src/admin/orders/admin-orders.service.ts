import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { UpdateOrderStatusDto } from '../dto/update-user-role.dto';
import { MailService } from '../../mail/mail.service';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';
import { OrderLifecycleService } from '../../order-lifecycle/order-lifecycle.service';

const ADMIN_ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' as const } },
  user: { select: { id: true, email: true, name: true } },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает обработки',
  PAID: 'Оплачен',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly mailService: MailService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search
      ? {
          OR: [
            { id: { contains: query.search, mode: 'insensitive' as const } },
            { user: { email: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ADMIN_ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
  }

  async get(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!order) throw new NotFoundException('Заказ не найден');

    if (dto.status === order.status) return this.get(id);

    // Отмена возвращает товар на склад, снятие отмены — резервирует заново (или даёт 400,
    // если товара уже не хватает); остальные переходы — просто смена статуса
    if (dto.status === 'CANCELLED') {
      await this.lifecycle.cancelOrder(id);
    } else if (order.status === 'CANCELLED') {
      await this.lifecycle.reopenOrder(id, dto.status);
    } else {
      await prisma.order.update({ where: { id }, data: { status: dto.status } });
    }

    void this.mailService.sendOrderStatusChangedEmail(order.user.email, {
      id: order.id,
      statusLabel: STATUS_LABELS[dto.status] ?? dto.status,
    });

    return this.get(id);
  }
}
