import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { assertPromoApplicable, calculateDiscount, normalizePromoCode } from './promo-discount';

export { normalizePromoCode };

export type PromoCodeRecord = NonNullable<Awaited<ReturnType<typeof prisma.promoCode.findUnique>>>;

@Injectable()
export class PromoCodesService {
  /** Сумма скидки для промокода и суммы корзины (в копейках) */
  calculateDiscount(
    promo: Pick<PromoCodeRecord, 'discountType' | 'value'>,
    subtotalCents: number,
  ): number {
    return calculateDiscount(promo, subtotalCents);
  }

  /** Проверяет применимость промокода; бросает 400 с понятным текстом */
  assertApplicable(promo: PromoCodeRecord | null, subtotalCents: number): PromoCodeRecord {
    return assertPromoApplicable(promo, subtotalCents);
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
