'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SalesReport, SalesStatus } from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';
import SalesChart from '../../../components/SalesChart';

const PRESETS = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
  { days: 365, label: 'Год' },
];

const STATUS_LABELS: Record<SalesStatus, string> = {
  PENDING: 'Ожидают обработки',
  PAID: 'Оплачены',
  SHIPPED: 'Отправлены',
  DELIVERED: 'Доставлены',
  CANCELLED: 'Отменены',
};
const STATUS_ORDER: SalesStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const fmtDate = (key: string) => `${key.slice(8, 10)}.${key.slice(5, 7)}.${key.slice(0, 4)}`;

/** Динамика к прошлому периоду той же длины */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-muted small">{current > 0 ? 'в прошлом периоде продаж не было' : '—'}</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`small ${up ? 'text-success' : 'text-danger'}`}>
      <i className={`bi ${up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />{' '}
      {up ? '+' : '−'}
      {Math.abs(pct).toFixed(1)}% к прошлому периоду
    </span>
  );
}

export default function AdminSalesPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState<number | null>(30);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load(query: { days?: number; from?: string; to?: string }) {
    setLoading(true);
    setError(null);
    adminApi
      .getSalesReport(query)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить отчёт'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load({ days: 30 });
  }, []);

  function selectPreset(d: number) {
    setDays(d);
    load({ days: d });
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    setDays(null);
    load({ from, to });
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Аналитика продаж</h1>
        <div className="btn-group">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              className={`btn btn-sm ${days === p.days ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => selectPreset(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={applyCustom} className="d-flex flex-wrap align-items-end gap-2 mb-4">
        <div>
          <label className="form-label small mb-1">С</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="form-label small mb-1">По</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-sm btn-outline-secondary">Показать период</button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && !report && <p className="text-muted">Загрузка...</p>}

      {report && (
        <div style={{ opacity: loading ? 0.5 : 1 }}>
          <p className="text-muted small">
            Период: {fmtDate(report.range.from)} — {fmtDate(report.range.to)} ({report.range.days} дн.),
            часовой пояс {report.range.timezone}. В выручку входят оплаченные, отправленные и доставленные
            заказы.
          </p>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Выручка</div>
                  <div className="fs-3 fw-bold">{formatPrice(report.totals.revenueCents)}</div>
                  <Delta current={report.totals.revenueCents} previous={report.previous.revenueCents} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Заказов</div>
                  <div className="fs-3 fw-bold">{report.totals.ordersCount}</div>
                  <Delta current={report.totals.ordersCount} previous={report.previous.ordersCount} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Средний чек</div>
                  <div className="fs-3 fw-bold">{formatPrice(report.totals.averageCheckCents)}</div>
                  <span className="text-muted small">по оплаченным заказам</span>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Скидки по промокодам</div>
                  <div className="fs-3 fw-bold">{formatPrice(report.totals.discountCents)}</div>
                  <span className="text-muted small">
                    Ожидают: {report.pending.count} ({formatPrice(report.pending.cents)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 mb-3">Выручка по дням</h2>
              <SalesChart data={report.daily} />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-7">
              <div className="card shadow-sm h-100">
                <div className="card-body table-responsive">
                  <h2 className="h5 mb-3">Топ товаров</h2>
                  {report.topProducts.length === 0 ? (
                    <p className="text-muted mb-0">Продаж за период нет.</p>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Товар</th>
                          <th className="text-end">Шт.</th>
                          <th className="text-end">Выручка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.topProducts.map((p) => (
                          <tr key={p.productId}>
                            <td>{p.title}</td>
                            <td className="text-end">{p.quantity}</td>
                            <td className="text-end">{formatPrice(p.revenueCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="form-text">Выручка по позициям — до скидки по промокоду.</div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h2 className="h5 mb-3">Заказы по статусам</h2>
                  <table className="table table-sm align-middle mb-0">
                    <tbody>
                      {STATUS_ORDER.map((s) => (
                        <tr key={s}>
                          <td>{STATUS_LABELS[s]}</td>
                          <td className="text-end">{report.byStatus[s].count}</td>
                          <td className="text-end text-muted">{formatPrice(report.byStatus[s].cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-body table-responsive">
                  <h2 className="h5 mb-3">Промокоды</h2>
                  {report.promoUsage.length === 0 ? (
                    <p className="text-muted mb-0">Промокоды в этом периоде не использовались.</p>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Код</th>
                          <th className="text-end">Заказов</th>
                          <th className="text-end">Скидка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.promoUsage.map((p) => (
                          <tr key={p.code}>
                            <td className="fw-bold">{p.code}</td>
                            <td className="text-end">{p.orders}</td>
                            <td className="text-end">{formatPrice(p.discountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-body table-responsive">
                  <h2 className="h5 mb-3">Заканчиваются на складе</h2>
                  {report.lowStock.length === 0 ? (
                    <p className="text-muted mb-0">Все товары в достаточном количестве.</p>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Товар</th>
                          <th className="text-end">Остаток</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.lowStock.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <Link href="/admin/products">{p.title}</Link>{' '}
                              <span className="text-muted small">{p.sku}</span>
                            </td>
                            <td className="text-end">
                              <span className={`badge ${p.stock === 0 ? 'text-bg-danger' : 'text-bg-warning'}`}>
                                {p.stock === 0 ? 'нет' : `${p.stock} шт.`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
