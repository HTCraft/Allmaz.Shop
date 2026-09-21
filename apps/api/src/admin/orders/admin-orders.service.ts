import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { UpdateOrderStatusDto } from '../dto/update-user-role.dto';
import { MailService } from '../../mail/mail.service';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';

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

  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search
      ? {
          OR: [
            { id: { contains: query.search, mode: 'insensitive' as const } },
            { user: { email: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ADMIN_ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
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
