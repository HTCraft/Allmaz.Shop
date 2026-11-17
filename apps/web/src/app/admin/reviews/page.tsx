'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminReview, Pagination } from '../../../lib/admin-api';
import AdminPagination from '../../../components/AdminPagination';
import StarRating from '../../../components/StarRating';

export default function AdminReviewsPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listReviews({ page, search: search || undefined })
      .then((res) => {
        setItems(res.items);
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

  async function handleDelete(r: AdminReview) {
    if (!confirm(`Удалить отзыв пользователя ${r.user.email} на «${r.product.title}»?`)) return;
    try {
      await adminApi.deleteReview(r.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Отзывы</h1>

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 420 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по тексту, товару или email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-outline-secondary text-nowrap">
          Найти
        </button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body table-responsive">
          {loading ? (
            <p className="text-muted">Загрузка...</p>
          ) : (
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Товар</th>
                  <th>Автор</th>
                  <th>Оценка</th>
                  <th>Отзыв</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="text-nowrap small">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <Link href={`/catalog/${r.product.slug}#reviews`} target="_blank">
                        {r.product.title}
                      </Link>
                    </td>
                    <td className="small">
                      {r.user.name && <div>{r.user.name}</div>}
                      <span className="text-muted">{r.user.email}</span>
                    </td>
                    <td className="text-nowrap">
                      <StarRating value={r.rating} />
                    </td>
                    <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{r.text}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(r)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Отзывов не найдено
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
