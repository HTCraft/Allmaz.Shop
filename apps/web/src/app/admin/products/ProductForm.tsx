'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  AdminProduct,
  AdminCategory,
  formatPriceInput,
  parsePriceInput,
} from '../../../lib/admin-api';

export default function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [title, setTitle] = useState(product?.title ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? formatPriceInput(product.priceCents) : '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [images, setImages] = useState(
    product?.images.map((i) => i.url).join('\n') ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.listCategories().then(setCategories).catch(() => null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      slug: slug || undefined,
      description: description || undefined,
      priceCents: parsePriceInput(price),
      sku,
      stock: Number(stock),
      categoryId: categoryId || undefined,
      images: images
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit && product) {
        await adminApi.updateProduct(product.id, payload);
      } else {
        await adminApi.createProduct(payload);
      }
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Название</label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Слаг (URL)</label>
            <input
              className="form-control"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="сгенерируется из названия"
            />
          </div>

          <div className="col-12">
            <label className="form-label">Описание</label>
            <textarea
              className="form-control"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Цена (₽)</label>
            <input
              className="form-control"
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Артикул (SKU)</label>
            <input
              className="form-control"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Остаток</label>
            <input
              className="form-control"
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Категория</label>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Изображения (по одной ссылке на строку)</label>
            <textarea
              className="form-control"
              rows={3}
              value={images}
              onChange={(e) => setImages(e.target.value)}
              placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
            />
            {isEdit && (
              <div className="form-text">
                При сохранении список изображений полностью заменит текущий.
              </div>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger mt-3">{error}</div>}

        <div className="mt-4 d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Создать товар'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => router.push('/admin/products')}
          >
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}
