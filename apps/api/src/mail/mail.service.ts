import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { lookup } from 'dns/promises';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  async onModuleInit() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)) {
      return; // SMTP не настроен — методы ниже просто логируют в консоль
    }

    // На некоторых сетях (VPN, виртуальные адаптеры, DNS-перехват провайдером)
    // резолвинг хоста напрямую внутри Node может вернуть недоступный IP, хотя
    // системный резолвер ОС (тот же, что использует telnet по имени) даёт
    // рабочий адрес. Поэтому резолвим через dns.lookup (тот же механизм ОС,
    // getaddrinfo) и подключаемся к SMTP уже по конкретному IP — а исходное
    // имя хоста передаём отдельно как servername, чтобы TLS-сертификат
    // (выписанный на доменное имя, а не на IP) прошёл проверку.
    let connectHost = SMTP_HOST;
    try {
      const { address } = await lookup(SMTP_HOST, { family: 4 });
      connectHost = address;
      this.logger.log(`SMTP-хост ${SMTP_HOST} резолвится (через ОС) в ${address}`);
    } catch (error) {
      this.logger.warn(
        `Не удалось резолвить ${SMTP_HOST} через dns.lookup, используем имя хоста как есть: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    this.transporter = nodemailer.createTransport({
      host: connectHost,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { servername: SMTP_HOST }, // важно при подключении по IP — иначе TLS не пройдёт проверку сертификата
    });

    // Проверяем соединение один раз при старте — чтобы сразу увидеть в логах,
    // если креды неверные, а не только когда кто-то попытается зарегистрироваться
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `Не удалось подключиться к SMTP (${SMTP_HOST}:${SMTP_PORT} → ${connectHost}): ${error.message}`,
        );
      } else {
        this.logger.log(`SMTP подключен: ${SMTP_HOST}:${SMTP_PORT} (через ${connectHost})`);
      }
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (!this.transporter) {
      // SMTP не настроен — просто логируем ссылку, чтобы можно было тестировать локально
      this.logger.warn(
        `SMTP не настроен. Ссылка для восстановления пароля (${to}): ${resetLink}`,
      );
      return;
    }

    await this.send({
      to,
      subject: 'Восстановление пароля',
      html: `<p>Для сброса пароля перейдите по ссылке:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Ссылка действительна 1 час.</p>`,
    });
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    if (!this.transporter) {
      // SMTP не настроен — просто логируем код, чтобы можно было тестировать локально
      this.logger.warn(`SMTP не настроен. Код подтверждения для ${to}: ${code}`);
      return;
    }

    await this.send({
      to,
      subject: 'Подтверждение регистрации',
      html: `<p>Спасибо за регистрацию! Ваш код подтверждения:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>Код действителен 15 минут. Введите его на сайте, чтобы активировать аккаунт.</p>`,
    });
  }

  async sendOrderConfirmationEmail(
    to: string,
    order: { id: string; totalCents: number; shippingAddress: string },
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP не настроен. Заказ ${order.id} оформлен для ${to}`);
      return;
    }

    const orderNumber = order.id.slice(-8).toUpperCase();
    const total = (order.totalCents / 100).toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    });

    await this.send({
      to,
      subject: `Заказ №${orderNumber} оформлен`,
      html: `<p>Спасибо за заказ! Номер вашего заказа — <b>${orderNumber}</b>.</p><p>Сумма: <b>${total}</b></p><p>Адрес доставки: ${order.shippingAddress}</p><p>Мы свяжемся с вами для подтверждения. Оплата — при получении.</p>`,
    });
  }

  async sendOrderStatusChangedEmail(
    to: string,
    order: { id: string; statusLabel: string },
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP не настроен. Статус заказа ${order.id} изменён: ${order.statusLabel}`,
      );
      return;
    }

    const orderNumber = order.id.slice(-8).toUpperCase();

    await this.send({
      to,
      subject: `Заказ №${orderNumber}: статус изменён`,
      html: `<p>Статус вашего заказа №<b>${orderNumber}</b> изменён на:</p><p style="font-size: 18px; font-weight: bold;">${order.statusLabel}</p>`,
    });
  }

  /**
   * Единая точка отправки. Ошибки SMTP (неверные креды, недоступность сервера и т.п.)
   * логируются, но не пробрасываются дальше — падение письма не должно ронять
   * основной запрос (регистрацию, оформление заказа и т.д.), который уже выполнил
   * свою главную работу до отправки письма.
   */
  private async send(mail: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter!.sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@ecommerce.local',
        ...mail,
      });
    } catch (error) {
      this.logger.error(
        `Не удалось отправить письмо на ${mail.to} (${mail.subject}): ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
