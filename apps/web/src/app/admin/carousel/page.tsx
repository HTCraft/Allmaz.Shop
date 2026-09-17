'use client';

import { useEffect, useState } from 'react';
import {
  adminApi,
  AdminCarouselSettings,
  AdminCarouselSlide,
  AdminProduct,
} from '../../../lib/admin-api';

export default function AdminCarouselPage() {
  const [settings, setSettings] = useState<AdminCarouselSettings | null>(null);
  const [slides, setSlides] = useState<AdminCarouselSlide[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingSettings, setSavingSettings] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [adding, setAdding] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      adminApi.getCarouselSettings(),
      adminApi.listCarouselSlides(),
      adminApi.listProducts(),
    ])
      .then(([s, sl, p]) => {
        setSettings(s);
        setSlides(sl);
        setProducts(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveSettings(patch: Partial<AdminCarouselSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSettings(true);
    try {
      await adminApi.updateCarouselSettings(patch);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось сохранить настройки');
      load();
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductId) return;
    setAdding(true);
    setError(null);
    try {
      const slide = await adminApi.createCarouselSlide({ productId: newProductId });
      setSlides((prev) => [...prev, slide].sort((a, b) => a.position - b.position));
      setNewProductId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить слайд');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(slide: AdminCarouselSlide) {
    try {
      const updated = await adminApi.updateCarouselSlide(slide.id, { active: !slide.active });
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, ...updated } : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить слайд');
    }
  }

  async function handlePositionChange(slide: AdminCarouselSlide, position: number) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, position } : s)).sort((a, b) => a.position - b.position),
    );
    try {
      await adminApi.updateCarouselSlide(slide.id, { position });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить порядок');
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Убрать товар из карусели?')) return;
    try {
      await adminApi.deleteCarouselSlide(id);
      setSlides((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить слайд');
    }
  }

  const availableProducts = products.filter(
    (p) => !slides.some((s) => s.productId === p.id),
  );

  if (loading) {
    return <p className="text-muted">Загрузка...</p>;
  }

  return (
    <>
      <h1 className="h3 mb-4">Карусель на главной</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Настройки</h2>
          {settings && (
            <div className="row g-3 align-items-center">
              <div className="col-auto">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoplay"
                    checked={settings.autoplay}
                    disabled={savingSettings}
                    onChange={(e) => saveSettings({ autoplay: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="autoplay">
                    Автопрокрутка
                  </label>
                </div>
              </div>
              <div className="col-auto">
                <label className="form-label small mb-0 me-2">Интервал (мс)</label>
                <input
                  type="number"
                  className="form-control form-control-sm d-inline-block"
                  style={{ width: 120 }}
                  min={1000}
                  step={500}
                  value={settings.intervalMs}
                  disabled={savingSettings}
                  onChange={(e) => saveSettings({ intervalMs: Number(e.target.value) })}
                />
              </div>
              <div className="col-auto">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showIndicators"
                    checked={settings.showIndicators}
                    disabled={savingSettings}
                    onChange={(e) => saveSettings({ showIndicators: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="showIndicators">
                    Точки-индикаторы
                  </label>
                </div>
              </div>
              <div className="col-auto">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showControls"
                    checked={settings.showControls}
                    disabled={savingSettings}
                    onChange={(e) => saveSettings({ showControls: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="showControls">
                    Стрелки вперёд/назад
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Добавить товар в карусель</h2>
          <form onSubmit={handleAddSlide} className="d-flex gap-2">
            <select
              className="form-select"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
            >
              <option value="">Выберите товар...</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button className="btn btn-primary text-nowrap" disabled={adding || !newProductId}>
              {adding ? 'Добавляем...' : 'Добавить'}
            </button>
          </form>
          {availableProducts.length === 0 && products.length > 0 && (
            <div className="form-text">Все товары уже добавлены в карусель.</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Слайды ({slides.length})</h2>
          {slides.length === 0 ? (
            <p className="text-muted">Пока ничего не добавлено.</p>
          ) : (
            <table className="table align-middle">
              <thead>
                <tr>
                  <th></th>
                  <th>Товар</th>
                  <th style={{ width: 100 }}>Порядок</th>
                  <th>Показывать</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide) => (
                  <tr key={slide.id}>
                    <td style={{ width: 56 }}>
                      <img
                        src={
                          slide.product.media[0]?.url ??
                          'https://via.placeholder.com/48x48?text=—'
                        }
                        alt=""
                        width={40}
                        height={40}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                    </td>
                    <td>{slide.product.title}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={slide.position}
                        onChange={(e) => handlePositionChange(slide, Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={slide.active}
                          onChange={() => handleToggleActive(slide)}
                        />
                      </div>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(slide.id)}
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
