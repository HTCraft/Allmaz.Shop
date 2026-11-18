'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StarRating from './StarRating';
import {
  ApiError,
  MyReview,
  Review,
  ReviewsSummary,
  reviewsApi,
} from '../lib/reviews-api';

type AuthState = 'loading' | 'guest' | 'user';

export default function ReviewsSection({ slug }: { slug: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [auth, setAuth] = useState<AuthState>('loading');
  const [mine, setMine] = useState<MyReview | null>(null);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Первая страница (сброс списка) — после отправки/удаления отзыва */
  const reloadFirstPage = useCallback(async () => {
    const res = await reviewsApi.list(slug, 1);
    setItems(res.items);
    setSummary(res.summary);
    setPage(1);
    setTotalPages(res.pagination.totalPages);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    reloadFirstPage()
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить отзывы'))
      .finally(() => setLoading(false));

    reviewsApi
      .mine(slug)
      .then((res) => {
        setMine(res.review);
        setAuth('user');
      })
      .catch(() => setAuth('guest'));
  }, [slug, reloadFirstPage]);

  async function loadMore() {
    const next = page + 1;
    try {
      const res = await reviewsApi.list(slug, next);
      setItems((prev) => [...prev, ...res.items]);
      setPage(next);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить отзывы');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (rating < 1) {
      setFormError('Выберите оценку от 1 до 5 звёзд');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsApi.create(slug, { rating, text });
      setMine(res.review);
      setRating(0);
      setText('');
      await reloadFirstPage();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setAuth('guest');
      setFormError(err instanceof Error ? err.message : 'Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteMine() {
    if (!confirm('Удалить ваш отзыв?')) return;
    try {
      await reviewsApi.removeMine(slug);
      setMine(null);
      await reloadFirstPage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить отзыв');
    }
  }

  const shown = hover || rating;

  return (
    <section className="mt-5" id="reviews">
      <h2 className="h4 mb-3">Отзывы</h2>

      {summary && summary.count > 0 && (
        <div className="row g-3 align-items-center mb-4">
          <div className="col-auto text-center">
            <div className="display-5 fw-bold lh-1">{summary.average?.toFixed(1)}</div>
            <StarRating value={summary.average} size="1.1em" />
            <div className="text-muted small">{summary.count} отзыв(ов)</div>
          </div>
          <div className="col" style={{ maxWidth: 320 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star] ?? 0;
              const pct = summary.count ? (n / summary.count) * 100 : 0;
              return (
                <div key={star} className="d-flex align-items-center gap-2 small">
                  <span style={{ width: 12 }}>{star}</span>
                  <div className="progress flex-grow-1" style={{ height: 8 }}>
                    <div
                      className="progress-bar bg-warning"
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                    />
                  </div>
                  <span className="text-muted" style={{ width: 24 }}>
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Форма */}
      <div className="card mb-4">
        <div className="card-body">
          {auth === 'loading' ? (
            <span className="text-muted">Загрузка...</span>
          ) : auth === 'guest' ? (
            <p className="mb-0">
              <Link href="/login">Войдите</Link>, чтобы оставить отзыв.
            </p>
          ) : mine ? (
            <div>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold mb-1">Ваш отзыв</div>
                  <StarRating value={mine.rating} />
                  <p className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {mine.text}
                  </p>
                </div>
                <button className="btn btn-sm btn-outline-danger" onClick={handleDeleteMine}>
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="fw-bold mb-2">Оставить отзыв</div>
              <div className="mb-3" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    type="button"
                    key={i}
                    className="btn btn-link p-0 me-1 text-warning fs-3"
                    aria-label={`${i} из 5`}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setRating(i)}
                  >
                    <i className={`bi ${i <= shown ? 'bi-star-fill' : 'bi-star'}`} />
                  </button>
                ))}
              </div>
              <textarea
                className="form-control mb-3"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Расскажите о товаре"
                required
                minLength={3}
                maxLength={2000}
              />
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Отправляем...' : 'Отправить отзыв'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Список */}
      {loadError && <div className="alert alert-danger">{loadError}</div>}
      {loading ? (
        <p className="text-muted">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Пока нет отзывов — будьте первым.</p>
      ) : (
        <>
          <ul className="list-unstyled">
            {items.map((r) => (
              <li key={r.id} className="border-bottom pb-3 mb-3">
                <div className="d-flex justify-content-between">
                  <strong>{r.author}</strong>
                  <span className="text-muted small">
                    {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <StarRating value={r.rating} />
                <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                  {r.text}
                </p>
              </li>
            ))}
          </ul>
          {page < totalPages && (
            <button className="btn btn-outline-secondary" onClick={loadMore}>
              Показать ещё
            </button>
          )}
        </>
      )}
    </section>
  );
}
