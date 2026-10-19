import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AdminModule } from './admin/admin.module';
import { CarouselModule } from './carousel/carousel.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
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
    // Базовый rate-limit по умолчанию для ВСЕХ роутов (мягкий, просто защита
    // от совсем уж дикого спама) — точечные, более жёсткие лимиты на
    // чувствительные auth-эндпоинты задаются через @Throttle прямо в
    // AuthController (логин, регистрация, восстановление пароля и т.п.)
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 минута
        limit: 100, // 100 запросов в минуту с одного IP на любой роут по умолчанию
      },
    ]),
    AuthModule,
    CatalogModule,
    CartModule,
    FavoritesModule,
    AdminModule,
    CarouselModule,
    OrdersModule,
    PaymentsModule,
    PromoCodesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
