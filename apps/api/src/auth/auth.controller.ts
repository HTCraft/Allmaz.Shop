import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RestorePasswordDto } from './dto/restore-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Создаёт аккаунт в заблокированном состоянии и отправляет код на почту */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

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
    res.clearCookie(COOKIE_NAME);
    return { message: 'Вы вышли из аккаунта' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { userId: string } }) {
    return this.authService.me(req.user.userId);
  }

  /** Подтверждение кода из письма — активирует аккаунт и сразу логинит */
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
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  /** Шаг 1: пользователь вводит email на странице /restore */
  @Post('restore')
  @HttpCode(200)
  restore(@Body() dto: RestorePasswordDto) {
    return this.authService.restorePassword(dto);
  }

  /** Шаг 2: пользователь переходит по ссылке из письма и задаёт новый пароль */
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
    });
  }
}
