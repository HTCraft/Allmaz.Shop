import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, formatPrice } from '../../../../lib/catalog-api';
import { serverFetch, isAuthenticated } from '../../../../lib/server-fetch';
import AddToCartButton from '../../../../components/AddToCartButton';
import FavoriteButton from '../../../../components/FavoriteButton';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
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

  const mainImage = product.images[0];

  return (
    <main className="py-4">
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
          <img
            src={mainImage?.url ?? 'https://via.placeholder.com/600x600?text=No+Image'}
            alt={mainImage?.alt ?? product.title}
            className="img-fluid rounded shadow-sm mb-3"
            style={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%' }}
          />
          {product.images.length > 1 && (
            <div className="d-flex gap-2 flex-wrap">
              {product.images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt ?? product.title}
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-start">
            <h1 className="h2">{product.title}</h1>
            <FavoriteButton productId={product.id} initialFavorited={initialFavorited} />
          </div>
          {product.category && (
            <span className="badge text-bg-light mb-3">{product.category.name}</span>
          )}
          <p className="fs-3 fw-bold mb-3">{formatPrice(product.priceCents)}</p>

          {product.stock > 0 ? (
            <span className="badge text-bg-success mb-3">В наличии: {product.stock} шт.</span>
          ) : (
            <span className="badge text-bg-danger mb-3">Нет в наличии</span>
          )}

          <p className="text-muted">{product.description}</p>

          <AddToCartButton productId={product.id} stock={product.stock} />

          <p className="text-muted small mt-3">Артикул: {product.sku}</p>
        </div>
      </div>
    </main>
  );
}
