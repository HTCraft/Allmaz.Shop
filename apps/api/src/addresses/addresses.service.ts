import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

export const MAX_ADDRESSES_PER_USER = 10;

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Инвариант: у пользователя с адресами всегда ровно один основной. Все изменения, которые его
 * затрагивают, выполняются в одной транзакции.
 */
@Injectable()
export class AddressesService {
  /** Основной адрес — первым, дальше новые выше */
  list(userId: string) {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    return prisma.$transaction(async (tx) => {
      const count = await tx.userAddress.count({ where: { userId } });
      if (count >= MAX_ADDRESSES_PER_USER) {
        throw new BadRequestException(`Можно сохранить не более ${MAX_ADDRESSES_PER_USER} адресов`);
      }

      // Первый адрес автоматически становится основным
      const makeDefault = count === 0 || dto.isDefault === true;
      if (makeDefault) {
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      return tx.userAddress.create({
        data: {
          userId,
          label: clean(dto.label),
          address: dto.address.trim(),
          phone: dto.phone.trim(),
          isDefault: makeDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.userAddress.findFirst({ where: { id, userId } });
      if (!existing) throw new NotFoundException('Адрес не найден');

      if (dto.isDefault === true) {
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      return tx.userAddress.update({
        where: { id },
        data: {
          label: dto.label === undefined ? undefined : clean(dto.label),
          address: dto.address?.trim(),
          phone: dto.phone?.trim(),
          // isDefault: false игнорируется — основной адрес остаётся основным
          isDefault: dto.isDefault === true ? true : undefined,
        },
      });
    });
  }

  async setDefault(userId: string, id: string) {
    return this.update(userId, id, { isDefault: true });
  }

  async remove(userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.userAddress.findFirst({ where: { id, userId } });
      if (!existing) throw new NotFoundException('Адрес не найден');

      await tx.userAddress.delete({ where: { id } });

      // Удалили основной — основным становится самый свежий из оставшихся
      if (existing.isDefault) {
        const next = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
      return { deleted: true };
    });
  }
}
