import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewsQueryDto } from './dto/create-review.dto';

type AuthedRequest = Request & { user: { userId: string } };

@Controller('products/:slug/reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  /** Публично: список отзывов + сводка (средняя, количество, распределение по звёздам) */
  @Get()
  list(@Param('slug') slug: string, @Query() query: ReviewsQueryDto) {
    return this.service.list(slug, query.page);
  }

  // 'mine' объявлен до любых параметризованных маршрутов
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Req() req: AuthedRequest, @Param('slug') slug: string) {
    return this.service.getMine(req.user.userId, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@Req() req: AuthedRequest, @Param('slug') slug: string, @Body() dto: CreateReviewDto) {
    return this.service.create(req.user.userId, slug, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mine')
  removeMine(@Req() req: AuthedRequest, @Param('slug') slug: string) {
    return this.service.removeMine(req.user.userId, slug);
  }
}
