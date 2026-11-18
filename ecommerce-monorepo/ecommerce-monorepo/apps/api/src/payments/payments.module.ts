import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { YookassaService } from './yookassa.service';
import { MailModule } from '../mail/mail.module';
import { OrderLifecycleModule } from '../order-lifecycle/order-lifecycle.module';
import { UnpaidOrdersJob } from './unpaid-orders.job';

@Module({
  imports: [MailModule, OrderLifecycleModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, YookassaService, UnpaidOrdersJob],
  exports: [PaymentsService],
})
export class PaymentsModule {}
