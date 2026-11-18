import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';

export type PromoCodeRecord = NonNullable<Awaited<ReturnType<typeof prisma.promoCode.findUnique>>>;

/** Минимальная сумма к оплате после скидки — 1 ₽ (ЮKassa не принимает платёж на 0) */
const MIN_PAYABLE_CENTS = 100;

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class PromoCodesService {
  /** Сумма скидки для промокода и суммы корзины (в копейках) */
  calculateDiscount(
    promo: Pick<PromoCodeRecord, 'discountType' | 'value'>,
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
  assertApplicable(promo: PromoCodeRecord | null, subtotalCents: number): PromoCodeRecord {
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Промокод не найден или неактивен');
    }
    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
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

  /** Проверка по коду и сумме. Сумма передаётся вызывающим (всегда из реальной корзины) */
  async check(code: string, subtotalCents: number) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: normalizePromoCode(code) },
    });
    const valid = this.assertApplicable(promo, subtotalCents);
    const discountCents = this.calculateDiscount(valid, subtotalCents);
    if (discountCents <= 0) {
      throw new BadRequestException('Промокод не даёт скидки для этой суммы заказа');
    }
    return { promo: valid, discountCents };
  }

  /** Эндпоинт validate: сумма берётся из корзины пользователя на сервере */
  async validateForUser(userId: string, code: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Корзина пуста');
    }
    const subtotalCents = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );
    const { promo, discountCents } = await this.check(code, subtotalCents);
    return {
      code: promo.code,
      discountType: promo.discountType,
      value: promo.value,
      subtotalCents,
      discountCents,
      totalCents: subtotalCents - discountCents,
    };
  }
}
