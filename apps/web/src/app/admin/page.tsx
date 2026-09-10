import { serverFetch } from '../../lib/server-fetch';
import type { AdminStats } from '../../lib/admin-api';
import Link from 'next/link';

async function getStats(): Promise<AdminStats> {
  const res = await serverFetch('/admin/stats');
  return res.json();
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: 'Товаров', value: stats.productsCount, href: '/admin/products', icon: 'bi-box-seam', color: 'primary' },
    { label: 'Категорий', value: stats.categoriesCount, href: '/admin/categories', icon: 'bi-tags', color: 'success' },
    { label: 'Пользователей', value: stats.usersCount, href: '/admin/users', icon: 'bi-people', color: 'info' },
    { label: 'Нет в наличии', value: stats.outOfStockCount, href: '/admin/products', icon: 'bi-exclamation-triangle', color: 'danger' },
  ];

  return (
    <>
      <h1 className="h3 mb-4">Дашборд</h1>
      <div className="row g-3">
        {cards.map((card) => (
          <div className="col-12 col-sm-6 col-lg-3" key={card.label}>
            <Link href={card.href} className="text-decoration-none">
              <div className={`card text-bg-${card.color} shadow-sm`}>
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fs-2 fw-bold">{card.value}</div>
                    <div>{card.label}</div>
                  </div>
                  <i className={`bi ${card.icon} fs-1 opacity-50`} />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
