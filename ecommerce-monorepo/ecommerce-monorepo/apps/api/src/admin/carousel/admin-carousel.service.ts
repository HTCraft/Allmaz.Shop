import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import {
  CreateCarouselSlideDto,
  UpdateCarouselSettingsDto,
  UpdateCarouselSlideDto,
} from '../dto/carousel.dto';
import { resolveMediaUrl } from '../../media/resolve-media-url';

function withResolvedSlide<
  T extends { product: { media: Array<{ id: string; url: string }> } },
>(slide: T) {
  return {
    ...slide,
    product: {
      ...slide.product,
      media: slide.product.media.map((m) => ({ ...m, url: resolveMediaUrl(m) })),
    },
  };
}

@Injectable()
export class AdminCarouselService {
  async getSettings() {
    return prisma.carouselSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
  }

  async updateSettings(dto: UpdateCarouselSettingsDto) {
    return prisma.carouselSettings.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', ...dto },
    });
  }

  async listSlides() {
    const slides = await prisma.carouselSlide.findMany({
      orderBy: { position: 'asc' },
      include: {
        product: {
          include: { media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 1, select: { id: true, url: true } } },
        },
      },
    });
    return slides.map(withResolvedSlide);
  }

  async createSlide(dto: CreateCarouselSlideDto) {
    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    const existing = await prisma.carouselSlide.findUnique({
      where: { productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('Этот товар уже добавлен в карусель');
    }

    const maxPosition = await prisma.carouselSlide.aggregate({
      _max: { position: true },
    });

    const slide = await prisma.carouselSlide.create({
      data: {
        productId: dto.productId,
        position: dto.position ?? (maxPosition._max.position ?? -1) + 1,
        active: dto.active ?? true,
      },
      include: { product: { include: { media: { where: { type: "IMAGE" }, take: 1, select: { id: true, url: true } } } } },
    });
    return withResolvedSlide(slide);
  }

  async updateSlide(id: string, dto: UpdateCarouselSlideDto) {
    const slide = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Слайд не найден');

    const updated = await prisma.carouselSlide.update({
      where: { id },
      data: dto,
      include: { product: { include: { media: { where: { type: "IMAGE" }, take: 1, select: { id: true, url: true } } } } },
    });
    return withResolvedSlide(updated);
  }

  async removeSlide(id: string) {
    const slide = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Слайд не найден');
    await prisma.carouselSlide.delete({ where: { id } });
    return { deleted: true };
  }
}
