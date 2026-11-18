'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';
import { useAuth } from '../../../lib/auth-context';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await authApi.verifyEmail(email, code);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подтвердить код');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const res = await authApi.resendVerification(email);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код повторно');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="row justify-content-center">
      <div className="col-12 col-sm-8 col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h3 mb-3 text-center">Подтверждение почты</h1>
            <p className="text-muted small text-center mb-4">
              Мы отправили 6-значный код на вашу почту. Введите его, чтобы активировать
              аккаунт.
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
              <div className="mb-3">
                <label className="form-label">Код подтверждения</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control text-center"
                  style={{ letterSpacing: 6, fontSize: 20 }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="••••••"
                  required
                />
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {info && <div className="alert alert-success py-2">{info}</div>}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Проверяем...' : 'Подтвердить'}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-link w-100 mt-2"
              onClick={handleResend}
              disabled={resending || !email}
            >
              {resending ? 'Отправляем...' : 'Отправить код повторно'}
            </button>

            <div className="text-center mt-2 small text-muted">
              <Link href="/login">Вернуться ко входу</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
