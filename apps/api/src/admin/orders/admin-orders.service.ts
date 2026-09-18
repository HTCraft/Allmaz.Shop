import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { UpdateOrderStatusDto } from '../dto/update-user-role.dto';
import { MailService } from '../../mail/mail.service';

const ADMIN_ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' as const } },
  user: { select: { id: true, email: true, name: true } },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает обработки',
  PAID: 'Оплачен',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

@Injectable()
export class AdminOrdersService {
  constructor(private readonly mailService: MailService) {}

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
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!order) throw new NotFoundException('Заказ не найден');

    const updated = await prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ADMIN_ORDER_INCLUDE,
    });

    void this.mailService.sendOrderStatusChangedEmail(order.user.email, {
      id: order.id,
      statusLabel: STATUS_LABELS[dto.status] ?? dto.status,
    });

    return updated;
  }
}
