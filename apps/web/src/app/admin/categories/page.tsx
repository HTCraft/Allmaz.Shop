'use client';

import { useEffect, useState } from 'react';
import { adminApi, AdminCategory, Pagination } from '../../../lib/admin-api';
import AdminPagination from '../../../components/AdminPagination';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function load() {
    setLoading(true);
    adminApi
      .listCategories({ page, search: search || undefined })
      .then((res) => {
        setCategories(res.items);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createCategory({ name: newName.trim() });
      setNewName('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать категорию');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: AdminCategory) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit(id: string) {
    try {
      await adminApi.updateCategory(id, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить категорию «${name}»? Товары останутся, но потеряют категорию.`)) return;
    try {
      await adminApi.deleteCategory(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Категории</h1>

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleCreate} className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Название новой категории"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn btn-primary text-nowrap" disabled={creating}>
              {creating ? 'Создаём...' : 'Добавить'}
            </button>
          </form>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 360 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по названию..."
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
                  <th>Название</th>
                  <th>Слаг</th>
                  <th>Товаров</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      {editingId === cat.id ? (
                        <input
                          className="form-control form-control-sm"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                        />
                      ) : (
                        cat.name
                      )}
                    </td>
                    <td className="text-muted small">{cat.slug}</td>
                    <td>{cat._count?.products ?? 0}</td>
                    <td className="text-end">
                      {editingId === cat.id ? (
                        <>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => saveEdit(cat.id)}
                          >
                            Сохранить
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            onClick={() => startEdit(cat)}
                          >
                            Изменить
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(cat.id, cat.name)}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Категорий не найдено
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
