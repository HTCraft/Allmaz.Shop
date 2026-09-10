import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@ecommerce/database';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class CatalogService {
  async listCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async listProducts(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: Prisma.ProductWhereInput = {};

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { priceCents: 'asc' }
        : query.sort === 'price_desc'
          ? { priceCents: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: true,
          images: { orderBy: { position: 'asc' } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return product;
  }
}
