'use client';

import { formatPrice } from '../lib/catalog-api';

interface Point {
  date: string;
  revenueCents: number;
  orders: number;
}

const WIDTH = 900;
const HEIGHT = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 8 };

const shortDate = (key: string) => `${key.slice(8, 10)}.${key.slice(5, 7)}`;

/** Столбчатая диаграмма выручки по дням на чистом SVG (без библиотек). Подсказка — при наведении на столбец */
export default function SalesChart({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.revenueCents), 0);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.max(Math.min(slot * 0.7, 40), 1);
  // Подписи по оси X не чаще, чем помещаются (примерно 10–12 штук)
  const labelEvery = Math.max(Math.ceil(data.length / 10), 1);

  if (data.length === 0 || max === 0) {
    return <p className="text-muted mb-0">За выбранный период продаж нет.</p>;
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Выручка по дням"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={PAD.top + innerH}
        y2={PAD.top + innerH}
        stroke="currentColor"
        strokeOpacity={0.25}
      />
      {data.map((d, i) => {
        const h = (d.revenueCents / max) * innerH;
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const y = PAD.top + innerH - h;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={d.revenueCents > 0 ? y : PAD.top + innerH - 1}
              width={barW}
              height={d.revenueCents > 0 ? Math.max(h, 1) : 1}
              rx={2}
              className="text-primary"
              fill="currentColor"
              fillOpacity={d.revenueCents > 0 ? 0.85 : 0.2}
            >
              <title>
                {`${d.date}: ${formatPrice(d.revenueCents)}, заказов: ${d.orders}`}
              </title>
            </rect>
            {i % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.65}
              >
                {shortDate(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
