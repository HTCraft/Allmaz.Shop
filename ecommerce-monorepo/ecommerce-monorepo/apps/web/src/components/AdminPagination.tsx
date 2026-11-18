import type { Pagination } from '../lib/admin-api';

export default function AdminPagination({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <nav className="mt-3 d-flex justify-content-between align-items-center">
      <span className="text-muted small">
        Всего: {pagination.total}
      </span>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            ‹
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === pagination.page ? 'active' : ''}`}>
            <button type="button" className="page-link" onClick={() => onPageChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${pagination.page >= pagination.totalPages ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  );
}
