'use client';

import { useEffect, useState } from 'react';
import { adminApi, AdminUser, Pagination } from '../../../lib/admin-api';
import AdminPagination from '../../../components/AdminPagination';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listUsers({ page, search: search || undefined })
      .then((res) => {
        setUsers(res.items);
        setPagination(res.pagination);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleRoleChange(id: string, role: 'USER' | 'ADMIN') {
    setBusyId(id);
    try {
      const updated = await adminApi.updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось изменить роль');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Удалить пользователя ${email}? Действие необратимо.`)) return;
    setBusyId(id);
    try {
      await adminApi.deleteUser(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Пользователи</h1>

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 360 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по email или имени..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-outline-secondary text-nowrap">
          Найти
        </button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p className="text-muted">Загрузка...</p>
          ) : (
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Зарегистрирован</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name ?? '—'}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 140 }}
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as 'USER' | 'ADMIN')
                        }
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="text-muted small">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={busyId === u.id}
                        onClick={() => handleDelete(u.id, u.email)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Пользователей не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {pagination && <AdminPagination pagination={pagination} onPageChange={setPage} />}
        </div>
      </div>
    </>
  );
}
