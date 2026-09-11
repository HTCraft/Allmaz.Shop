import Link from 'next/link';
import { CarouselData } from '../lib/carousel-api';
import { formatPrice } from '../lib/catalog-api';

export default function ProductCarousel({ data }: { data: CarouselData }) {
  const { settings, slides } = data;

  if (slides.length === 0) return null;

  return (
    <div
      id="productCarousel"
      className="carousel slide mb-4"
      data-bs-ride={settings.autoplay ? 'carousel' : undefined}
      data-bs-interval={settings.intervalMs}
    >
      {settings.showIndicators && slides.length > 1 && (
        <div className="carousel-indicators">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              data-bs-target="#productCarousel"
              data-bs-slide-to={index}
              className={index === 0 ? 'active' : ''}
              aria-current={index === 0 ? 'true' : undefined}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className="carousel-inner rounded shadow-sm">
        {slides.map((slide, index) => (
          <div className={`carousel-item ${index === 0 ? 'active' : ''}`} key={slide.id}>
            <Link href={`/catalog/${slide.product.slug}`}>
              <img
                src={slide.product.image ?? 'https://via.placeholder.com/1200x480?text=No+Image'}
                alt={slide.product.title}
                className="d-block w-100"
                style={{ maxHeight: 480, objectFit: 'cover' }}
              />
            </Link>
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-2">
              <h5 className="mb-1">{slide.product.title}</h5>
              <p className="mb-0 fw-bold">{formatPrice(slide.product.priceCents)}</p>
            </div>
          </div>
        ))}
      </div>

      {settings.showControls && slides.length > 1 && (
        <>
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#productCarousel"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true" />
            <span className="visually-hidden">Назад</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#productCarousel"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true" />
            <span className="visually-hidden">Вперёд</span>
          </button>
        </>
      )}
    </div>
  );
}
