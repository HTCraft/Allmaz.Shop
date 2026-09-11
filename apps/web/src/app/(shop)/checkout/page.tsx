'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cartApi, Cart } from '../../../lib/cart-api';
import { ordersApi } from '../../../lib/orders-api';
import { formatPrice } from '../../../lib/catalog-api';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cartApi
      .get()
      .then(setCart)
      .catch((err) => {
        if (err instanceof Error && err.message.toLowerCase().includes('unauthor')) {
          router.push('/login');
          return;
        }
        setError('Не удалось загрузить корзину');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        shippingAddress: address,
        phone,
        comment: comment || undefined,
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить заказ');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="py-4">
        <p className="text-muted">Загрузка...</p>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="py-5 text-center">
        <h1 className="h3 mb-3">Корзина пуста</h1>
        <p className="text-muted mb-4">Нечего оформлять — сначала добавьте товары.</p>
        <Link href="/catalog" className="btn btn-primary">
          В каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="py-4">
      <h1 className="mb-4">Оформление заказа</h1>

      <div className="row g-4">
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Данные доставки</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Адрес доставки</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Город, улица, дом, квартира"
                    required
                    minLength={5}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Телефон</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    required
                    minLength={5}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Комментарий к заказу (необязательно)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Например, удобное время для звонка"
                  />
                </div>

                <div className="alert alert-secondary small">
                  Оплата производится наличными или картой курьеру при получении.
                </div>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <button type="submit" className="btn btn-success btn-lg w-100" disabled={submitting}>
                  {submitting ? 'Оформляем...' : `Подтвердить заказ на ${formatPrice(cart.totalCents)}`}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Ваш заказ</h2>
              <ul className="list-group list-group-flush mb-3">
                {cart.items.map((item) => (
                  <li
                    key={item.id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                  >
                    <div>
                      <div>{item.product.title}</div>
                      <div className="text-muted small">
                        {item.quantity} × {formatPrice(item.product.priceCents)}
                      </div>
                    </div>
                    <div className="fw-bold">{formatPrice(item.subtotalCents)}</div>
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between fs-5 fw-bold">
                <span>Итого</span>
                <span>{formatPrice(cart.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
