import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MailModule } from '../mail/mail.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [MailModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
