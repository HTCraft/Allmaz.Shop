import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  MIN_PAYABLE_CENTS,
  PromoLike,
  assertPromoApplicable,
  calculateDiscount,
  normalizePromoCode,
} from './promo-discount';

const promo = (overrides: Partial<PromoLike> = {}): PromoLike => ({
  discountType: 'PERCENT',
  value: 10,
  isActive: true,
  maxUses: null,
  usedCount: 0,
  minOrderCents: 0,
  expiresAt: null,
  ...overrides,
});

function rejects(fn: () => unknown, messagePart: RegExp) {
  assert.throws(fn, (e: unknown) => e instanceof BadRequestException && messagePart.test(e.message));
}

describe('calculateDiscount', () => {
  it('процентная скидка считается от суммы корзины', () => {
    assert.equal(calculateDiscount(promo({ value: 10 }), 250_000), 25_000);
  });

  it('процент округляется вниз до копейки', () => {
    // 99 999 * 15% = 14 999,85 → 14 999
    assert.equal(calculateDiscount(promo({ value: 15 }), 99_999), 14_999);
  });

  it('фиксированная скидка вычитается целиком', () => {
    assert.equal(calculateDiscount(promo({ discountType: 'FIXED', value: 50_000 }), 250_000), 50_000);
  });

  it('скидка не уводит оплату ниже минимальной суммы (1 ₽)', () => {
    assert.equal(
      calculateDiscount(promo({ discountType: 'FIXED', value: 300_000 }), 250_000),
      250_000 - MIN_PAYABLE_CENTS,
    );
    assert.equal(calculateDiscount(promo({ value: 100 }), 250_000), 250_000 - MIN_PAYABLE_CENTS);
  });

  it('для корзины не дороже минимальной суммы скидки нет', () => {
    assert.equal(calculateDiscount(promo({ value: 50 }), MIN_PAYABLE_CENTS), 0);
    assert.equal(calculateDiscount(promo({ value: 50 }), 50), 0);
    assert.equal(calculateDiscount(promo({ value: 50 }), 0), 0);
  });
});

describe('assertPromoApplicable', () => {
  it('подходящий промокод возвращается без изменений', () => {
    const p = promo();
    assert.equal(assertPromoApplicable(p, 100_000), p);
  });

  it('несуществующий и отключённый промокод отклоняются', () => {
    rejects(() => assertPromoApplicable(null, 100_000), /не найден или неактивен/);
    rejects(() => assertPromoApplicable(promo({ isActive: false }), 100_000), /не найден или неактивен/);
  });

  it('истёкший промокод отклоняется, действующий — нет', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    rejects(
      () => assertPromoApplicable(promo({ expiresAt: new Date('2026-05-31T23:59:59Z') }), 100_000, now),
      /Срок действия/,
    );
    assert.doesNotThrow(() =>
      assertPromoApplicable(promo({ expiresAt: new Date('2026-06-02T00:00:00Z') }), 100_000, now),
    );
  });

  it('при исчерпанном лимите использований отклоняется', () => {
    rejects(() => assertPromoApplicable(promo({ maxUses: 5, usedCount: 5 }), 100_000), /Лимит использований/);
    assert.doesNotThrow(() => assertPromoApplicable(promo({ maxUses: 5, usedCount: 4 }), 100_000));
  });

  it('при сумме ниже минимальной отклоняется и называет минимум', () => {
    rejects(
      () => assertPromoApplicable(promo({ minOrderCents: 100_000 }), 99_999),
      /Минимальная сумма заказа/,
    );
    assert.doesNotThrow(() => assertPromoApplicable(promo({ minOrderCents: 100_000 }), 100_000));
  });
});

describe('normalizePromoCode', () => {
  it('убирает пробелы и приводит к верхнему регистру', () => {
    assert.equal(normalizePromoCode('  welcome10 '), 'WELCOME10');
  });
});
