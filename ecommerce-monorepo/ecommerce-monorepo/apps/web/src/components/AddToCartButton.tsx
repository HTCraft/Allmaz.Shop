'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cartApi } from '../lib/cart-api';

export default function AddToCartButton({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      await cartApi.addItem(productId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('unauthor')) {
        router.push('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось добавить товар');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="btn btn-primary btn-lg mt-3"
        disabled={stock === 0 || loading}
        onClick={handleAdd}
      >
        {stock === 0 ? 'Нет в наличии' : loading ? 'Добавляем...' : added ? 'Добавлено ✓' : 'Добавить в корзину'}
      </button>
      {error && <div className="alert alert-danger py-2 mt-2">{error}</div>}
    </div>
  );
}
