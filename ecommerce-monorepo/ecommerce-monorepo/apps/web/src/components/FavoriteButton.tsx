'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { favoritesApi } from '../lib/favorites-api';

export default function FavoriteButton({
  productId,
  initialFavorited = false,
  size = 'md',
}: {
  productId: string;
  initialFavorited?: boolean;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); // на случай, если кнопка внутри <Link> карточки товара
    e.stopPropagation();

    if (loading) return;
    setLoading(true);
    const next = !favorited;
    setFavorited(next); // оптимистичное обновление

    try {
      if (next) {
        await favoritesApi.add(productId);
      } else {
        await favoritesApi.remove(productId);
      }
    } catch (err) {
      setFavorited(!next); // откатываем при ошибке
      if (err instanceof Error && err.message.toLowerCase().includes('unauthor')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  const dimension = size === 'sm' ? 32 : 44;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? 'Убрать из избранного' : 'Добавить в избранное'}
      className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
      style={{ width: dimension, height: dimension, lineHeight: 1 }}
    >
      <span style={{ color: favorited ? '#dc3545' : '#adb5bd', fontSize: size === 'sm' ? 16 : 20 }}>
        {favorited ? '♥' : '♡'}
      </span>
    </button>
  );
}
