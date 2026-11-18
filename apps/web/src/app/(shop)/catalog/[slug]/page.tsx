import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, formatPrice } from '../../../../lib/catalog-api';
import { serverFetch, isAuthenticated } from '../../../../lib/server-fetch';
import AddToCartButton from '../../../../components/AddToCartButton';
import FavoriteButton from '../../../../components/FavoriteButton';
import ProductGallery from '../../../../components/ProductGallery';
import StarRating from '../../../../components/StarRating';
import ReviewsSection from '../../../../components/ReviewsSection';
import JsonLd from '../../../../components/JsonLd';
import { excerpt, getSiteName, getSiteUrl } from '../../../../lib/seo';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) {
    return { title: 'Товар не найден', robots: { index: false, follow: false } };
  }

  const siteName = getSiteName();
  const description =
    excerpt(product.description) ??
    `Купить ${product.title} в ${siteName} по цене ${formatPrice(product.priceCents)}.`;
  const image = product.media.find((m) => m.type === 'IMAGE')?.url;
  const canonical = `/catalog/${product.slug}`;

  return {
    title: product.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.title,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  let initialFavorited = false;
  if (await isAuthenticated()) {
    const favRes = await serverFetch('/favorites/ids');
    if (favRes.ok) {
      const ids: string[] = await favRes.json();
      initialFavorited = ids.includes(product.id);
    }
  }

  const siteUrl = await getSiteUrl();
  const productUrl = `${siteUrl}/catalog/${product.slug}`;
  const images = product.media.filter((m) => m.type === 'IMAGE').map((m) => m.url);

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: excerpt(product.description, 500) ?? undefined,
    sku: product.sku,
    image: images.length > 0 ? images : undefined,
    category: product.category?.name,
    url: productUrl,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'RUB',
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  if (product.rating && product.rating.count > 0 && product.rating.average !== null) {
    productJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.average,
      reviewCount: product.rating.count,
    };
  }

  const breadcrumbs = [
    { name: 'Каталог', url: `${siteUrl}/catalog` },
    ...(product.category
      ? [
          {
            name: product.category.name,
            url: `${siteUrl}/catalog?category=${encodeURIComponent(product.category.slug)}`,
          },
        ]
      : []),
    { name: product.title, url: productUrl },
  ];

  return (
    <main className="py-4">
      <JsonLd data={productJsonLd} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: b.name,
            item: b.url,
          })),
        }}
      />
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/catalog">Каталог</Link>
          </li>
          {product.category && (
            <li className="breadcrumb-item">
              <Link href={`/catalog?category=${product.category.slug}`}>
                {product.category.name}
              </Link>
            </li>
          )}
          <li className="breadcrumb-item active">{product.title}</li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-md-6">
          <ProductGallery media={product.media} title={product.title} />
        </div>

        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-start">
            <h1 className="h2">{product.title}</h1>
            <FavoriteButton productId={product.id} initialFavorited={initialFavorited} />
          </div>
          {product.category && (
            <span className="badge text-bg-light mb-3">{product.category.name}</span>
          )}
          {product.rating && (
            <div className="mb-3">
              {product.rating.count > 0 ? (
                <a href="#reviews" className="text-decoration-none text-reset">
                  <StarRating
                    value={product.rating.average}
                    count={product.rating.count}
                    size="1.1em"
                    showValue
                  />
                </a>
              ) : (
                <a href="#reviews" className="text-muted small">
                  Пока нет отзывов
                </a>
              )}
            </div>
          )}
          <p className="fs-3 fw-bold mb-3">{formatPrice(product.priceCents)}</p>

          {product.stock > 0 && product.stock <= 5 ? (
            <span className="badge text-bg-warning mb-3">Осталось всего {product.stock} шт.</span>
          ) : product.stock > 0 ? (
            <span className="badge text-bg-success mb-3">В наличии: {product.stock} шт.</span>
          ) : (
            <span className="badge text-bg-danger mb-3">Нет в наличии</span>
          )}

          <p className="text-muted">{product.description}</p>

          <AddToCartButton productId={product.id} stock={product.stock} />

          <p className="text-muted small mt-3">Артикул: {product.sku}</p>
        </div>
      </div>

      <ReviewsSection slug={product.slug} />
    </main>
  );
}
