import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverFetch, isAuthenticated } from '../../../lib/server-fetch';
import { formatPrice, Product } from '../../../lib/catalog-api';
import FavoriteButton from '../../../components/FavoriteButton';
import MediaThumbnail from '../../../components/MediaThumbnail';

export default async function FavoritesPage() {
  if (!(await isAuthenticated())) {
    redirect('/login');
  }

  const res = await serverFetch('/favorites');
  const products: Product[] = res.ok ? await res.json() : [];

  return (
    <main className="py-4">
      <h1 className="mb-4">Избранное</h1>

      {products.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted mb-4">Пока пусто — добавляйте товары сердечком в каталоге.</p>
          <Link href="/catalog" className="btn btn-primary">
            В каталог
          </Link>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
          {products.map((product) => (
            <div className="col" key={product.id}>
              <div className="card h-100 shadow-sm position-relative">
                <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 1 }}>
                  <FavoriteButton productId={product.id} initialFavorited size="sm" />
                </div>
                <Link href={`/catalog/${product.slug}`} className="text-decoration-none text-reset">
                  <MediaThumbnail
                    media={product.media}
                    alt={product.title}
                    className="card-img-top"
                    style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{product.title}</h5>
                    <p className="card-text fw-bold">{formatPrice(product.priceCents)}</p>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
