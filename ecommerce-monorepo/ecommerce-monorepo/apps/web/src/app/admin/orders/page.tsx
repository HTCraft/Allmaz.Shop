'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminOrder, Pagination } from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, PAYMENT_METHOD_LABELS } from '../../../lib/orders-api';
import AdminPagination from '../../../components/AdminPagination';

const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listOrders({ page, search: search || undefined })
      .then((res) => {
        setOrders(res.items);
        setPagination(res.pagination);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    setBusyId(id);
    try {
      const updated = await adminApi.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось изменить статус');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Заказы</h1>

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 360 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по номеру или email клиента..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-outline-secondary text-nowrap">
          Найти
        </button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p className="text-muted">Загрузка...</p>
          ) : (
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>Товаров</th>
                  <th>Оплата</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id.slice(-8).toUpperCase()}</td>
                    <td>
                      {order.user.name || order.user.email}
                      <div className="text-muted small">{order.user.email}</div>
                    </td>
                    <td>{order.items.length}</td>
                    <td className="small">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</td>
                    <td>{formatPrice(order.totalCents)}</td>
                    <td>
                      <select
                        className={`form-select form-select-sm ${ORDER_STATUS_BADGE[order.status]}`}
                        style={{ width: 170 }}
                        value={order.status}
                        disabled={busyId === order.id}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {ORDER_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-muted small">
                      {new Date(order.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="text-end">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Подробнее
                      </Link>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      Заказов не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {pagination && <AdminPagination pagination={pagination} onPageChange={setPage} />}
        </div>
      </div>
    </>
  );
}
