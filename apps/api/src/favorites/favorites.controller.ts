import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

type AuthedRequest = Request & { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.favoritesService.list(req.user.userId);
  }

  @Get('ids')
  listIds(@Req() req: AuthedRequest) {
    return this.favoritesService.listProductIds(req.user.userId);
  }

  @Post(':productId')
  add(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    return this.favoritesService.add(req.user.userId, productId);
  }

  @Delete(':productId')
  remove(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    return this.favoritesService.remove(req.user.userId, productId);
  }
}
