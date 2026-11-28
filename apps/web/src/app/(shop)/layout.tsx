import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import AuthNav from '../../components/AuthNav';
import SearchBar from '../../components/SearchBar';
import { AuthProvider } from '../../lib/auth-context';
import { getSiteName, getSiteUrl, isNoIndex } from '../../lib/seo';
import RuntimeEnv from '../../components/RuntimeEnv';

// Адрес и название сайта берутся из окружения на каждом запросе, а не при сборке
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const siteName = getSiteName();
  return {
    metadataBase: new URL(await getSiteUrl()),
    title: { default: `${siteName} — интернет-магазин`, template: `%s — ${siteName}` },
    description: `${siteName}: интернет-магазин с актуальными ценами, наличием и отзывами покупателей.`,
    applicationName: siteName,
    openGraph: { siteName, locale: 'ru_RU', type: 'website' },
    robots: isNoIndex() ? { index: false, follow: false } : undefined,
  };
}

// Это отдельный root layout для публичной части сайта (route group (shop)).
// У /admin — свой собственный root layout (apps/web/src/app/admin/layout.tsx)
// с независимыми <html>/<body>. Это осознанный выбор: Next.js App Router не
// перевыполняет общий layout при каждой клиентской навигации, поэтому попытка
// условно показывать/скрывать шапку сайта внутри одного layout приводила к
// тому, что шапка "залипала" скрытой после захода в /admin.
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = getSiteName();

  return (
    <html lang="ru">
      <head>
        <RuntimeEnv />
        {/* AdminLTE 4 (включает Bootstrap 5.3) — единый источник стилей для публичной части */}
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
      <body>
        <AuthProvider>
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
            <div className="container d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <Link href="/" className="navbar-brand mb-0">
                  {siteName}
                </Link>
                <Link href="/catalog" className="nav-link text-light">
                  Каталог
                </Link>
                <Link href="/contacts" className="nav-link text-light">
                  Контакты
                </Link>
              </div>
              <SearchBar />
              <AuthNav />
            </div>
          </nav>
          <div className="container">{children}</div>
        </AuthProvider>

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
