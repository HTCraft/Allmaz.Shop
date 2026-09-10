'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminProduct } from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Удалить товар «${title}»?`)) return;
    setDeletingId(id);
    try {
      await adminApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
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
                          src={p.images[0]?.url ?? 'https://via.placeholder.com/48x48?text=—'}
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
                        Товаров пока нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
