import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  ItemRow,
  OrderRow,
  OrderStatusName,
  addDays,
  buildSalesReport,
  daysBetween,
  localDateKey,
  resolveRange,
  startOfLocalDayUtc,
} from './sales-report';

const MSK = 'Europe/Moscow'; // UTC+3 круглый год

const order = (
  createdAt: string,
  status: OrderStatusName,
  totalCents: number,
  extra: { discountCents?: number; code?: string } = {},
): OrderRow => ({
  createdAt: new Date(createdAt),
  status,
  totalCents,
  discountCents: extra.discountCents ?? 0,
  promoCode: extra.code ? { code: extra.code } : null,
});

function throwsBadRequest(fn: () => unknown, part: RegExp) {
  assert.throws(fn, (e: unknown) => e instanceof BadRequestException && part.test(e.message));
}

describe('даты и часовые пояса', () => {
  it('начало дня в Москве — 21:00 UTC предыдущих суток', () => {
    assert.equal(startOfLocalDayUtc('2026-11-18', MSK).toISOString(), '2026-11-17T21:00:00.000Z');
  });

  it('начало дня корректно на переходе летнего времени (Нью-Йорк)', () => {
    const tz = 'America/New_York';
    assert.equal(startOfLocalDayUtc('2026-03-08', tz).toISOString(), '2026-03-08T05:00:00.000Z'); // EST, −5
    assert.equal(startOfLocalDayUtc('2026-03-09', tz).toISOString(), '2026-03-09T04:00:00.000Z'); // EDT, −4
    assert.equal(startOfLocalDayUtc('2026-11-01', tz).toISOString(), '2026-11-01T04:00:00.000Z'); // EDT
    assert.equal(startOfLocalDayUtc('2026-11-02', tz).toISOString(), '2026-11-02T05:00:00.000Z'); // EST
  });

  it('локальная дата определяется по часовому поясу магазина', () => {
    assert.equal(localDateKey(new Date('2026-11-17T20:59:59Z'), MSK), '2026-11-17');
    assert.equal(localDateKey(new Date('2026-11-17T21:00:00Z'), MSK), '2026-11-18');
  });

  it('addDays и daysBetween работают через границу месяца и года', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.equal(daysBetween('2026-11-01', '2026-11-30'), 29);
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-11-18T10:00:00Z');

  it('по умолчанию — последние 30 дней, включая сегодня, и предыдущие 30 дней', () => {
    const r = resolveRange({}, MSK, now);
    assert.equal(r.to, '2026-11-18');
    assert.equal(r.from, '2026-10-20');
    assert.equal(r.days, 30);
    assert.equal(r.previous.to, '2026-10-19');
    assert.equal(r.previous.from, '2026-09-20');
    assert.equal(r.startUtc.toISOString(), '2026-10-19T21:00:00.000Z');
    assert.equal(r.endUtc.toISOString(), '2026-11-18T21:00:00.000Z');
  });

  it('days — последние N дней, включая сегодня', () => {
    const r = resolveRange({ days: 7 }, MSK, now);
    assert.equal(r.to, '2026-11-18');
    assert.equal(r.from, '2026-11-12');
    assert.equal(r.days, 7);
    // from/to главнее days
    assert.equal(resolveRange({ from: '2026-11-01', to: '2026-11-03', days: 7 }, MSK, now).days, 3);
  });

  it('принимает свой период; предыдущий имеет ту же длину', () => {
    const r = resolveRange({ from: '2026-11-01', to: '2026-11-07' }, MSK, now);
    assert.equal(r.days, 7);
    assert.equal(r.previous.from, '2026-10-25');
    assert.equal(r.previous.to, '2026-10-31');
  });

  it('отклоняет несуществующие даты, перевёрнутый и слишком длинный период', () => {
    throwsBadRequest(() => resolveRange({ from: '2026-02-30', to: '2026-03-01' }, MSK, now), /ГГГГ-ММ-ДД/);
    throwsBadRequest(() => resolveRange({ from: 'вчера', to: '2026-03-01' }, MSK, now), /ГГГГ-ММ-ДД/);
    throwsBadRequest(() => resolveRange({ from: '2026-11-10', to: '2026-11-01' }, MSK, now), /позже/);
    throwsBadRequest(() => resolveRange({ from: '2025-01-01', to: '2026-11-18' }, MSK, now), /не может быть больше/);
  });

  it('ровно 366 дней допускается', () => {
    assert.doesNotThrow(() => resolveRange({ from: '2025-11-18', to: '2026-11-18' }, MSK, now));
  });
});

describe('buildSalesReport', () => {
  const range = resolveRange({ from: '2026-11-01', to: '2026-11-03' }, MSK);
  const orders: OrderRow[] = [
    // Граница суток по Москве: 23:59:59 1 ноября и 00:00:00 2 ноября
    order('2026-11-01T20:59:59Z', 'PAID', 100_000),
    order('2026-11-01T21:00:00Z', 'DELIVERED', 200_000, { discountCents: 20_000, code: 'SALE' }),
    order('2026-11-02T10:00:00Z', 'PENDING', 50_000),
    order('2026-11-02T11:00:00Z', 'CANCELLED', 70_000),
    order('2026-11-03T10:00:00Z', 'SHIPPED', 300_000, { discountCents: 30_000, code: 'SALE' }),
    // Предыдущий период (29–31 октября) и вне обоих периодов
    order('2026-10-30T10:00:00Z', 'PAID', 150_000),
    order('2026-10-01T10:00:00Z', 'PAID', 999_999),
  ];
  const items: ItemRow[] = [
    { productId: 'p1', productTitle: 'Чайник', quantity: 1, priceCents: 100_000 },
    { productId: 'p1', productTitle: 'Чайник', quantity: 1, priceCents: 100_000 },
    { productId: 'p2', productTitle: 'Кофемашина', quantity: 1, priceCents: 250_000 },
  ];
  const report = buildSalesReport({ orders, items, range, tz: MSK });

  it('выручка — оплаченные, отправленные и доставленные; ожидающие и отменённые отдельно', () => {
    assert.equal(report.totals.revenueCents, 600_000);
    assert.equal(report.totals.ordersCount, 3);
    assert.equal(report.totals.averageCheckCents, 200_000);
    assert.equal(report.totals.discountCents, 50_000);
    assert.deepEqual(report.pending, { count: 1, cents: 50_000 });
    assert.deepEqual(report.cancelled, { count: 1, cents: 70_000 });
    assert.equal(report.byStatus.PAID.count, 1);
    assert.equal(report.byStatus.DELIVERED.cents, 200_000);
  });

  it('график по дням учитывает часовой пояс магазина и содержит все дни периода', () => {
    assert.deepEqual(report.daily, [
      { date: '2026-11-01', revenueCents: 100_000, orders: 1 },
      { date: '2026-11-02', revenueCents: 200_000, orders: 1 },
      { date: '2026-11-03', revenueCents: 300_000, orders: 1 },
    ]);
  });

  it('предыдущий период считается отдельно и не смешивается с текущим', () => {
    assert.equal(report.previous.revenueCents, 150_000);
    assert.equal(report.previous.ordersCount, 1);
    assert.equal(report.previous.from, '2026-10-29');
    assert.equal(report.previous.to, '2026-10-31');
  });

  it('топ товаров сортируется по выручке', () => {
    assert.deepEqual(
      report.topProducts.map((p) => [p.productId, p.quantity, p.revenueCents]),
      [
        ['p2', 1, 250_000],
        ['p1', 2, 200_000],
      ],
    );
  });

  it('использование промокодов: число заказов и сумма скидок', () => {
    assert.deepEqual(report.promoUsage, [{ code: 'SALE', orders: 2, discountCents: 50_000 }]);
  });

  it('пустой период: нули, средний чек 0, все дни в графике', () => {
    const empty = buildSalesReport({ orders: [], items: [], range, tz: MSK });
    assert.equal(empty.totals.revenueCents, 0);
    assert.equal(empty.totals.averageCheckCents, 0);
    assert.equal(empty.daily.length, 3);
    assert.deepEqual(empty.topProducts, []);
  });

  it('средний чек округляется до копейки', () => {
    const r = buildSalesReport({
      orders: [
        order('2026-11-01T10:00:00Z', 'PAID', 333),
        order('2026-11-01T11:00:00Z', 'PAID', 333),
        order('2026-11-01T12:00:00Z', 'PAID', 334),
      ],
      items: [],
      range,
      tz: MSK,
    });
    assert.equal(r.totals.revenueCents, 1000);
    assert.equal(r.totals.averageCheckCents, 333);
  });

  it('в топе не больше десяти позиций', () => {
    const many: ItemRow[] = Array.from({ length: 15 }, (_, i) => ({
      productId: `p${i}`,
      productTitle: `Товар ${i}`,
      quantity: 1,
      priceCents: 1000 + i,
    }));
    const r = buildSalesReport({ orders: [], items: many, range, tz: MSK });
    assert.equal(r.topProducts.length, 10);
    assert.equal(r.topProducts[0]?.productId, 'p14');
  });
});
