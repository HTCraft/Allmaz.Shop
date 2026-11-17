/** Статичные звёзды (поддерживает половинки). Иконки — bootstrap-icons, подключены в layout. */
export default function StarRating({
  value,
  count,
  size = '1em',
  showValue = false,
}: {
  value: number | null;
  count?: number;
  size?: string;
  showValue?: boolean;
}) {
  const v = value ?? 0;
  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      aria-label={value === null ? 'Нет оценок' : `Оценка ${v} из 5`}
    >
      <span className="text-warning" style={{ fontSize: size, letterSpacing: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const cls = v >= i - 0.25 ? 'bi-star-fill' : v >= i - 0.75 ? 'bi-star-half' : 'bi-star';
          return <i key={i} className={`bi ${cls}`} aria-hidden="true" />;
        })}
      </span>
      {showValue && value !== null && <span className="fw-bold small">{v.toFixed(1)}</span>}
      {count !== undefined && <span className="text-muted small">({count})</span>}
    </span>
  );
}
