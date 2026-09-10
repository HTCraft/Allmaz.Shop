'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cartApi, Cart } from '../../../lib/cart-api';
import { formatPrice } from '../../../lib/catalog-api';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  async function updateQuantity(productId: string, quantity: number) {
    setPendingId(productId);
    try {
      const updated = await cartApi.updateItem(productId, quantity);
      setCart(updated);
    } catch {
      setError('Не удалось обновить количество');
    } finally {
      setPendingId(null);
    }
  }

  async function removeItem(productId: string) {
    setPendingId(productId);
    try {
      const updated = await cartApi.removeItem(productId);
      setCart(updated);
    } catch {
      setError('Не удалось удалить товар');
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <main className="py-4">
        <p className="text-muted">Загружаем корзину...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="py-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="py-5 text-center">
        <h1 className="h3 mb-3">Корзина пуста</h1>
        <p className="text-muted mb-4">Загляните в каталог, чтобы что-нибудь выбрать.</p>
        <Link href="/catalog" className="btn btn-primary">
          В каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="py-4">
      <h1 className="mb-4">Корзина</h1>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th></th>
              <th>Товар</th>
              <th>Цена</th>
              <th style={{ width: 160 }}>Количество</th>
              <th>Сумма</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.id}>
                <td style={{ width: 64 }}>
                  <img
                    src={item.product.image ?? 'https://via.placeholder.com/64x64?text=No+Image'}
                    alt={item.product.title}
                    width={56}
                    height={56}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                </td>
                <td>
                  <Link href={`/catalog/${item.product.slug}`} className="text-reset">
                    {item.product.title}
                  </Link>
                </td>
                <td>{formatPrice(item.product.priceCents)}</td>
                <td>
                  <div className="input-group input-group-sm">
                    <button
                      className="btn btn-outline-secondary"
                      disabled={pendingId === item.product.id}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      className="form-control text-center"
                      value={item.quantity}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-secondary"
                      disabled={
                        pendingId === item.product.id || item.quantity >= item.product.stock
                      }
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="fw-bold">{formatPrice(item.subtotalCents)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    disabled={pendingId === item.product.id}
                    onClick={() => removeItem(item.product.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-end">
        <div className="text-end">
          <p className="fs-4 fw-bold mb-2">Итого: {formatPrice(cart.totalCents)}</p>
          <button className="btn btn-success btn-lg" disabled title="Будет реализовано на следующем шаге">
            Оформить заказ
          </button>
        </div>
      </div>
    </main>
  );
}
