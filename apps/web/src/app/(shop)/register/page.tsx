'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register(email, password, name);
      router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="row justify-content-center">
      <div className="col-12 col-sm-8 col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-4 text-center">Регистрация</h1>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Имя</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
                  minLength={8}
                  required
                />
                <div className="form-text">Не короче 8 символов</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Повторить пароль</label>
                <input
                  type="password"
                  className={`form-control ${
                    confirmPassword && confirmPassword !== password ? 'is-invalid' : ''
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                {confirmPassword && confirmPassword !== password && (
                  <div className="invalid-feedback">Пароли не совпадают</div>
                )}
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
              </button>
            </form>
            <div className="text-center mt-3 small text-muted">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
