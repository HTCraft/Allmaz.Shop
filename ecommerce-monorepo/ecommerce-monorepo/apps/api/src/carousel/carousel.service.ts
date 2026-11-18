import { Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { resolveMediaUrl } from '../media/resolve-media-url';

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
            include: {
              // В карусели-баннере показываем только изображение, не видео
              media: {
                where: { type: 'IMAGE' },
                orderBy: { position: 'asc' },
                take: 1,
                select: { id: true, url: true },
              },
            },
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
          image: s.product.media[0] ? resolveMediaUrl(s.product.media[0]) : null,
        },
      })),
    };
  }
}
