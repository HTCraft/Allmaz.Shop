import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { slugify } from '@ecommerce/shared';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class AdminCategoriesService {
  async list() {
    return prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.slug ?? dto.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Категория со слагом "${slug}" уже существует`);
    }
    return prisma.category.create({ data: { name: dto.name, slug } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена');

    const slug = dto.slug ? slugify(dto.slug) : dto.name ? slugify(dto.name) : undefined;
    if (slug) {
      const existing = await prisma.category.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Категория со слагом "${slug}" уже существует`);
      }
    }

    return prisma.category.update({
      where: { id },
      data: { name: dto.name, slug },
    });
  }

  async remove(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена');
    // Товары не удаляются — просто отвязываются от категории
    await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
