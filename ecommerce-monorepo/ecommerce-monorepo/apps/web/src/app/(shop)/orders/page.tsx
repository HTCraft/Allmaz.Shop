import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverFetch, isAuthenticated } from '../../../lib/server-fetch';
import { formatPrice } from '../../../lib/catalog-api';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from '../../../lib/orders-api';

export default async function OrdersPage() {
  if (!(await isAuthenticated())) {
    redirect('/login');
  }

  const res = await serverFetch('/orders');
  const orders: Order[] = res.ok ? await res.json() : [];

  return (
    <main className="py-4">
      <h1 className="mb-4">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted mb-4">У вас пока нет заказов.</p>
          <Link href="/catalog" className="btn btn-primary">
            В каталог
          </Link>
        </div>
      ) : (
        <div className="list-group">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="list-group-item list-group-item-action"
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Заказ №{order.id.slice(-8).toUpperCase()}</div>
                  <div className="text-muted small">
                    {new Date(order.createdAt).toLocaleString('ru-RU')} ·{' '}
                    {order.items.length} тов.
                  </div>
                </div>
                <div className="text-end">
                  <span className={`badge ${ORDER_STATUS_BADGE[order.status]} mb-1`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <div className="fw-bold">{formatPrice(order.totalCents)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
