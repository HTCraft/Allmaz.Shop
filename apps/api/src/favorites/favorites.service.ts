import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';

@Injectable()
export class FavoritesService {
  async list(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            images: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => f.product);
  }

  /** Возвращает id всех избранных товаров пользователя — удобно для отметок в каталоге */
  async listProductIds(userId: string): Promise<string[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });
    return favorites.map((f) => f.productId);
  }

  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    await prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });

    return { favorited: true };
  }

  async remove(userId: string, productId: string) {
    await prisma.favorite.deleteMany({ where: { userId, productId } });
    return { favorited: false };
  }
}
