import { Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';

@Injectable()
export class AdminStatsService {
  async getStats() {
    const [productsCount, categoriesCount, usersCount, outOfStockCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.user.count(),
        prisma.product.count({ where: { stock: 0 } }),
      ]);

    return { productsCount, categoriesCount, usersCount, outOfStockCount };
  }
}
