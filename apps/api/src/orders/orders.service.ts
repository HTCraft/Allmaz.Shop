import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { CreateOrderDto } from './dto/create-order.dto';
import { MailService } from '../mail/mail.service';
import { PaymentsService } from '../payments/payments.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' as const } },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly paymentsService: PaymentsService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Корзина пуста');
    }

    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        throw new BadRequestException(
          `Товара «${item.product.title}» осталось только ${item.product.stock} шт.`,
        );
      }
    }

    const subtotalCents = cart.items.reduce(
      (sum, item) => sum + item.product.priceCents * item.quantity,
      0,
    );

    // Предварительная проверка вне транзакции — быстрый и понятный отказ (400)
    let promoCodeId: string | null = null;
    let discountCents = 0;
    if (dto.promoCode?.trim()) {
      const checked = await this.promoCodesService.check(dto.promoCode, subtotalCents);
      promoCodeId = checked.promo.id;
      discountCents = checked.discountCents;
    }

    const order = await prisma.$transaction(async (tx) => {
      // Окончательная защита от гонки: счётчик растёт только если лимит ещё не исчерпан
      if (promoCodeId) {
        const promo = await tx.promoCode.findUnique({ where: { id: promoCodeId } });
        const applicable = this.promoCodesService.assertApplicable(promo, subtotalCents);
        const bumped = await tx.promoCode.updateMany({
          where: {
            id: applicable.id,
            isActive: true,
            ...(applicable.maxUses !== null ? { usedCount: { lt: applicable.maxUses } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (bumped.count === 0) {
          throw new BadRequestException('Лимит использований промокода исчерпан');
        }
        // Пересчёт по актуальным данным промокода (мог быть изменён админом)
        discountCents = this.promoCodesService.calculateDiscount(applicable, subtotalCents);
      }

      const created = await tx.order.create({
        data: {
          userId,
          shippingAddress: dto.shippingAddress,
          phone: dto.phone,
          comment: dto.comment,
          totalCents: subtotalCents - discountCents,
          discountCents,
          promoCodeId,
          paymentMethod: dto.paymentMethod ?? 'COD',
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productTitle: item.product.title,
              productSku: item.product.sku,
              quantity: item.quantity,
              priceCents: item.product.priceCents,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    // Письмо не должно блокировать ответ пользователю — заказ уже создан и
    // это главное; ошибку отправки сам MailService проглотит и залогирует
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      void this.mailService.sendOrderConfirmationEmail(user.email, order);
    }

    // Для оплаты картой сразу создаём платёж в ЮKassa и возвращаем ссылку —
    // если это по какой-то причине не получится, заказ всё равно уже создан
    // (просто останется в статусе PENDING/COD, оплатить можно будет повторно)
    let paymentUrl: string | null = null;
    if (dto.paymentMethod === 'CARD') {
      try {
        const payment = await this.paymentsService.initiatePayment(userId, order.id);
        paymentUrl = payment.paymentUrl;
      } catch (error) {
        // Ошибку уже залогировал сам YookassaService — просто дублируем факт,
        // чтобы было видно прямо в контексте оформления заказа
        this.logger.warn(
          `Не удалось создать платёж ЮKassa для заказа ${order.id}, заказ остаётся PENDING: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return { ...order, paymentUrl };
  }

  async listMyOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyOrder(userId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }
}
