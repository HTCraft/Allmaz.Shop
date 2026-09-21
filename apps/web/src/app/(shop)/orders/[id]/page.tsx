import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverFetch, isAuthenticated } from '../../../../lib/server-fetch';
import { formatPrice } from '../../../../lib/catalog-api';
import {
  Order,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE,
  PAYMENT_METHOD_LABELS,
} from '../../../../lib/orders-api';
import PaymentStatusSync from '../../../../components/PaymentStatusSync';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  if (!(await isAuthenticated())) {
    redirect('/login');
  }

  const { id } = await params;
  const res = await serverFetch(`/orders/${id}`);
  if (!res.ok) notFound();
  const order: Order = await res.json();

  return (
    <main className="py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/orders">Мои заказы</Link>
          </li>
          <li className="breadcrumb-item active">№{order.id.slice(-8).toUpperCase()}</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h1 className="h3 mb-0">Заказ №{order.id.slice(-8).toUpperCase()}</h1>
        <span className={`badge ${ORDER_STATUS_BADGE[order.status]} fs-6`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mb-4">
        <PaymentStatusSync order={order} />
      </div>

      <div className="row g-4">
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Товары</h2>
              <ul className="list-group list-group-flush">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                  >
                    <div>
                      <div>{item.productTitle}</div>
                      <div className="text-muted small">
                        Артикул {item.productSku} · {item.quantity} ×{' '}
                        {formatPrice(item.priceCents)}
                      </div>
                    </div>
                    <div className="fw-bold">
                      {formatPrice(item.priceCents * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between fs-5 fw-bold mt-3">
                <span>Итого</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="card shadow-sm">
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
    </main>
  );
}
