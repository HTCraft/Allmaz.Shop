import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { prisma } from '@ecommerce/database';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RestorePasswordDto } from './dto/restore-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 минут

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        isVerified: false, // аккаунт заблокирован до подтверждения email
      },
    });

    await this.issueVerificationCode(user.id, user.email);

    // Cookie/JWT не выдаём — аккаунт ещё не активен
    return {
      message:
        'Регистрация почти завершена. Мы отправили код подтверждения на почту — введите его, чтобы активировать аккаунт.',
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Аккаунт не подтверждён. Проверьте почту и введите код подтверждения.',
      );
    }

    return this.buildAuthResponse(user.id, user.email);
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  /** Обновление профиля — пока только имя; email намеренно не даём менять здесь,
   *  чтобы не усложнять флоу повторной верификации почты */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  }

  /** Смена пароля из личного кабинета — требует знания текущего пароля */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!currentMatches) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return { message: 'Пароль успешно изменён' };
  }

  /** Проверка кода из письма — активирует аккаунт и сразу логинит пользователя */
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    if (user.isVerified) {
      return this.buildAuthResponse(user.id, user.email);
    }

    const token = await prisma.emailVerificationToken.findUnique({
      where: { code: dto.code },
    });

    if (
      !token ||
      token.userId !== user.id ||
      token.usedAt ||
      token.expiresAt < new Date()
    ) {
      throw new BadRequestException('Код неверен или устарел');
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { isVerified: true } }),
      prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return this.buildAuthResponse(user.id, user.email);
  }

  /** Повторная отправка кода, если письмо не пришло или код истёк */
  async resendVerification(dto: ResendVerificationDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });

    // Не сообщаем, существует ли email — та же логика, что и в restorePassword
    if (!user || user.isVerified) {
      return {
        message: 'Если аккаунт существует и ещё не подтверждён, код отправлен повторно',
      };
    }

    await this.issueVerificationCode(user.id, user.email);

    return {
      message: 'Если аккаунт существует и ещё не подтверждён, код отправлен повторно',
    };
  }

  private async issueVerificationCode(userId: string, email: string) {
    // Гасим предыдущие неиспользованные коды, чтобы не копились активные
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = crypto.randomInt(100000, 1000000).toString(); // 6 цифр

    await prisma.emailVerificationToken.create({
      data: {
        code,
        userId,
        expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      },
    });

    await this.mailService.sendVerificationEmail(email, code);
  }

  /** Шаг 1 восстановления: генерируем токен и отправляем ссылку на email */
  async restorePassword(dto: RestorePasswordDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });

    // Намеренно не сообщаем, существует ли email — чтобы не палить базу пользователей
    if (!user) {
      return {
        message: 'Если такой email зарегистрирован, письмо со ссылкой отправлено',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    return {
      message: 'Если такой email зарегистрирован, письмо со ссылкой отправлено',
    };
  }

  /** Шаг 2 восстановления: проверяем токен и меняем пароль */
  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Ссылка недействительна или устарела');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Пароль успешно изменён' };
  }

  private buildAuthResponse(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    return { accessToken, user: { id: userId, email } };
  }
}
