import { Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';

const DEFAULT_SETTINGS = {
  id: 'singleton',
  autoplay: true,
  intervalMs: 5000,
  showIndicators: true,
  showControls: true,
};

@Injectable()
export class CarouselService {
  async getPublicCarousel() {
    const [settings, slides] = await Promise.all([
      prisma.carouselSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.carouselSlide.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        include: {
          product: {
            include: { images: { orderBy: { position: 'asc' }, take: 1 } },
          },
        },
      }),
    ]);

    return {
      settings: settings ?? DEFAULT_SETTINGS,
      slides: slides.map((s) => ({
        id: s.id,
        position: s.position,
        product: {
          id: s.product.id,
          title: s.product.title,
          slug: s.product.slug,
          priceCents: s.product.priceCents,
          image: s.product.images[0]?.url ?? null,
        },
      })),
    };
  }
}
