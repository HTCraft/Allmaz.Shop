import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { slugify } from '@ecommerce/shared';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class AdminProductsService {
  async list() {
    return prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: { orderBy: { position: 'asc' } } },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);

    await this.assertSlugAndSkuFree(slug, dto.sku);

    return prisma.product.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        priceCents: dto.priceCents,
        sku: dto.sku,
        stock: dto.stock,
        categoryId: dto.categoryId || null,
        images: dto.images?.length
          ? { create: dto.images.map((url, index) => ({ url, position: index })) }
          : undefined,
      },
      include: { category: true, images: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.get(id); // 404, если не существует

    const slug = dto.slug ? slugify(dto.slug) : dto.title ? slugify(dto.title) : undefined;
    if (slug || dto.sku) {
      await this.assertSlugAndSkuFree(slug, dto.sku, id);
    }

    return prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
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
          images: dto.images?.length
            ? { create: dto.images.map((url, index) => ({ url, position: index })) }
            : undefined,
        },
        include: { category: true, images: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.get(id);
    await prisma.product.delete({ where: { id } });
    return { deleted: true };
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
