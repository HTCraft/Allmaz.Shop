import Link from 'next/link';
import { getCarousel } from '../../lib/carousel-api';
import ProductCarousel from '../../components/ProductCarousel';

export default async function HomePage() {
  const carousel = await getCarousel().catch(() => null);

  return (
    <main className="py-4">
      {carousel && <ProductCarousel data={carousel} />}

      <div className="py-5 text-center">
        <h1 className="display-5 fw-bold">E-commerce</h1>
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
