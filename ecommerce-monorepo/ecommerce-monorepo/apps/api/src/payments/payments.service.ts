import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { YookassaService } from './yookassa.service';
import { MailService } from '../mail/mail.service';
import { OrderLifecycleService } from '../order-lifecycle/order-lifecycle.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly yookassa: YookassaService,
    private readonly mailService: MailService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  /** Создаёт (или пересоздаёт) платёж ЮKassa для заказа и возвращает ссылку на оплату */
  async initiatePayment(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Заказ не найден');
    // Отменённый (в т.ч. автоматически, из-за неоплаты) или уже оплаченный заказ повторно оплатить нельзя
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        order.status === 'CANCELLED' ? 'Заказ отменён — оплата невозможна' : 'Заказ уже оплачен',
      );
    }

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
    const payment = await this.yookassa.createPayment({
      amountCents: order.totalCents,
      description: `Заказ №${order.id.slice(-8).toUpperCase()}`,
      returnUrl: `${frontendUrl}/orders/${order.id}`,
      orderId: order.id,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: 'CARD', paymentId: payment.id },
    });

    return { paymentUrl: payment.confirmation?.confirmation_url ?? null };
  }

  /**
   * Запрашивает у ЮKassa актуальный статус и синхронизирует заказ. Вызывается
   * и при возврате покупателя на страницу заказа (активная проверка — вебхук
   * на localhost без туннеля не дойдёт), и из вебхука (там — как источник
   * истины вместо доверия телу уведомления напрямую).
   */
  async syncOrderPaymentStatus(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.paymentId) return order;

    const payment = await this.yookassa.getPayment(order.paymentId);

    if (payment.status === 'succeeded' && order.status === 'PENDING') {
      // Условное обновление: если параллельно (вебхук + страница заказа) уже оплачен или отменён — ничего не делаем
      const moved = await prisma.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { user: { select: { email: true } } },
      });
      if (moved.count > 0 && updated) {
        void this.mailService.sendOrderStatusChangedEmail(updated.user.email, {
          id: updated.id,
          statusLabel: 'Оплачен',
        });
      }
      return updated;
    }

    // Покупатель оплатил уже после автоотмены (платёж в ЮKassa дожил до оплаты): пробуем вернуть заказ
    if (payment.status === 'succeeded' && order.status === 'CANCELLED') {
      try {
        const reopened = await this.lifecycle.reopenOrder(order.id, 'PAID');
        if (reopened) {
          this.logger.warn(`Заказ ${order.id} оплачен после отмены — восстановлен и отмечен как оплаченный`);
        }
      } catch (error) {
        this.logger.error(
          `ТРЕБУЕТСЯ РУЧНАЯ ОБРАБОТКА: платёж ${payment.id} по отменённому заказу ${order.id} оплачен, ` +
            `но восстановить заказ не удалось (${error instanceof Error ? error.message : error}). ` +
            `Верните деньги покупателю в личном кабинете ЮKassa или соберите заказ вручную.`,
        );
      }
      return prisma.order.findUnique({ where: { id: order.id } });
    }

    if (payment.status === 'canceled' && order.status === 'PENDING') {
      // Платёж отменён/истёк — заказ отменяем и возвращаем товары на склад
      await this.lifecycle.cancelOrder(order.id, ['PENDING']);
      return prisma.order.findUnique({ where: { id: order.id } });
    }

    return order;
  }

  /** Обработчик вебхука ЮKassa — по id платежа из уведомления сверяемся с самим ЮKassa */
  async handleWebhook(paymentId: string) {
    const order = await prisma.order.findFirst({ where: { paymentId } });
    if (!order) {
      this.logger.warn(`Вебхук ЮKassa: заказ для платежа ${paymentId} не найден`);
      return;
    }
    await this.syncOrderPaymentStatus(order.id);
  }
}
