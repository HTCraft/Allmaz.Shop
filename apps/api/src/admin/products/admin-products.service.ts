import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { prisma } from '@ecommerce/database';
import { slugify } from '@ecommerce/shared';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { resolveMediaUrl } from '../../media/resolve-media-url';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const MEDIA_SELECT = {
  id: true,
  type: true,
  url: true,
  filename: true,
  alt: true,
  position: true,
  productId: true,
  createdAt: true,
} as const;

function withResolvedUrl<T extends { id: string; url: string }>(media: T) {
  return { ...media, url: resolveMediaUrl(media) };
}

@Injectable()
export class AdminProductsService {
  async list() {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        media: { orderBy: { position: 'asc' }, select: MEDIA_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => ({ ...p, media: p.media.map(withResolvedUrl) }));
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        media: { orderBy: { position: 'asc' }, select: MEDIA_SELECT },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return { ...product, media: product.media.map(withResolvedUrl) };
  }

  async create(dto: CreateProductDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);

    await this.assertSlugAndSkuFree(slug, dto.sku);

    const product = await prisma.product.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        priceCents: dto.priceCents,
        sku: dto.sku,
        stock: dto.stock,
        categoryId: dto.categoryId || null,
        media: dto.images?.length
          ? {
              create: dto.images.map((url, index) => ({
                url,
                type: 'IMAGE' as const,
                position: index,
              })),
            }
          : undefined,
      },
      include: { category: true, media: { select: MEDIA_SELECT } },
    });

    return { ...product, media: product.media.map(withResolvedUrl) };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.get(id); // 404, если не существует

    const slug = dto.slug ? slugify(dto.slug) : dto.title ? slugify(dto.title) : undefined;
    if (slug || dto.sku) {
      await this.assertSlugAndSkuFree(slug, dto.sku, id);
    }

    const product = await prisma.$transaction(async (tx) => {
      if (dto.images) {
        // Затираем и пересоздаём только записи, добавленные через текстовое поле ссылок
        // (filename IS NULL) — загруженные файлы (filename заполнен) этим не трогаем
        await tx.productMedia.deleteMany({ where: { productId: id, filename: null } });
      }

      return tx.product.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          priceCents: dto.priceCents,
          sku: dto.sku,
          stock: dto.stock,
          categoryId: dto.categoryId === undefined ? undefined : dto.categoryId || null,
          media: dto.images?.length
            ? {
                create: dto.images.map((url, index) => ({
                  url,
                  type: 'IMAGE' as const,
                  position: index,
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          media: { orderBy: { position: 'asc' }, select: MEDIA_SELECT },
        },
      });
    });

    return { ...product, media: product.media.map(withResolvedUrl) };
  }

  async remove(id: string) {
    const product = await this.get(id);
    await prisma.product.delete({ where: { id } });
    // Подчищаем физические файлы удалённого товара с диска
    await Promise.all(
      product.media
        .filter((m) => m.filename)
        .map((m) => this.deleteUploadedFile(m.url)),
    );
    return { deleted: true };
  }

  /** Загрузка файла (изображение или видео) — сам файл уже сохранён Multer'ом на диск,
   *  здесь только создаём запись в БД со ссылкой на него */
  async uploadMedia(productId: string, file: Express.Multer.File) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    const maxPosition = await prisma.productMedia.aggregate({
      where: { productId },
      _max: { position: true },
    });

    const type = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    const media = await prisma.productMedia.create({
      data: {
        productId,
        type,
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        position: (maxPosition._max.position ?? -1) + 1,
      },
      select: MEDIA_SELECT,
    });

    return withResolvedUrl(media);
  }

  async removeMedia(productId: string, mediaId: string) {
    const media = await prisma.productMedia.findFirst({ where: { id: mediaId, productId } });
    if (!media) throw new NotFoundException('Файл не найден');
    await prisma.productMedia.delete({ where: { id: mediaId } });
    if (media.filename) {
      await this.deleteUploadedFile(media.url);
    }
    return { deleted: true };
  }

  /** Удаляет физический файл из uploads/ по относительному url ("/uploads/xxx.jpg") */
  private async deleteUploadedFile(relativeUrl: string) {
    if (!relativeUrl.startsWith('/uploads/')) return;
    const filePath = join(UPLOADS_DIR, relativeUrl.replace('/uploads/', ''));
    try {
      await unlink(filePath);
    } catch {
      // Файла уже нет на диске — не критично, просто игнорируем
    }
  }

  private async assertSlugAndSkuFree(slug?: string, sku?: string, excludeId?: string) {
    if (slug) {
      const bySlug = await prisma.product.findUnique({ where: { slug } });
      if (bySlug && bySlug.id !== excludeId) {
        throw new ConflictException(`Товар со слагом "${slug}" уже существует`);
      }
    }
    if (sku) {
      const bySku = await prisma.product.findUnique({ where: { sku } });
      if (bySku && bySku.id !== excludeId) {
        throw new ConflictException(`Товар с артикулом "${sku}" уже существует`);
      }
    }
  }
}
