'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { suggestProducts, formatPrice, ProductSuggestion } from '../lib/catalog-api';

export default function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      suggestProducts(query)
        .then((res) => {
          setSuggestions(res);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 300); // debounce — не долбим API на каждое нажатие клавиши

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goToSearchResults() {
    setOpen(false);
    router.push(`/catalog?search=${encodeURIComponent(query)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    goToSearchResults();
  }

  function handleSuggestionClick() {
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="position-relative" style={{ width: 280 }}>
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder="Поиск по товарам..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
      </form>

      {open && (
        <div
          className="position-absolute top-100 start-0 w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 1050, maxHeight: 360, overflowY: 'auto' }}
        >
          {loading && <div className="p-2 text-muted small">Ищем...</div>}

          {!loading && suggestions.length === 0 && (
            <div className="p-2 text-muted small">Ничего не найдено</div>
          )}

          {!loading &&
            suggestions.map((s) => (
              <Link
                key={s.id}
                href={`/catalog/${s.slug}`}
                onClick={handleSuggestionClick}
                className="d-flex align-items-center gap-2 p-2 text-decoration-none text-reset border-bottom"
              >
                <img
                  src={s.image ?? 'https://via.placeholder.com/40x40?text=—'}
                  alt=""
                  width={36}
                  height={36}
                  style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                />
                <div className="flex-grow-1 overflow-hidden">
                  <div className="small text-truncate">{s.title}</div>
                  <div className="small text-muted">{formatPrice(s.priceCents)}</div>
                </div>
              </Link>
            ))}

          {!loading && suggestions.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-link w-100 text-decoration-none"
              onClick={goToSearchResults}
            >
              Все результаты по «{query}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
