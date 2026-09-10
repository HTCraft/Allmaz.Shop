import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (!this.transporter) {
      // SMTP не настроен — просто логируем ссылку, чтобы можно было тестировать локально
      this.logger.warn(
        `SMTP не настроен. Ссылка для восстановления пароля (${to}): ${resetLink}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@ecommerce.local',
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

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@ecommerce.local',
      to,
      subject: 'Подтверждение регистрации',
      html: `<p>Спасибо за регистрацию! Ваш код подтверждения:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>Код действителен 15 минут. Введите его на сайте, чтобы активировать аккаунт.</p>`,
    });
  }
}
