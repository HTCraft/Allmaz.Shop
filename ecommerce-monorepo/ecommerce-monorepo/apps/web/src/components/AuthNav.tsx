'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function AuthNav() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  if (loading) {
    return <span style={{ width: 140, display: 'inline-block' }} />;
  }

  if (user) {
    return (
      <div className="d-flex align-items-center gap-3">
        <Link href="/favorites" className="nav-link text-light">
          Избранное
        </Link>
        <Link href="/cart" className="nav-link text-light">
          Корзина
        </Link>
        <Link href="/orders" className="nav-link text-light">
          Мои заказы
        </Link>
        <Link href="/profile" className="text-light small text-decoration-none">
          {user.name || user.email}
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-outline-light"
          onClick={handleLogout}
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex gap-3">
      <Link href="/login" className="nav-link text-light">
        Вход
      </Link>
      <Link href="/register" className="nav-link text-light">
        Регистрация
      </Link>
    </div>
  );
}
