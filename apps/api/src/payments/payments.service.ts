import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { YookassaService } from './yookassa.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly yookassa: YookassaService,
    private readonly mailService: MailService,
  ) {}

  /** Создаёт (или пересоздаёт) платёж ЮKassa для заказа и возвращает ссылку на оплату */
  async initiatePayment(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Заказ не найден');

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
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
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
        include: { user: { select: { email: true } } },
      });
      void this.mailService.sendOrderStatusChangedEmail(updated.user.email, {
        id: updated.id,
        statusLabel: 'Оплачен',
      });
      return updated;
    }

    if (payment.status === 'canceled' && order.status === 'PENDING') {
      return prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
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
