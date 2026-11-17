/** Сколько минут заказ с онлайн-оплатой ждёт оплаты, прежде чем его отменит фоновая задача */
const DEFAULT_TTL_MINUTES = 120;
const MIN_TTL_MINUTES = 5;

export function unpaidOrderTtlMs(): number {
  const raw = Number(process.env['UNPAID_ORDER_TTL_MINUTES']);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MINUTES;
  return Math.max(minutes, MIN_TTL_MINUTES) * 60_000;
}
