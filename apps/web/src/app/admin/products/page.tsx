'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminProduct, Pagination } from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';
import AdminPagination from '../../../components/AdminPagination';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listProducts({ page, search: search || undefined })
      .then((res) => {
        setProducts(res.items);
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

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Удалить товар «${title}»?`)) return;
    setDeletingId(id);
    try {
      await adminApi.deleteProduct(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось удалить товар');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Товары</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" /> Добавить товар
        </Link>
      </div>

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 360 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по названию или артикулу..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-outline-secondary text-nowrap">
          Найти
        </button>
      </form>

      <div className="card">
        <div className="card-body">
          {loading && <p className="text-muted">Загрузка...</p>}
          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th></th>
                    <th>Название</th>
                    <th>Категория</th>
                    <th>Цена</th>
                    <th>Остаток</th>
                    <th>Артикул</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: 56 }}>
                        <img
                          src={p.media[0]?.url ?? 'https://via.placeholder.com/48x48?text=—'}
                          alt=""
                          width={40}
                          height={40}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      </td>
                      <td>{p.title}</td>
                      <td>{p.category?.name ?? '—'}</td>
                      <td>{formatPrice(p.priceCents)}</td>
                      <td>
                        {p.stock === 0 ? (
                          <span className="badge text-bg-danger">0</span>
                        ) : (
                          p.stock
                        )}
                      </td>
                      <td className="text-muted small">{p.sku}</td>
                      <td className="text-end">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="btn btn-sm btn-outline-secondary me-2"
                        >
                          Изменить
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p.id, p.title)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        Товаров не найдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination && <AdminPagination pagination={pagination} onPageChange={setPage} />}
        </div>
      </div>
    </>
  );
}
