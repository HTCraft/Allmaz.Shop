import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, prisma } from '@ecommerce/database';

/**
 * Единственное место, где заказ переходит в CANCELLED и обратно. Остатки товара и счётчик
 * промокода меняются вместе со статусом в одной транзакции, а смена статуса — условная
 * (updateMany по текущему статусу), поэтому повторный вызов или две одновременные отмены
 * (вебхук ЮKassa + фоновая задача + админ) не вернут остатки дважды.
 */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  /**
   * Отменяет заказ: возвращает товары на склад и освобождает использование промокода.
   * `onlyFrom` — отменять только из этих статусов (например, ['PENDING'], чтобы не отменить
   * заказ, который успели оплатить). Возвращает false, если заказ уже отменён или статус не подошёл.
   */
  async cancelOrder(orderId: string, onlyFrom?: OrderStatus[]): Promise<boolean> {
    const cancelled = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: onlyFrom ? { in: onlyFrom } : { not: 'CANCELLED' },
        },
        data: { status: 'CANCELLED' },
      });
      if (claimed.count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      for (const item of order.items) {
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      if (order.promoCodeId) {
        await tx.promoCode.updateMany({
          where: { id: order.promoCodeId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      return true;
    });

    if (cancelled) this.logger.log(`Заказ ${orderId} отменён, остатки возвращены на склад`);
    return cancelled;
  }

  /**
   * Возвращает отменённый заказ в работу: заново резервирует товары. Если на складе уже не
   * хватает — бросает 400 и ничего не меняет (транзакция откатывается целиком).
   * Возвращает false, если заказ не был отменён.
   */
  async reopenOrder(orderId: string, status: OrderStatus): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'CANCELLED' },
        data: { status },
      });
      if (claimed.count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      for (const item of order.items) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count === 0) {
          throw new BadRequestException(
            `Нельзя восстановить заказ: товара «${item.productTitle}» не хватает на складе`,
          );
        }
      }

      if (order.promoCodeId) {
        await tx.promoCode.updateMany({
          where: { id: order.promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }
      return true;
    });
  }
}
