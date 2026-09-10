'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';
import { useAuth } from '../../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      await authApi.login(email, password);
      await refresh();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setError(message);
      if (message.toLowerCase().includes('не подтверждён')) {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="row justify-content-center">
      <div className="col-12 col-sm-8 col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-4 text-center">Вход</h1>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Пароль</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {needsVerification && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="btn btn-outline-secondary w-100 mb-3"
                >
                  Подтвердить email
                </Link>
              )}
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Входим...' : 'Войти'}
              </button>
            </form>
            <div className="text-center mt-3">
              <Link href="/restore" className="d-block small mb-2">
                Забыли пароль?
              </Link>
              <span className="small text-muted">
                Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
