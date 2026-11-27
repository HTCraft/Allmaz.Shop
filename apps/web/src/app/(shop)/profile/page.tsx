'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/auth-api';
import { useAuth } from '../../../lib/auth-context';
import AddressesCard from '../../../components/AddressesCard';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  const [name, setName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user) {
      setName(user.name ?? '');
    }
  }, [user, authLoading, router]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      await authApi.updateProfile(name);
      await refresh();
      setProfileSuccess('Профиль обновлён');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Новые пароли не совпадают');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Не удалось сменить пароль');
    } finally {
      setSavingPassword(false);
    }
  }

  if (authLoading || !user) {
    return (
      <main className="py-4">
        <p className="text-muted">Загрузка...</p>
      </main>
    );
  }

  return (
    <main className="py-4">
      <h1 className="mb-3">Личный кабинет</h1>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Link href="/orders" className="btn btn-outline-primary">
          <i className="bi bi-receipt me-1" />
          Мои заказы
        </Link>
        <Link href="/favorites" className="btn btn-outline-primary">
          <i className="bi bi-heart me-1" />
          Избранное
        </Link>
        <Link href="/cart" className="btn btn-outline-primary">
          <i className="bi bi-cart me-1" />
          Корзина
        </Link>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Профиль</h2>
              <form onSubmit={handleProfileSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={user.email} disabled />
                  <div className="form-text">Email изменить нельзя</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Имя</label>
                  <input
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                {profileError && (
                  <div className="alert alert-danger py-2">{profileError}</div>
                )}
                {profileSuccess && (
                  <div className="alert alert-success py-2">{profileSuccess}</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 order-md-last">
          <AddressesCard />
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Смена пароля</h2>
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                  <label className="form-label">Текущий пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Новый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Повторите новый пароль</label>
                  <input
                    type="password"
                    className={`form-control ${
                      confirmNewPassword && confirmNewPassword !== newPassword
                        ? 'is-invalid'
                        : ''
                    }`}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  {confirmNewPassword && confirmNewPassword !== newPassword && (
                    <div className="invalid-feedback">Пароли не совпадают</div>
                  )}
                </div>
                {passwordError && (
                  <div className="alert alert-danger py-2">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="alert alert-success py-2">{passwordSuccess}</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Сохраняем...' : 'Сменить пароль'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
