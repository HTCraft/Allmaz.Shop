import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';
import { SalesQueryDto } from './stats/sales-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }

  /** Аналитика продаж: GET /admin/stats/sales?from=2026-11-01&to=2026-11-30 */
  @Get('sales')
  sales(@Query() query: SalesQueryDto) {
    return this.service.getSalesReport(query);
  }
}
