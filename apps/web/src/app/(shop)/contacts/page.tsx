import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Адрес магазина, телефоны, email и время работы.',
  alternates: { canonical: '/contacts' },
};

export default function ContactsPage() {
  return (
    <main className="py-4">
      <h1 className="mb-4">Контакты</h1>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-4">Как с нами связаться</h2>

              <div className="d-flex mb-3">
                <i className="bi bi-geo-alt fs-4 text-primary me-3" />
                <div>
                  <div className="fw-semibold">Адрес магазина</div>
                  <div className="text-muted">
                    г. Москва, ул. Примерная, д. 1, ТЦ «Пример», 2 этаж
                  </div>
                  <div className="text-muted small">Ежедневно с 10:00 до 21:00</div>
                </div>
              </div>

              <div className="d-flex mb-3">
                <i className="bi bi-telephone fs-4 text-primary me-3" />
                <div>
                  <div className="fw-semibold">Телефоны</div>
                  <div className="text-muted">
                    <a href="tel:+74951234567" className="text-reset text-decoration-none">
                      +7 (495) 123-45-67
                    </a>{' '}
                    — отдел продаж
                  </div>
                  <div className="text-muted">
                    <a href="tel:+74951234568" className="text-reset text-decoration-none">
                      +7 (495) 123-45-68
                    </a>{' '}
                    — служба поддержки
                  </div>
                </div>
              </div>

              <div className="d-flex mb-4">
                <i className="bi bi-envelope fs-4 text-primary me-3" />
                <div>
                  <div className="fw-semibold">Email</div>
                  <div className="text-muted">
                    <a
                      href="mailto:info@ecommerce-example.ru"
                      className="text-reset text-decoration-none"
                    >
                      info@ecommerce-example.ru
                    </a>
                  </div>
                </div>
              </div>

              <h2 className="h5 mb-3">Мы в соцсетях</h2>
              <div className="d-flex gap-2">
                <a
                  href="https://vk.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                >
                  <i className="bi bi-vk" /> VK
                </a>
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                >
                  <i className="bi bi-telegram" /> Telegram
                </a>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                >
                  <i className="bi bi-whatsapp" /> WhatsApp
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                >
                  <i className="bi bi-youtube" /> YouTube
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body p-0 d-flex flex-column h-100">
              <iframe
                title="Карта расположения магазина"
                src="https://yandex.ru/map-widget/v1/?text=Москва%2C%20ул.%20Примерная%2C%20д.%201"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
