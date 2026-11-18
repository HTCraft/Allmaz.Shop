import type { Metadata } from 'next';
import StarRating from '../../../components/StarRating';
import Link from 'next/link';
import {
  getCategories,
  getProducts,
  formatPrice,
} from '../../../lib/catalog-api';
import { serverFetch, isAuthenticated } from '../../../lib/server-fetch';
import FavoriteButton from '../../../components/FavoriteButton';
import MediaThumbnail from '../../../components/MediaThumbnail';
import { getSiteName } from '../../../lib/seo';

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? '1') || 1, 1);
  const siteName = getSiteName();

  let categoryName: string | undefined;
  if (params.category) {
    const categories = await getCategories().catch(() => []);
    categoryName = categories.find((c) => c.slug === params.category)?.name;
  }

  const search = params.search?.trim();
  const baseTitle = search ? `Поиск: ${search}` : (categoryName ?? 'Каталог товаров');
  const title = page > 1 ? `${baseTitle} — страница ${page}` : baseTitle;
  const description = categoryName
    ? `${categoryName}: купить в ${siteName}. Актуальные цены, наличие и отзывы покупателей.`
    : `Каталог товаров ${siteName}: актуальные цены, наличие и отзывы покупателей.`;

  // Каноничный адрес — только категория и страница; поиск и сортировка дублируют содержимое
  const canonicalParams = new URLSearchParams();
  if (categoryName && params.category) canonicalParams.set('category', params.category);
  if (page > 1) canonicalParams.set('page', String(page));
  const canonical = `/catalog${canonicalParams.size ? `?${canonicalParams.toString()}` : ''}`;

  const isDuplicateVariant = Boolean(search) || (params.sort && params.sort !== 'newest');

  return {
    title,
    description,
    alternates: { canonical },
    robots: isDuplicateVariant ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical },
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const [categories, { items, pagination }] = await Promise.all([
    getCategories(),
    getProducts({
      page,
      category: params.category,
      search: params.search,
      sort: (params.sort as 'newest' | 'price_asc' | 'price_desc') ?? 'newest',
    }),
  ]);

  let favoriteIds: string[] = [];
  if (await isAuthenticated()) {
    const favRes = await serverFetch('/favorites/ids');
    if (favRes.ok) favoriteIds = await favRes.json();
  }

  function buildQuery(overrides: Record<string, string | number | undefined>) {
    const merged = { ...params, ...overrides };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined && value !== '') sp.set(key, String(value));
    });
    return `/catalog?${sp.toString()}`;
  }

  return (
    <main className="py-4">
      <h1 className="mb-4">Каталог товаров</h1>

      <div className="row mb-4 gy-2">
        <div className="col-md-8">
          <div className="btn-group flex-wrap" role="group">
            <Link
              href={buildQuery({ category: undefined, page: undefined })}
              className={`btn btn-sm ${!params.category ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              Все категории
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildQuery({ category: cat.slug, page: undefined })}
                className={`btn btn-sm ${params.category === cat.slug ? 'btn-primary' : 'btn-outline-primary'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="col-md-4">
          <form action="/catalog" method="get" className="d-flex gap-2">
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Поиск по названию..."
              className="form-control form-control-sm"
            />
            <button type="submit" className="btn btn-sm btn-outline-secondary">
              Найти
            </button>
          </form>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">Ничего не найдено.</p>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
          {items.map((product) => (
            <div className="col" key={product.id}>
              <div className="card h-100 shadow-sm position-relative">
                <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 1 }}>
                  <FavoriteButton
                    productId={product.id}
                    initialFavorited={favoriteIds.includes(product.id)}
                    size="sm"
                  />
                </div>
                <Link
                  href={`/catalog/${product.slug}`}
                  className="text-decoration-none text-reset"
                >
                  <MediaThumbnail
                    media={product.media}
                    alt={product.title}
                    className="card-img-top"
                    style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{product.title}</h5>
                    {product.category && (
                      <span className="badge text-bg-light mb-2">
                        {product.category.name}
                      </span>
                    )}
                    {product.rating && product.rating.count > 0 && (
                      <div className="mb-1">
                        <StarRating
                          value={product.rating.average}
                          count={product.rating.count}
                          size="0.9em"
                        />
                      </div>
                    )}
                    <p className="card-text fw-bold">{formatPrice(product.priceCents)}</p>
                    {product.stock === 0 && (
                      <span className="badge text-bg-danger">Нет в наличии</span>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (p) => (
                <li key={p} className={`page-item ${p === pagination.page ? 'active' : ''}`}>
                  <Link className="page-link" href={buildQuery({ page: p })}>
                    {p}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </main>
  );
}
