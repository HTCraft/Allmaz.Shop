import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from '../dto/promo-code.dto';
import { AdminPaginationQueryDto, buildPagination } from '../dto/pagination.dto';
import { normalizePromoCode } from '../../promo-codes/promo-codes.service';

function assertValue(type: 'PERCENT' | 'FIXED', value: number) {
  if (type === 'PERCENT' && (value < 1 || value > 100)) {
    throw new BadRequestException('Процентная скидка должна быть от 1 до 100');
  }
}

@Injectable()
export class AdminPromoCodesService {
  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.search
      ? { code: { contains: query.search.trim(), mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promoCode.count({ where }),
    ]);
    return { items, pagination: buildPagination(page, limit, total) };
  }

  async create(dto: CreatePromoCodeDto) {
    assertValue(dto.discountType, dto.value);
    const code = normalizePromoCode(dto.code);
    if (await prisma.promoCode.findUnique({ where: { code } })) {
      throw new ConflictException(`Промокод «${code}» уже существует`);
    }
    return prisma.promoCode.create({
      data: {
        code,
        discountType: dto.discountType,
        value: dto.value,
        isActive: dto.isActive ?? true,
        maxUses: dto.maxUses ?? null,
        minOrderCents: dto.minOrderCents ?? 0,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    const current = await prisma.promoCode.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Промокод не найден');

    assertValue(dto.discountType ?? current.discountType, dto.value ?? current.value);

    let code: string | undefined;
    if (dto.code !== undefined) {
      code = normalizePromoCode(dto.code);
      const dup = await prisma.promoCode.findUnique({ where: { code } });
      if (dup && dup.id !== id) throw new ConflictException(`Промокод «${code}» уже существует`);
    }

    return prisma.promoCode.update({
      where: { id },
      data: {
        code,
        discountType: dto.discountType,
        value: dto.value,
        isActive: dto.isActive,
        maxUses: dto.maxUses,
        minOrderCents: dto.minOrderCents,
        expiresAt:
          dto.expiresAt === undefined ? undefined : dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async remove(id: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Промокод не найден');
    // Заказы сохраняются: promoCodeId обнуляется (onDelete: SetNull), discountCents остаётся
    await prisma.promoCode.delete({ where: { id } });
    return { deleted: true };
  }
}
