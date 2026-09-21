import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';

@Injectable()
export class AdminUsersService {
  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
  }

  async updateRole(id: string, role: 'USER' | 'ADMIN', currentUserId: string) {
    if (id === currentUserId && role === 'USER') {
      throw new BadRequestException('Нельзя снять права администратора с самого себя');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Нельзя удалить самого себя');
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    await prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
