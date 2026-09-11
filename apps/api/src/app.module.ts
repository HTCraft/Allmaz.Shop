import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AdminModule } from './admin/admin.module';
import { CarouselModule } from './carousel/carousel.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    CartModule,
    FavoritesModule,
    AdminModule,
    CarouselModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
