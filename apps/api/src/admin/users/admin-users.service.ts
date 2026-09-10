import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';

@Injectable()
export class AdminUsersService {
  async list() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
