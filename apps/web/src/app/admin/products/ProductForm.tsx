'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  AdminProduct,
  AdminProductMedia,
  AdminCategory,
  formatPriceInput,
  parsePriceInput,
} from '../../../lib/admin-api';

export default function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [title, setTitle] = useState(product?.title ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? formatPriceInput(product.priceCents) : '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');

  // Внешние ссылки на изображения (заменяются целиком при сохранении формы)
  const [images, setImages] = useState(
    product?.media.filter((m) => !m.filename).map((m) => m.url).join('\n') ?? '',
  );

  // Полный список медиа товара (и внешние ссылки, и загруженные файлы) — для превью и удаления
  const [mediaList, setMediaList] = useState<AdminProductMedia[]>(product?.media ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    setUploadError(null);
    setUploading(true);
    try {
      const media = await adminApi.uploadProductMedia(product.id, file);
      setMediaList((prev) => [...prev, media]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!product) return;
    if (!confirm('Удалить этот файл?')) return;
    try {
      await adminApi.deleteProductMedia(product.id, mediaId);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить файл');
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
            <label className="form-label">Изображения по внешним ссылкам (по одной на строку)</label>
            <textarea
              className="form-control"
              rows={3}
              value={images}
              onChange={(e) => setImages(e.target.value)}
              placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
            />
            {isEdit && (
              <div className="form-text">
                При сохранении формы этот список полностью заменит текущие внешние ссылки
                (загруженные ниже файлы не затрагиваются).
              </div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label">Файлы (изображения и видео)</label>

            {!isEdit && (
              <div className="alert alert-secondary py-2">
                Сначала сохраните товар — после этого здесь можно будет загружать файлы.
              </div>
            )}

            {isEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="form-control"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <div className="form-text">
                  До 20 МБ, изображение или видео. Файл сохраняется прямо в базе данных.
                </div>
                {uploading && <div className="text-muted small mt-1">Загружаем...</div>}
                {uploadError && (
                  <div className="alert alert-danger py-2 mt-2">{uploadError}</div>
                )}

                {mediaList.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    {mediaList.map((m) => (
                      <div
                        key={m.id}
                        className="position-relative border rounded"
                        style={{ width: 90, height: 90, overflow: 'hidden' }}
                      >
                        {m.type === 'VIDEO' ? (
                          <video
                            src={m.url}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img
                            src={m.url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(m.id)}
                          className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0"
                          style={{ width: 22, height: 22, lineHeight: 1 }}
                          title="Удалить"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
