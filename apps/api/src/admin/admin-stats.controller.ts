import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }
}
