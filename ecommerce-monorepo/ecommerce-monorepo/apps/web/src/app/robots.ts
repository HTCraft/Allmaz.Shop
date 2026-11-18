import type { MetadataRoute } from 'next';
import { getSiteUrl, isNoIndex } from '../lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isNoIndex()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const base = await getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Личные и служебные страницы
          '/admin',
          '/cart',
          '/checkout',
          '/orders',
          '/profile',
          '/favorites',
          '/login',
          '/register',
          '/reset-password',
          '/restore',
          '/verify-email',
          // Дубли каталога: результаты поиска и сортировки
          '/*?search=',
          '/*&search=',
          '/*?sort=',
          '/*&sort=',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
