import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * ЮKassa шлёт сюда уведомления об изменении статуса платежа. Публичный
   * эндпоинт (без auth) — так и должно быть, это не наш пользователь.
   * Телу уведомления не доверяем напрямую — берём из него только id платежа
   * и перепроверяем реальный статус через собственный запрос к API ЮKassa.
   *
   * ВАЖНО: на localhost этот адрес недоступен снаружи — ЮKassa не сможет
   * до него достучаться без туннеля (ngrok и т.п.). Для локальной разработки
   * это не критично: статус синхронизируется через POST /orders/:id/payment-status,
   * который вызывается со страницы заказа при возврате с оплаты.
   */
  @Post('yookassa/webhook')
  @HttpCode(200)
  async webhook(@Body() body: { object?: { id?: string } }) {
    const paymentId = body?.object?.id;
    if (paymentId) {
      await this.paymentsService.handleWebhook(paymentId);
    }
    return { received: true };
  }
}
