'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ordersApi } from '../lib/orders-api';

/** «Повторить заказ»: добавляет товары заказа в корзину по текущим ценам */
export default function RepeatOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Array<{ title: string; reason: string }> | null>(null);
  const [added, setAdded] = useState(0);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.repeat(orderId);
      if (res.skipped.length === 0) {
        router.push('/cart');
        return;
      }
      // Часть позиций не добавлена — показываем причины и даём перейти в корзину
      setAdded(res.added);
      setSkipped(res.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось повторить заказ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3">
      <button className="btn btn-outline-primary" onClick={handleClick} disabled={loading}>
        <i className="bi bi-arrow-repeat me-1" />
        {loading ? 'Добавляем...' : 'Повторить заказ'}
      </button>
      {error && <div className="alert alert-danger py-2 mt-2 mb-0">{error}</div>}
      {skipped && (
        <div className="alert alert-warning mt-2 mb-0">
          <div className="mb-1">
            {added > 0 ? `Добавлено позиций: ${added}. ` : 'Ничего добавить не удалось. '}
            Не добавлено:
          </div>
          <ul className="mb-2">
            {skipped.map((s) => (
              <li key={s.title}>
                {s.title} — {s.reason}
              </li>
            ))}
          </ul>
          {added > 0 && (
            <Link href="/cart" className="btn btn-sm btn-primary">
              Перейти в корзину
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
