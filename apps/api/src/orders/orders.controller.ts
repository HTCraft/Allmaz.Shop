import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentsService } from '../payments/payments.service';

type AuthedRequest = Request & { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.ordersService.listMyOrders(req.user.userId);
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ordersService.getMyOrder(req.user.userId, id);
  }

  /** (Пере)создаёт платёж ЮKassa для заказа — например, если покупатель закрыл
   *  страницу оплаты и хочет попробовать снова */
  @Post(':id/pay')
  async pay(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.ordersService.getMyOrder(req.user.userId, id); // проверка владения заказом, 404 если не найден
    return this.paymentsService.initiatePayment(req.user.userId, id);
  }

  /** Активная проверка статуса — вызывается со страницы заказа при возврате
   *  покупателя с оплаты ЮKassa (вебхук на localhost без туннеля не дойдёт) */
  @Post(':id/payment-status')
  async checkPaymentStatus(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.ordersService.getMyOrder(req.user.userId, id);
    return this.paymentsService.syncOrderPaymentStatus(id);
  }
}
