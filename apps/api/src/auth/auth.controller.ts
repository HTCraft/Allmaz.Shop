import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RestorePasswordDto } from './dto/restore-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Создаёт аккаунт в заблокированном состоянии и отправляет код на почту */
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // не более 3 регистраций в минуту с одного IP
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // защита от перебора пароля
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.login(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, this.cookieOptions());
    return { message: 'Вы вышли из аккаунта' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { userId: string } }) {
    return this.authService.me(req.user.userId);
  }

  /** Обновление профиля (личный кабинет) */
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  /** Смена пароля из личного кабинета (требует текущий пароль) */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  /** Подтверждение кода из письма — активирует аккаунт и сразу логинит */
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // защита от перебора 6-значного кода
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.verifyEmail(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  /** Повторная отправка кода подтверждения */
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // защита от спама письмами
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  /** Шаг 1: пользователь вводит email на странице /restore */
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // защита от спама письмами восстановления
  @Post('restore')
  @HttpCode(200)
  restore(@Body() dto: RestorePasswordDto) {
    return this.authService.restorePassword(dto);
  }

  /** Шаг 2: пользователь переходит по ссылке из письма и задаёт новый пароль */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * COOKIE_DOMAIN (например, .allmaz.shop) нужен, когда сайт и API живут на разных
   * поддоменах: тогда cookie, выданная API, доходит и до Next.js (серверный рендеринг
   * проверяет авторизацию по ней). Локально не задаётся.
   * Параметры при удалении cookie должны совпадать с параметрами при установке.
   */
  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env['NODE_ENV'] === 'production',
      domain: process.env['COOKIE_DOMAIN'] || undefined,
      path: '/',
    };
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, { ...this.cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
  }
}
