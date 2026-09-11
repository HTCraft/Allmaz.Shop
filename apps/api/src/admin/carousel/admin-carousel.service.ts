import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import {
  CreateCarouselSlideDto,
  UpdateCarouselSettingsDto,
  UpdateCarouselSlideDto,
} from '../dto/carousel.dto';

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
    return prisma.carouselSlide.findMany({
      orderBy: { position: 'asc' },
      include: {
        product: {
          include: { images: { orderBy: { position: 'asc' }, take: 1 } },
        },
      },
    });
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

    return prisma.carouselSlide.create({
      data: {
        productId: dto.productId,
        position: dto.position ?? (maxPosition._max.position ?? -1) + 1,
        active: dto.active ?? true,
      },
      include: { product: { include: { images: true } } },
    });
  }

  async updateSlide(id: string, dto: UpdateCarouselSlideDto) {
    const slide = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Слайд не найден');

    return prisma.carouselSlide.update({
      where: { id },
      data: dto,
      include: { product: { include: { images: true } } },
    });
  }

  async removeSlide(id: string) {
    const slide = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Слайд не найден');
    await prisma.carouselSlide.delete({ where: { id } });
    return { deleted: true };
  }
}
