import type { Metadata } from 'next';
import Link from 'next/link';
import { getCarousel } from '../../lib/carousel-api';
import ProductCarousel from '../../components/ProductCarousel';
import JsonLd from '../../components/JsonLd';
import { getSiteName, getSiteUrl } from '../../lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const carousel = await getCarousel().catch(() => null);
  const siteName = getSiteName();
  const siteUrl = await getSiteUrl();

  return (
    <main className="py-4">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: siteName, url: siteUrl },
            {
              '@type': 'WebSite',
              '@id': `${siteUrl}/#website`,
              url: siteUrl,
              name: siteName,
              inLanguage: 'ru-RU',
              publisher: { '@id': `${siteUrl}/#organization` },
              // Поисковая строка сайта в выдаче
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/catalog?search={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            },
          ],
        }}
      />
      {carousel && <ProductCarousel data={carousel} />}

      <div className="py-5 text-center">
        <h1 className="display-5 fw-bold">{siteName}</h1>
        <p className="col-md-8 mx-auto fs-5 text-muted">
          Добро пожаловать! Загляните в каталог, чтобы посмотреть товары.
        </p>
        <Link href="/catalog" className="btn btn-primary btn-lg mt-3">
          Перейти в каталог
        </Link>
      </div>
    </main>
  );
}
