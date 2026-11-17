import { prisma } from '@ecommerce/database';

export interface RatingSummary {
  /** Средняя оценка с одним знаком после запятой; null — отзывов пока нет */
  average: number | null;
  count: number;
}

export const EMPTY_RATING: RatingSummary = { average: null, count: 0 };

/** Средняя оценка и число отзывов сразу для набора товаров — один запрос (для каталога) */
export async function getRatingMap(productIds: string[]): Promise<Map<string, RatingSummary>> {
  const map = new Map<string, RatingSummary>();
  if (productIds.length === 0) return map;

  const rows = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const row of rows) {
    map.set(row.productId, {
      average: row._avg.rating === null ? null : Math.round(row._avg.rating * 10) / 10,
      count: row._count._all,
    });
  }
  return map;
}
