import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { UpdateOrderStatusDto } from '../dto/update-user-role.dto';

const ADMIN_ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' as const } },
  user: { select: { id: true, email: true, name: true } },
};

@Injectable()
export class AdminOrdersService {
  async list() {
    return prisma.order.findMany({
      include: ADMIN_ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');

    return prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ADMIN_ORDER_INCLUDE,
    });
  }
}
