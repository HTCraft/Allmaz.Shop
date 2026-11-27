import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { CreateReviewDto } from './dto/create-review.dto';
import { authorName } from './author-name';

const PAGE_SIZE = 10;


@Injectable()
export class ReviewsService {
  private async findProduct(slug: string) {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  private async summary(productId: string) {
    const [agg, groups] = await Promise.all([
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { _all: true },
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const g of groups) distribution[g.rating] = g._count._all;

    return {
      average: agg._avg.rating === null ? null : Math.round(agg._avg.rating * 10) / 10,
      count: agg._count._all,
      distribution,
    };
  }

  async list(slug: string, page: number) {
    const { id: productId } = await this.findProduct(slug);

    const [reviews, summary] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { name: true, email: true } } },
      }),
      this.summary(productId),
    ]);

    return {
      items: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        author: authorName(r.user),
        createdAt: r.createdAt,
      })),
      summary,
      pagination: {
        page,
        limit: PAGE_SIZE,
        total: summary.count,
        totalPages: Math.max(1, Math.ceil(summary.count / PAGE_SIZE)),
      },
    };
  }

  /** Отзыв текущего пользователя на товар или null */
  async getMine(userId: string, slug: string) {
    const { id: productId } = await this.findProduct(slug);
    const review = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true, rating: true, text: true, createdAt: true },
    });
    return { review };
  }

  async create(userId: string, slug: string, dto: CreateReviewDto) {
    const { id: productId } = await this.findProduct(slug);

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictException('Вы уже оставили отзыв на этот товар');

    try {
      const created = await prisma.review.create({
        data: { userId, productId, rating: dto.rating, text: dto.text },
        select: { id: true, rating: true, text: true, createdAt: true },
      });
      return { review: created };
    } catch (err) {
      // Гонка двух одновременных запросов — сработал @@unique([userId, productId])
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Вы уже оставили отзыв на этот товар');
      }
      throw err;
    }
  }

  async removeMine(userId: string, slug: string) {
    const { id: productId } = await this.findProduct(slug);
    const result = await prisma.review.deleteMany({ where: { userId, productId } });
    if (result.count === 0) throw new NotFoundException('Отзыв не найден');
    return { deleted: true };
  }
}
