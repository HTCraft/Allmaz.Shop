import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminCarouselService } from './admin-carousel.service';
import {
  CreateCarouselSlideDto,
  UpdateCarouselSettingsDto,
  UpdateCarouselSlideDto,
} from '../dto/carousel.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/carousel')
export class AdminCarouselController {
  constructor(private readonly service: AdminCarouselService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() dto: UpdateCarouselSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Get('slides')
  listSlides() {
    return this.service.listSlides();
  }

  @Post('slides')
  createSlide(@Body() dto: CreateCarouselSlideDto) {
    return this.service.createSlide(dto);
  }

  @Put('slides/:id')
  updateSlide(@Param('id') id: string, @Body() dto: UpdateCarouselSlideDto) {
    return this.service.updateSlide(id, dto);
  }

  @Delete('slides/:id')
  removeSlide(@Param('id') id: string) {
    return this.service.removeSlide(id);
  }
}
