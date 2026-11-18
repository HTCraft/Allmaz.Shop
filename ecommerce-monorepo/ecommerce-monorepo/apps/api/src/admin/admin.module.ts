import { Module } from '@nestjs/common';
import { AdminProductsController } from './products/admin-products.controller';
import { AdminProductsService } from './products/admin-products.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminCarouselController } from './carousel/admin-carousel.controller';
import { AdminCarouselService } from './carousel/admin-carousel.service';
import { AdminOrdersController } from './orders/admin-orders.controller';
import { AdminOrdersService } from './orders/admin-orders.service';
import { AdminPromoCodesController } from './promo-codes/admin-promo-codes.controller';
import { AdminPromoCodesService } from './promo-codes/admin-promo-codes.service';
import { AdminReviewsController } from './reviews/admin-reviews.controller';
import { AdminReviewsService } from './reviews/admin-reviews.service';
import { MailModule } from '../mail/mail.module';
import { OrderLifecycleModule } from '../order-lifecycle/order-lifecycle.module';

@Module({
  imports: [MailModule, OrderLifecycleModule],
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminUsersController,
    AdminStatsController,
    AdminCarouselController,
    AdminOrdersController,
    AdminPromoCodesController,
    AdminReviewsController,
  ],
  providers: [
    AdminProductsService,
    AdminCategoriesService,
    AdminUsersService,
    AdminStatsService,
    AdminCarouselService,
    AdminOrdersService,
    AdminPromoCodesService,
    AdminReviewsService,
  ],
})
export class AdminModule {}
