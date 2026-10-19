import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminPromoCodesService } from './admin-promo-codes.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from '../dto/promo-code.dto';
import { AdminPaginationQueryDto } from '../dto/pagination.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/promo-codes')
export class AdminPromoCodesController {
  constructor(private readonly service: AdminPromoCodesService) {}

  @Get()
  list(@Query() query: AdminPaginationQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreatePromoCodeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
