'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MAX_SAVED_ADDRESSES,
  SavedAddress,
  addressesApi,
} from '../lib/addresses-api';

interface FormState {
  label: string;
  address: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY: FormState = { label: '', address: '', phone: '', isDefault: false };

/** Адреса доставки в личном кабинете: подставляются при оформлении заказа */
export default function AddressesCard() {
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await addressesApi.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить адреса');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setForm({ ...EMPTY, isDefault: items.length === 0 });
    setFormError(null);
    setEditingId('new');
  }

  function startEdit(a: SavedAddress) {
    setForm({ label: a.label ?? '', address: a.address, phone: a.phone, isDefault: a.isDefault });
    setFormError(null);
    setEditingId(a.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editingId === 'new') {
        await addressesApi.create({
          label: form.label || undefined,
          address: form.address,
          phone: form.phone,
          isDefault: form.isDefault,
        });
      } else if (editingId) {
        await addressesApi.update(editingId, {
          label: form.label,
          address: form.address,
          phone: form.phone,
          isDefault: form.isDefault || undefined,
        });
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось сохранить адрес');
    } finally {
      setSaving(false);
    }
  }

  async function handleDefault(id: string) {
    try {
      await addressesApi.setDefault(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось изменить основной адрес');
    }
  }

  async function handleDelete(a: SavedAddress) {
    if (!confirm('Удалить этот адрес?')) return;
    try {
      await addressesApi.remove(a.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить адрес');
    }
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Адреса доставки</h2>
          {editingId === null && items.length < MAX_SAVED_ADDRESSES && (
            <button className="btn btn-sm btn-outline-primary" onClick={startAdd}>
              Добавить адрес
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {editingId !== null && (
          <form onSubmit={handleSave} className="border rounded p-3 mb-3">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small mb-1">Название (необязательно)</label>
                <input
                  className="form-control"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Дом, Работа..."
                  maxLength={50}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label small mb-1">Телефон</label>
                <input
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+7 (___) ___-__-__"
                  required
                  minLength={5}
                  maxLength={32}
                />
              </div>
              <div className="col-12">
                <label className="form-label small mb-1">Адрес</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Город, улица, дом, квартира"
                  required
                  minLength={5}
                  maxLength={300}
                />
              </div>
              {items.length > 0 && !(editingId !== 'new' && form.isDefault) && (
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="address-default"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="address-default">
                      Сделать основным
                    </label>
                  </div>
                </div>
              )}
            </div>
            {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-success btn-sm" disabled={saving}>
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setEditingId(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-muted mb-0">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-muted mb-0">
            Сохранённых адресов пока нет. Добавьте адрес — он подставится при оформлении заказа.
          </p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((a) => (
              <li key={a.id} className="list-group-item px-0">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="fw-bold">
                      {a.label || 'Адрес'}{' '}
                      {a.isDefault && <span className="badge text-bg-primary ms-1">Основной</span>}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{a.address}</div>
                    <div className="text-muted small">{a.phone}</div>
                  </div>
                  <div className="d-flex gap-2 align-items-start flex-wrap">
                    {!a.isDefault && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleDefault(a.id)}
                      >
                        Сделать основным
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(a)}>
                      Изменить
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a)}>
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="form-text mt-2">
          Можно сохранить до {MAX_SAVED_ADDRESSES} адресов.
        </div>
      </div>
    </div>
  );
}
