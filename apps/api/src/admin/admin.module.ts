import { Module } from '@nestjs/common';
import { AdminProductsController } from './products/admin-products.controller';
import { AdminProductsService } from './products/admin-products.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminUsersController,
    AdminStatsController,
  ],
  providers: [
    AdminProductsService,
    AdminCategoriesService,
    AdminUsersService,
    AdminStatsService,
  ],
})
export class AdminModule {}
