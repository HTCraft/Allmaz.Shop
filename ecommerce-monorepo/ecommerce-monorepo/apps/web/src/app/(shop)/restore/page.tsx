'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';

export default function RestorePage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await authApi.restore(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="row justify-content-center">
      <div className="col-12 col-sm-8 col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-3 text-center">Восстановление пароля</h1>
            <p className="text-muted small text-center mb-4">
              Введите email — если аккаунт существует, мы отправим ссылку для сброса пароля.
            </p>
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
              {message && <div className="alert alert-success py-2">{message}</div>}
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Отправляем...' : 'Отправить ссылку'}
              </button>
            </form>
            <div className="text-center mt-3 small">
              <Link href="/login">Вернуться ко входу</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
