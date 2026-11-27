import { BadRequestException } from '@nestjs/common';

/**
 * Отчёт по продажам. Вся логика — чистые функции без обращения к БД (тестируются без базы):
 * сервис только достаёт строки заказов и позиций, а считает и группирует по дням этот файл.
 *
 * Выручка = заказы в статусах «Оплачен», «Отправлен», «Доставлен». «Ожидает» (в том числе
 * наложенный платёж, пока не подтверждён) и «Отменён» показываются отдельно и в выручку не входят.
 * Границы дней и группировка — в часовом поясе магазина (SHOP_TIMEZONE).
 */
export type OrderStatusName = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ALL_STATUSES: OrderStatusName[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export const REVENUE_STATUSES: OrderStatusName[] = ['PAID', 'SHIPPED', 'DELIVERED'];

export const MAX_RANGE_DAYS = 366;
export const DEFAULT_RANGE_DAYS = 30;
const TOP_LIMIT = 10;

export interface OrderRow {
  createdAt: Date;
  status: OrderStatusName;
  totalCents: number;
  discountCents: number;
  promoCode: { code: string } | null;
}

export interface ItemRow {
  productId: string;
  productTitle: string;
  quantity: number;
  priceCents: number;
}

export interface DateRange {
  from: string; // YYYY-MM-DD, включительно
  to: string; // YYYY-MM-DD, включительно
  days: number;
  startUtc: Date; // начало дня `from` в часовом поясе магазина
  endUtc: Date; // начало дня после `to` (исключительно)
  previous: { from: string; to: string; startUtc: Date; endUtc: Date };
}

// ---------- даты и часовые пояса ----------

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

function isRealDate(key: string): boolean {
  if (!DATE_KEY.test(key)) return false;
  const [y, m, d] = parseKey(key);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = parseKey(fromKey);
  const [ty, tm, td] = parseKey(toKey);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Дата YYYY-MM-DD момента `date` в часовом поясе `tz` */
export function localDateKey(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Смещение часового пояса от UTC (мс) в заданный момент */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    Number(parts['hour']),
    Number(parts['minute']),
    Number(parts['second']),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Момент (UTC), когда в поясе `tz` начинается день `key` */
export function startOfLocalDayUtc(key: string, tz: string): Date {
  const [y, m, d] = parseKey(key);
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - tzOffsetMs(guess, tz);
  result = guess - tzOffsetMs(result, tz); // уточнение на переходе летнего времени
  return new Date(result);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Период по умолчанию — последние 30 дней, включая сегодня; ограничение — не более 366 дней */
export function resolveRange(
  input: { from?: string; to?: string; days?: number },
  tz: string,
  now: Date = new Date(),
): DateRange {
  const today = localDateKey(now, tz);
  const to = input.to ?? today;
  // days — «последние N дней» (для быстрых кнопок 7/30/90/365), считается от «сегодня» по времени магазина
  const span = input.days && input.days > 0 ? Math.floor(input.days) : DEFAULT_RANGE_DAYS;
  const from = input.from ?? addDays(to, -(span - 1));

  if (!isRealDate(from) || !isRealDate(to)) {
    throw new BadRequestException('Даты нужно указывать в формате ГГГГ-ММ-ДД');
  }
  if (from > to) {
    throw new BadRequestException('Дата начала периода позже даты окончания');
  }
  const days = daysBetween(from, to) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw new BadRequestException(`Период не может быть больше ${MAX_RANGE_DAYS} дней`);
  }

  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return {
    from,
    to,
    days,
    startUtc: startOfLocalDayUtc(from, tz),
    endUtc: startOfLocalDayUtc(addDays(to, 1), tz),
    previous: {
      from: prevFrom,
      to: prevTo,
      startUtc: startOfLocalDayUtc(prevFrom, tz),
      endUtc: startOfLocalDayUtc(addDays(prevTo, 1), tz),
    },
  };
}

// ---------- отчёт ----------

const isRevenue = (status: OrderStatusName) => REVENUE_STATUSES.includes(status);

export function buildSalesReport(params: {
  /** Заказы за период и за предыдущий период такой же длины */
  orders: OrderRow[];
  /** Позиции заказов с выручкой — только за основной период */
  items: ItemRow[];
  range: DateRange;
  tz: string;
}) {
  const { orders, items, range, tz } = params;
  const inCurrent = (o: OrderRow) => o.createdAt >= range.startUtc && o.createdAt < range.endUtc;
  const inPrevious = (o: OrderRow) =>
    o.createdAt >= range.previous.startUtc && o.createdAt < range.previous.endUtc;

  const current = orders.filter(inCurrent);
  const previous = orders.filter(inPrevious);

  // По статусам
  const byStatus = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, { count: 0, cents: 0 }]),
  ) as Record<OrderStatusName, { count: number; cents: number }>;
  for (const o of current) {
    byStatus[o.status].count++;
    byStatus[o.status].cents += o.totalCents;
  }

  // Итоги
  const revenueOrders = current.filter((o) => isRevenue(o.status));
  const revenueCents = revenueOrders.reduce((s, o) => s + o.totalCents, 0);
  const discountCents = revenueOrders.reduce((s, o) => s + o.discountCents, 0);
  const ordersCount = revenueOrders.length;

  const previousRevenueOrders = previous.filter((o) => isRevenue(o.status));

  // По дням (все дни периода, в том числе без продаж)
  const dailyMap = new Map<string, { revenueCents: number; orders: number }>();
  for (let i = 0; i < range.days; i++) {
    dailyMap.set(addDays(range.from, i), { revenueCents: 0, orders: 0 });
  }
  for (const o of revenueOrders) {
    const day = dailyMap.get(localDateKey(o.createdAt, tz));
    if (day) {
      day.revenueCents += o.totalCents;
      day.orders++;
    }
  }

  // Топ товаров (выручка по позициям — до скидки по промокоду)
  const products = new Map<string, { productId: string; title: string; quantity: number; revenueCents: number }>();
  for (const i of items) {
    const entry = products.get(i.productId) ?? {
      productId: i.productId,
      title: i.productTitle,
      quantity: 0,
      revenueCents: 0,
    };
    entry.quantity += i.quantity;
    entry.revenueCents += i.quantity * i.priceCents;
    entry.title = i.productTitle;
    products.set(i.productId, entry);
  }

  // Промокоды
  const promos = new Map<string, { code: string; orders: number; discountCents: number }>();
  for (const o of revenueOrders) {
    if (!o.promoCode) continue;
    const entry = promos.get(o.promoCode.code) ?? { code: o.promoCode.code, orders: 0, discountCents: 0 };
    entry.orders++;
    entry.discountCents += o.discountCents;
    promos.set(o.promoCode.code, entry);
  }

  return {
    range: { from: range.from, to: range.to, days: range.days, timezone: tz },
    totals: {
      revenueCents,
      ordersCount,
      averageCheckCents: ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0,
      discountCents,
    },
    previous: {
      from: range.previous.from,
      to: range.previous.to,
      revenueCents: previousRevenueOrders.reduce((s, o) => s + o.totalCents, 0),
      ordersCount: previousRevenueOrders.length,
    },
    pending: byStatus.PENDING,
    cancelled: byStatus.CANCELLED,
    byStatus,
    daily: [...dailyMap.entries()].map(([date, v]) => ({ date, ...v })),
    topProducts: [...products.values()]
      .sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity)
      .slice(0, TOP_LIMIT),
    promoUsage: [...promos.values()]
      .sort((a, b) => b.discountCents - a.discountCents || b.orders - a.orders)
      .slice(0, TOP_LIMIT),
  };
}
