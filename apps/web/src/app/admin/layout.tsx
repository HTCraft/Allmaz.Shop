import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { serverFetch } from '../../lib/server-fetch';
import AdminSidebarToggle from '../../components/AdminSidebarToggle';

export const metadata: Metadata = {
  title: 'Админ-панель — E-commerce',
};

async function requireAdmin() {
  const res = await serverFetch('/auth/me');
  if (!res.ok) redirect('/login');
  const user = await res.json();
  if (user.role !== 'ADMIN') redirect('/');
  return user;
}

// Отдельный root layout для /admin (своя пара <html>/<body>, независимая от
// публичной части в route group (shop)). Next.js полностью размонтирует одно
// дерево и монтирует другое при переходе между разными root layout'ами — это
// специально: так вся раскладка AdminLTE (классы на body, шрифты, скрипты)
// живёт и умирает вместе с /admin, ничего не может "протечь" на публичные страницы.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/styles/overlayscrollbars.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/admin-lte@4.9.1/dist/css/adminlte.min.css"
        />
      </head>
      <body className="layout-fixed sidebar-expand-lg bg-body-tertiary">
        <div className="app-wrapper">
          {/* Header */}
          <nav className="app-header navbar navbar-expand bg-body">
            <div className="container-fluid">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <AdminSidebarToggle />
                </li>
                <li className="nav-item d-none d-md-block">
                  <Link href="/admin" className="nav-link">
                    Дашборд
                  </Link>
                </li>
              </ul>
              <ul className="navbar-nav ms-auto">
                <li className="nav-item d-flex align-items-center gap-2">
                  <span className="text-muted small">{user.email}</span>
                  <Link href="/" className="btn btn-sm btn-outline-secondary">
                    На сайт
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* Sidebar */}
          <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
            <div className="sidebar-brand">
              <Link href="/admin" className="brand-link">
                <span className="brand-text fw-light">Админ-панель</span>
              </Link>
            </div>
            <div className="sidebar-wrapper">
              <nav className="mt-2">
                <ul className="nav sidebar-menu flex-column" role="menu">
                  <li className="nav-item">
                    <Link href="/admin" className="nav-link">
                      <i className="nav-icon bi bi-speedometer2" />
                      <p>Дашборд</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/products" className="nav-link">
                      <i className="nav-icon bi bi-box-seam" />
                      <p>Товары</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/orders" className="nav-link">
                      <i className="nav-icon bi bi-receipt" />
                      <p>Заказы</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/categories" className="nav-link">
                      <i className="nav-icon bi bi-tags" />
                      <p>Категории</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/promo-codes" className="nav-link">
                      <i className="nav-icon bi bi-percent" />
                      <p>Промокоды</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/carousel" className="nav-link">
                      <i className="nav-icon bi bi-images" />
                      <p>Карусель на главной</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/admin/users" className="nav-link">
                      <i className="nav-icon bi bi-people" />
                      <p>Пользователи</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link href="/contacts" className="nav-link">
                      <i className="nav-icon bi bi-geo-alt" />
                      <p>Контакты (на сайте)</p>
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="app-main">
            <div className="app-content-header">
              <div className="container-fluid" />
            </div>
            <div className="app-content">
              <div className="container-fluid">{children}</div>
            </div>
          </main>
        </div>

        <Script
          src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/overlayscrollbars@2.11.0/browser/overlayscrollbars.browser.es6.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/admin-lte@4.9.1/dist/js/adminlte.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
