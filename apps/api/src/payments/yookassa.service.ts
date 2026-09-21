import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
}

@Injectable()
export class YookassaService {
  private readonly logger = new Logger(YookassaService.name);

  private get shopId() {
    // Публичные тестовые креды ЮKassa для самостоятельного тестирования —
    // см. https://github.com/yoomoney/yookassa-github-docs. Замени в .env
    // на свои боевые/тестовые значения из личного кабинета, когда заведёшь аккаунт.
    return process.env.YOOKASSA_SHOP_ID || '54401';
  }

  private get secretKey() {
    return process.env.YOOKASSA_SECRET_KEY || 'test_Fh8hUAVVBGUGbjmlzba6TB0iyUbos_lueTHE-axOwM0';
  }

  private get authHeader() {
    const token = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${token}`;
  }

  /** Создаёт платёж и возвращает ссылку, на которую нужно перенаправить покупателя */
  async createPayment(params: {
    amountCents: number;
    description: string;
    returnUrl: string;
    orderId: string;
  }): Promise<YookassaPayment> {
    let res: Response;
    try {
      res = await fetch(`${YOOKASSA_API_URL}/payments`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          'Idempotence-Key': randomUUID(),
        },
        body: JSON.stringify({
          amount: {
            value: (params.amountCents / 100).toFixed(2),
            currency: 'RUB',
          },
          capture: true,
          confirmation: {
            type: 'redirect',
            return_url: params.returnUrl,
          },
          description: params.description,
          metadata: { orderId: params.orderId },
        }),
      });
    } catch (error) {
      // Сетевая ошибка (DNS, TLS, отказ соединения) — fetch выбросил исключение
      // до получения какого-либо ответа
      this.logger.error(
        `Сетевая ошибка при обращении к ЮKassa (создание платежа): ${
          error instanceof Error ? error.stack ?? error.message : error
        }`,
      );
      throw new Error('Не удалось связаться с ЮKassa (сетевая ошибка)');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Ошибка создания платежа ЮKassa (${res.status}): ${body}`);
      throw new Error('Не удалось создать платёж в ЮKassa');
    }

    return res.json() as Promise<YookassaPayment>;
  }

  /** Запрашивает у ЮKassa актуальный статус платежа — источник истины, а не то,
   *  что пришло в вебхуке/query-параметрах (их доверять напрямую нельзя) */
  async getPayment(paymentId: string): Promise<YookassaPayment> {
    let res: Response;
    try {
      res = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
        headers: { Authorization: this.authHeader },
      });
    } catch (error) {
      this.logger.error(
        `Сетевая ошибка при обращении к ЮKassa (проверка статуса): ${
          error instanceof Error ? error.stack ?? error.message : error
        }`,
      );
      throw new Error('Не удалось связаться с ЮKassa (сетевая ошибка)');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Ошибка получения статуса платежа ЮKassa (${res.status}): ${body}`);
      throw new Error('Не удалось получить статус платежа');
    }

    return res.json() as Promise<YookassaPayment>;
  }
}
