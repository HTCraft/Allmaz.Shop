import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { slugify } from '@ecommerce/shared';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';

@Injectable()
export class AdminCategoriesService {
  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
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
