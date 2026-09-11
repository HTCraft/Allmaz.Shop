import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { CreateOrderDto } from './dto/create-order.dto';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' as const } },
};

@Injectable()
export class OrdersService {
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

    const totalCents = cart.items.reduce(
      (sum, item) => sum + item.product.priceCents * item.quantity,
      0,
    );

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          shippingAddress: dto.shippingAddress,
          phone: dto.phone,
          comment: dto.comment,
          totalCents,
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

    return order;
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
