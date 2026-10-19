import { notFound } from 'next/navigation';
import { serverFetch } from '../../../../lib/server-fetch';
import { formatPrice } from '../../../../lib/catalog-api';
import { AdminOrder } from '../../../../lib/admin-api';
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, PAYMENT_METHOD_LABELS } from '../../../../lib/orders-api';

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderPageProps) {
  const { id } = await params;
  const res = await serverFetch(`/admin/orders/${id}`);
  if (!res.ok) notFound();
  const order: AdminOrder = await res.json();

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Заказ №{order.id.slice(-8).toUpperCase()}</h1>
        <span className={`badge ${ORDER_STATUS_BADGE[order.status]} fs-6`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-md-7">
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Товары</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Артикул</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                    <th>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productTitle}</td>
                      <td className="text-muted small">{item.productSku}</td>
                      <td>{item.quantity}</td>
                      <td>{formatPrice(item.priceCents)}</td>
                      <td className="fw-bold">
                        {formatPrice(item.priceCents * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.discountCents > 0 && (
                <div className="d-flex justify-content-between text-success mb-1">
                  <span>Скидка по промокоду</span>
                  <span>−{formatPrice(order.discountCents)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fs-5 fw-bold">
                <span>Итого</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="h5 mb-3">Клиент</h2>
              <p className="mb-1">{order.user.name || '—'}</p>
              <p className="mb-0 text-muted">{order.user.email}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Доставка</h2>
              <p className="mb-2">
                <span className="text-muted">Адрес:</span> {order.shippingAddress}
              </p>
              <p className="mb-2">
                <span className="text-muted">Телефон:</span> {order.phone}
              </p>
              <p className="mb-2">
                <span className="text-muted">Оплата:</span>{' '}
                {PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </p>
              {order.comment && (
                <p className="mb-2">
                  <span className="text-muted">Комментарий:</span> {order.comment}
                </p>
              )}
              <p className="mb-0 text-muted small">
                Оформлен {new Date(order.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
