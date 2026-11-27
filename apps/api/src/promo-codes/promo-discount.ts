import { BadRequestException } from '@nestjs/common';

/** Минимальная сумма к оплате после скидки — 1 ₽ (ЮKassa не принимает платёж на 0) */
export const MIN_PAYABLE_CENTS = 100;

/** Поля промокода, нужные для расчёта и проверки (подходит и запись Prisma, и тестовый объект) */
export interface PromoLike {
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  minOrderCents: number;
  expiresAt: Date | null;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Сумма скидки в копейках для суммы корзины; не опускает итог ниже MIN_PAYABLE_CENTS */
export function calculateDiscount(
  promo: Pick<PromoLike, 'discountType' | 'value'>,
  subtotalCents: number,
): number {
  const raw =
    promo.discountType === 'PERCENT'
      ? Math.floor((subtotalCents * promo.value) / 100)
      : promo.value;
  const maxDiscount = Math.max(subtotalCents - MIN_PAYABLE_CENTS, 0);
  return Math.max(Math.min(raw, maxDiscount), 0);
}

/** Проверяет применимость промокода; бросает 400 с понятным текстом */
export function assertPromoApplicable<T extends PromoLike>(
  promo: T | null,
  subtotalCents: number,
  now: Date = new Date(),
): T {
  if (!promo || !promo.isActive) {
    throw new BadRequestException('Промокод не найден или неактивен');
  }
  if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
    throw new BadRequestException('Срок действия промокода истёк');
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    throw new BadRequestException('Лимит использований промокода исчерпан');
  }
  if (subtotalCents < promo.minOrderCents) {
    const min = (promo.minOrderCents / 100).toLocaleString('ru-RU');
    throw new BadRequestException(`Минимальная сумма заказа для этого промокода — ${min} ₽`);
  }
  return promo;
}
