import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromoCodesService } from './promo-codes.service';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';

type AuthedRequest = Request & { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly service: PromoCodesService) {}

  // Строже глобального лимита — защита от перебора промокодов
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('validate')
  validate(@Req() req: AuthedRequest, @Body() dto: ValidatePromoCodeDto) {
    return this.service.validateForUser(req.user.userId, dto.code);
  }
}
