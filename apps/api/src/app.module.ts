import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AdminModule } from './admin/admin.module';
import { CarouselModule } from './carousel/carousel.module';
import { OrdersModule } from './orders/orders.module';
import { resolveRootEnvPath } from './env-path';

@Module({
  imports: [
    // apps/api сам по себе НЕ читает .env без этого — все переменные, кроме
    // DATABASE_URL (который грузит сама Prisma по своему независимому
    // механизму), молча брали значения по умолчанию, захардкоженные в коде.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveRootEnvPath(),
    }),
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
