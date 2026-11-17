import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminPaginationQueryDto } from '../dto/pagination.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly service: AdminReviewsService) {}

  @Get()
  list(@Query() query: AdminPaginationQueryDto) {
    return this.service.list(query);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
