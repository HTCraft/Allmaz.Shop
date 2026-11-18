import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { PaymentsService } from './payments.service';
import { MailService } from '../mail/mail.service';
import { OrderLifecycleService } from '../order-lifecycle/order-lifecycle.service';
import { unpaidOrderTtlMs } from '../order-lifecycle/unpaid-order-ttl';

const RUN_INTERVAL_MS = 5 * 60_000;
const FIRST_RUN_DELAY_MS = 30_000;
const BATCH_SIZE = 50;

/**
 * Фоновая отмена заказов с онлайн-оплатой, которые не оплатили вовремя: возвращает товары на склад
 * и освобождает промокод. Заказы с оплатой при получении не трогает. Без внешних зависимостей —
 * обычный таймер; повторный/параллельный запуск безопасен (отмена условная и идемпотентная).
 * Отключается переменной UNPAID_ORDER_JOB=off.
 */
@Injectable()
export class UnpaidOrdersJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnpaidOrdersJob.name);
  private timer?: NodeJS.Timeout;
  private firstRun?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly payments: PaymentsService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    if (process.env['UNPAID_ORDER_JOB'] === 'off') {
      this.logger.log('Автоотмена неоплаченных заказов отключена (UNPAID_ORDER_JOB=off)');
      return;
    }
    this.firstRun = setTimeout(() => void this.run(), FIRST_RUN_DELAY_MS);
    this.timer = setInterval(() => void this.run(), RUN_INTERVAL_MS);
    this.firstRun.unref();
    this.timer.unref();
    this.logger.log(`Автоотмена неоплаченных заказов: срок ${unpaidOrderTtlMs() / 60_000} мин`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.firstRun) clearTimeout(this.firstRun);
  }

  async run(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let cancelledCount = 0;
    try {
      const cutoff = new Date(Date.now() - unpaidOrderTtlMs());
      const stale = await prisma.order.findMany({
        where: { status: 'PENDING', paymentMethod: 'CARD', createdAt: { lt: cutoff } },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      });

      for (const order of stale) {
        try {
          // Перед отменой спрашиваем ЮKassa: платёж мог пройти, а вебхук — потеряться
          if (order.paymentId) {
            const synced = await this.payments.syncOrderPaymentStatus(order.id);
            if (synced && synced.status !== 'PENDING') continue; // оплачен или уже отменён
          }

          // Только из PENDING: если заказ успели оплатить между проверкой и отменой — не трогаем
          const cancelled = await this.lifecycle.cancelOrder(order.id, ['PENDING']);
          if (cancelled) {
            cancelledCount++;
            void this.mailService.sendOrderStatusChangedEmail(order.user.email, {
              id: order.id,
              statusLabel: 'Отменён: заказ не был оплачен вовремя',
            });
          }
        } catch (error) {
          // Нет связи с ЮKassa и т.п.: при неопределённости заказ не отменяем, повторим в следующий раз
          this.logger.warn(
            `Не удалось обработать неоплаченный заказ ${order.id}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }

      if (cancelledCount > 0) {
        this.logger.log(`Автоотмена: отменено неоплаченных заказов — ${cancelledCount}`);
      }
    } catch (error) {
      this.logger.error(
        `Сбой фоновой отмены неоплаченных заказов: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.running = false;
    }
    return cancelledCount;
  }
}
