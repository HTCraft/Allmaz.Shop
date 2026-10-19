import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@ecommerce/database';
import { ProductQueryDto } from './dto/product-query.dto';
import { resolveMediaUrl } from '../media/resolve-media-url';

const MEDIA_SELECT = {
  id: true,
  type: true,
  url: true,
  alt: true,
  position: true,
} as const;

function withResolvedMedia<T extends { media: Array<{ id: string; url: string }> }>(
  product: T,
) {
  return { ...product, media: product.media.map((m) => ({ ...m, url: resolveMediaUrl(m) })) };
}

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
          media: { orderBy: { position: 'asc' }, select: MEDIA_SELECT },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: items.map(withResolvedMedia),
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
        media: { orderBy: { position: 'asc' }, select: MEDIA_SELECT },
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return withResolvedMedia(product);
  }

  /** Лёгкий запрос под автоподсказки в поиске — только то, что нужно для выпадающего списка */
  async suggestProducts(query: string, limit = 6) {
    if (!query.trim()) return [];

    const products = await prisma.product.findMany({
      where: { title: { contains: query, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        priceCents: true,
        media: {
          where: { type: 'IMAGE' },
          orderBy: { position: 'asc' },
          take: 1,
          select: { id: true, url: true },
        },
      },
    });

    return products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      priceCents: p.priceCents,
      image: p.media[0] ? resolveMediaUrl(p.media[0]) : null,
    }));
  }
}
