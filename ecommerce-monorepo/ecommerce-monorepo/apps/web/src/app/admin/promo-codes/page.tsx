'use client';

import { useEffect, useState } from 'react';
import {
  adminApi,
  AdminPromoCode,
  Pagination,
  PromoCodeInput,
  formatPriceInput,
  parsePriceInput,
} from '../../../lib/admin-api';
import { formatPrice } from '../../../lib/catalog-api';
import AdminPagination from '../../../components/AdminPagination';

interface FormState {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: string; // % или рубли — в зависимости от типа
  maxUses: string;
  minOrder: string; // рубли
  expiresAt: string; // yyyy-mm-dd
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  discountType: 'PERCENT',
  value: '',
  maxUses: '',
  minOrder: '',
  expiresAt: '',
  isActive: true,
};

function toForm(p: AdminPromoCode): FormState {
  return {
    code: p.code,
    discountType: p.discountType,
    value: p.discountType === 'PERCENT' ? String(p.value) : formatPriceInput(p.value),
    maxUses: p.maxUses === null ? '' : String(p.maxUses),
    minOrder: p.minOrderCents ? formatPriceInput(p.minOrderCents) : '',
    expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
    isActive: p.isActive,
  };
}

function toInput(f: FormState): PromoCodeInput {
  const value =
    f.discountType === 'PERCENT' ? parseInt(f.value, 10) : parsePriceInput(f.value);
  return {
    code: f.code.trim(),
    discountType: f.discountType,
    value,
    isActive: f.isActive,
    maxUses: f.maxUses.trim() ? parseInt(f.maxUses, 10) : null,
    minOrderCents: f.minOrder.trim() ? parsePriceInput(f.minOrder) : 0,
    // Действует по конец указанного дня (UTC)
    expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59Z`).toISOString() : null,
  };
}

function describeDiscount(p: AdminPromoCode) {
  return p.discountType === 'PERCENT' ? `${p.value}%` : formatPrice(p.value);
}

export default function AdminPromoCodesPage() {
  const [items, setItems] = useState<AdminPromoCode[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .listPromoCodes({ page, search: search || undefined })
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

  function startCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingId('new');
  }

  function startEdit(p: AdminPromoCode) {
    setForm(toForm(p));
    setFormError(null);
    setEditingId(p.id);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const input = toInput(form);
    if (!Number.isFinite(input.value) || input.value < 1) {
      setFormError('Укажите размер скидки');
      return;
    }
    setSaving(true);
    try {
      if (editingId === 'new') {
        await adminApi.createPromoCode(input);
      } else if (editingId) {
        await adminApi.updatePromoCode(editingId, input);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: AdminPromoCode) {
    try {
      await adminApi.updatePromoCode(p.id, { isActive: !p.isActive });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось изменить');
    }
  }

  async function handleDelete(p: AdminPromoCode) {
    if (!confirm(`Удалить промокод «${p.code}»? Уже оформленные заказы сохранятся.`)) return;
    try {
      await adminApi.deletePromoCode(p.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  }

  const isExpired = (p: AdminPromoCode) =>
    p.expiresAt !== null && new Date(p.expiresAt).getTime() < Date.now();

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Промокоды</h1>
        {editingId === null && (
          <button className="btn btn-primary" onClick={startCreate}>
            Новый промокод
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="card mb-4">
          <div className="card-body">
            <h2 className="h5 mb-3">{editingId === 'new' ? 'Новый промокод' : 'Редактирование'}</h2>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Код</label>
                  <input
                    className="form-control text-uppercase"
                    value={form.code}
                    onChange={(e) => update('code', e.target.value)}
                    placeholder="WELCOME10"
                    required
                    minLength={3}
                    maxLength={32}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Тип скидки</label>
                  <select
                    className="form-select"
                    value={form.discountType}
                    onChange={(e) =>
                      update('discountType', e.target.value as 'PERCENT' | 'FIXED')
                    }
                  >
                    <option value="PERCENT">Процент от суммы</option>
                    <option value="FIXED">Фиксированная сумма</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    {form.discountType === 'PERCENT' ? 'Размер, %' : 'Размер, ₽'}
                  </label>
                  <input
                    className="form-control"
                    value={form.value}
                    onChange={(e) => update('value', e.target.value)}
                    inputMode="decimal"
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Лимит использований</label>
                  <input
                    className="form-control"
                    value={form.maxUses}
                    onChange={(e) => update('maxUses', e.target.value)}
                    placeholder="Без лимита"
                    inputMode="numeric"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Мин. сумма заказа, ₽</label>
                  <input
                    className="form-control"
                    value={form.minOrder}
                    onChange={(e) => update('minOrder', e.target.value)}
                    placeholder="Без ограничения"
                    inputMode="decimal"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Действует до (включительно)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.expiresAt}
                    onChange={(e) => update('expiresAt', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="promo-active"
                      checked={form.isActive}
                      onChange={(e) => update('isActive', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="promo-active">
                      Активен
                    </label>
                  </div>
                </div>
              </div>

              {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}

              <div className="mt-3 d-flex gap-2">
                <button className="btn btn-success" disabled={saving}>
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setEditingId(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3" style={{ maxWidth: 360 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Поиск по коду..."
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
                  <th>Код</th>
                  <th>Скидка</th>
                  <th>Использован</th>
                  <th>Мин. заказ</th>
                  <th>Действует до</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-bold">{p.code}</td>
                    <td>{describeDiscount(p)}</td>
                    <td>
                      {p.usedCount}
                      {p.maxUses !== null ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td>{p.minOrderCents ? formatPrice(p.minOrderCents) : '—'}</td>
                    <td>
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td>
                      {isExpired(p) ? (
                        <span className="badge text-bg-secondary">Истёк</span>
                      ) : p.maxUses !== null && p.usedCount >= p.maxUses ? (
                        <span className="badge text-bg-secondary">Лимит исчерпан</span>
                      ) : p.isActive ? (
                        <span className="badge text-bg-success">Активен</span>
                      ) : (
                        <span className="badge text-bg-warning">Отключён</span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => toggleActive(p)}
                      >
                        {p.isActive ? 'Отключить' : 'Включить'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => startEdit(p)}
                      >
                        Изменить
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(p)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      Промокодов не найдено
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
