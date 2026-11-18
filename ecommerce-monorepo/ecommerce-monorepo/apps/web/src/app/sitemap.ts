import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '../lib/catalog-api';
import { getSiteUrl } from '../lib/seo';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 200;
const MAX_PAGES = 250; // с запасом под лимит sitemap в 50 000 адресов

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/contacts`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Если API недоступен, отдаём хотя бы статические страницы — карта сайта не должна падать с 500
  try {
    const categories = await getCategories();
    for (const c of categories) {
      entries.push({
        url: `${base}/catalog?category=${encodeURIComponent(c.slug)}`,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { items, pagination } = await getProducts({ page, limit: PAGE_SIZE });
      for (const p of items) {
        entries.push({
          url: `${base}/catalog/${encodeURIComponent(p.slug)}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
      if (page >= pagination.totalPages) break;
    }
  } catch {
    // см. комментарий выше
  }

  return entries;
}
