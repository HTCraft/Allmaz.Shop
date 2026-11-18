import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@ecommerce/database';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';

@Injectable()
export class AdminReviewsService {
  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.ReviewWhereInput = search
      ? {
          OR: [
            { text: { contains: search, mode: 'insensitive' } },
            { product: { title: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          product: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
  }

  async remove(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Отзыв не найден');
    await prisma.review.delete({ where: { id } });
    return { deleted: true };
  }
}
