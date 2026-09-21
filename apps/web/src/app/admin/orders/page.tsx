'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminOrder } from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, PAYMENT_METHOD_LABELS } from '../../../lib/orders-api';

const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
                      Заказов пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
