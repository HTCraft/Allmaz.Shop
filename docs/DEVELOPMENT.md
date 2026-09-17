# E-commerce Monorepo — техническая документация

Полное описание проекта: установка окружения, архитектура, структура базы данных, API и функциональность приложения.

---

## 1. Обзор проекта

Интернет-магазин на связке **Next.js** (фронтенд) + **Nest.js** (бэкенд) + **PostgreSQL/Prisma** (данные), организованный как монорепозиторий на **npm workspaces**.

Реализовано:
- Регистрация/вход с подтверждением email кодом, восстановление пароля, личный кабинет
- Каталог товаров с категориями, поиском, сортировкой и пагинацией
- Корзина и список избранного
- Оформление заказа (checkout) и история заказов
- Карусель товаров на главной странице
- Административная панель (товары, категории, пользователи, заказы, карусель) в стиле AdminLTE 4
- Статическая страница контактов

Не реализовано (сознательно, как область для дальнейшего развития):
- Реальный платёжный шлюз — оформление заказа предполагает оплату при получении (COD), статус заказа стартует как `PENDING`
- Смена email пользователем (потребовала бы повторной верификации)
- Отзывы/рейтинги товаров, поиск с автоподсказками — не входили в текущий объём работ

---

## 2. Технологический стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Nest.js 10, TypeScript |
| База данных | PostgreSQL |
| ORM | Prisma 6 |
| Аутентификация | JWT в httpOnly cookie, bcrypt для паролей, Passport.js |
| Стилизация | AdminLTE 4 (включает Bootstrap 5.3), подключается через CDN |
| Email | Nodemailer (с fallback на вывод в консоль, если SMTP не настроен) |
| Управление монорепо | npm workspaces (без Turborepo) |

---

## 3. Структура репозитория

```
ecommerce-monorepo/
├── apps/
│   ├── web/                        # Next.js фронтенд
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (shop)/         # Публичная часть — отдельный root layout
│   │   │   │   │   ├── layout.tsx  # html/body, шапка сайта, AuthProvider
│   │   │   │   │   ├── page.tsx    # Главная (карусель + приветствие)
│   │   │   │   │   ├── catalog/
│   │   │   │   │   ├── cart/
│   │   │   │   │   ├── checkout/
│   │   │   │   │   ├── orders/
│   │   │   │   │   ├── favorites/
│   │   │   │   │   ├── profile/
│   │   │   │   │   ├── contacts/
│   │   │   │   │   ├── login/ register/ restore/
│   │   │   │   │   ├── reset-password/ verify-email/
│   │   │   │   │   └── ...
│   │   │   │   └── admin/          # Админка — отдельный root layout (свой html/body)
│   │   │   │       ├── layout.tsx  # Проверка роли ADMIN, оболочка AdminLTE
│   │   │   │       ├── page.tsx    # Дашборд
│   │   │   │       ├── products/ categories/ users/ orders/ carousel/
│   │   │   ├── components/         # Переиспользуемые React-компоненты
│   │   │   └── lib/                # API-клиенты, контексты, утилиты
│   │   └── package.json
│   └── api/                        # Nest.js бэкенд
│       ├── src/
│       │   ├── auth/                # Регистрация, вход, верификация, восстановление, профиль
│       │   ├── catalog/              # Публичный каталог (товары, категории)
│       │   ├── cart/                 # Корзина
│       │   ├── favorites/            # Избранное
│       │   ├── orders/               # Заказы пользователя
│       │   ├── carousel/             # Публичная карусель
│       │   ├── mail/                 # Отправка писем
│       │   └── admin/                # Админ-модули (products, categories, users, orders, carousel, stats)
│       └── package.json
├── packages/
│   ├── database/                   # Prisma schema + сгенерированный клиент
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/index.ts            # Экспорт singleton-клиента Prisma
│   ├── shared/                     # Общие типы и утилиты (slugify и т.п.)
│   └── config/                     # Общий eslint-конфиг
├── docker-compose.yml              # Опциональный локальный PostgreSQL
├── package.json                    # Корневой, npm workspaces
└── docs/DEVELOPMENT.md             # Этот документ
```

### Почему у `/admin` отдельный root layout

Next.js App Router не перевыполняет общий родительский `layout.tsx` при каждом клиентском переходе между страницами. Изначально шапка сайта показывалась/скрывалась условно внутри одного общего layout — из-за этого при переходе из `/admin` на публичную страницу шапка «залипала» скрытой. Решение — паттерн Next.js **«multiple root layouts»**: публичная часть вынесена в route group `(shop)/` со своим `<html>/<body>`, а `/admin` имеет полностью независимый root layout. Next.js честно размонтирует одно дерево и монтирует другое при переходе между ними — ничего не может «протечь» между разделами.

---

## 4. Установка и запуск (локальная разработка)

### 4.1. Предварительные требования

- **Node.js** 18+ (рекомендуется 20+)
- **PostgreSQL** — либо установленный локально, либо через Docker (см. `docker-compose.yml` в корне)
- npm (идёт с Node.js)

### 4.2. Установка зависимостей

Из корня репозитория:

```bash
npm install
```

Команда установит зависимости для всех workspace-пакетов разом (`apps/web`, `apps/api`, `packages/database`, `packages/shared`).

### 4.3. Настройка базы данных

**Вариант А — Docker:**
```bash
docker compose up -d
```

**Вариант Б — PostgreSQL, установленный локально:**
Создайте базу данных `ecommerce` любым способом (psql, pgAdmin и т.д.).

### 4.4. Переменные окружения

Скопируйте `.env.example` в `.env` в корне проекта:
```bash
cp .env.example .env
```

**⚠️ Критически важный момент:** Prisma CLI читает `.env` **из директории `packages/database`**, а не из корня монорепо. После создания корневого `.env` обязательно скопируйте его туда же:
```bash
# Windows (PowerShell/CMD)
copy .env packages\database\.env

# macOS/Linux
cp .env packages/database/.env
```

Если этот файл пропадёт (например, при переносе/копировании проекта на другую машину), API будет запускаться без ошибок, но при первом обращении к базе упадёт с `Environment variable not found: DATABASE_URL`. После правки `.env` **обязательно перезапускайте** `dev:api` полностью — hot-reload не подхватывает новый `.env`-файл.

### 4.5. Список переменных окружения

| Переменная | Назначение | Значение по умолчанию |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public` |
| `API_PORT` | Порт Nest.js API | `4000` |
| `JWT_SECRET` | Секрет для подписи JWT | `change-me` (обязательно сменить в проде) |
| `JWT_EXPIRES_IN` | Время жизни JWT | `7d` |
| `FRONTEND_URL` | URL фронтенда (для CORS и ссылок в письмах) | `http://localhost:3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Настройки почты | пусто — письма выводятся в консоль API |
| `NEXT_PUBLIC_API_URL` | URL API для фронтенда | `http://localhost:4000` |

### 4.6. Миграции и тестовые данные

```bash
npm run prisma:generate   # генерирует Prisma Client под текущую схему
npm run prisma:migrate    # применяет миграции к БД (спросит имя при создании новой)
npm run db:seed           # заполняет базу тестовыми данными
```

Сид создаёт:
- Тестового администратора: **admin@example.com / admin12345** (сразу подтверждённый — `isVerified: true`)
- 2 категории и 6 товаров с картинками-заглушками (через picsum.photos)

Карусель на главной **не заполняется** сидом автоматически — товары в неё нужно добавить вручную через `/admin/carousel`.

### 4.7. Запуск в режиме разработки

В двух отдельных терминалах:
```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

### 4.8. Частые проблемы при локальной настройке

| Симптом | Причина | Решение |
|---|---|---|
| `Environment variable not found: DATABASE_URL` | Отсутствует `packages/database/.env` | Скопировать `.env` туда и перезапустить `dev:api` |
| `ts-node не является внутренней командой` при `db:seed` | Не выполнен `npm install` после появления новой зависимости в `package.json` | `npm install` из корня |
| `migration(s) applied but missing from local migrations directory` | Папка `prisma/migrations` не совпадает с историей в БД (например, потерялась при переносе проекта) | `npx prisma migrate reset` внутри `packages/database`, затем `npx prisma migrate dev --name init` и `npm run db:seed` |
| `You cannot have two parallel pages that resolve to the same path` | Старые файлы страниц остались лежать рядом с новыми после структурного рефакторинга (route groups) | Удалить дублирующиеся старые файлы/папки вручную |

---

## 5. Структура базы данных

Ниже — все модели Prisma-схемы (`packages/database/prisma/schema.prisma`) и их назначение.

### 5.1. Пользователи и авторизация

**`User`** — учётная запись пользователя
| Поле | Тип | Комментарий |
|---|---|---|
| `id` | String (cuid) | |
| `email` | String, уникальный | |
| `password` | String | bcrypt-хеш |
| `name` | String? | |
| `role` | `Role` (`USER` \| `ADMIN`) | по умолчанию `USER` |
| `isVerified` | Boolean | по умолчанию `false` — аккаунт заблокирован до подтверждения email |

Связи: `orders`, `passwordResetTokens`, `emailVerificationTokens`, `cart` (один-к-одному), `favorites`.

**`PasswordResetToken`** — токен восстановления пароля (случайная строка, TTL 1 час, одноразовый — помечается `usedAt`).

**`EmailVerificationToken`** — 6-значный код подтверждения email (TTL 15 минут, одноразовый).

### 5.2. Каталог

**`Category`** — категория товаров (`name`, `slug`, оба уникальны).

**`Product`** — товар: `title`, `slug` (уникальный), `description`, `priceCents` (цена в копейках/центах — во избежание ошибок с плавающей точкой), `sku` (уникальный артикул), `stock` (остаток), опциональная связь с `Category`.

**`ProductImage`** — изображение товара (`url`, `alt`, `position` для порядка в галерее), каскадно удаляется вместе с товаром.

### 5.3. Корзина и избранное

**`Cart`** — корзина, одна на пользователя (`userId` уникален).

**`CartItem`** — позиция в корзине (`productId` + `quantity`), уникальная пара `[cartId, productId]`.

**`Favorite`** — избранный товар пользователя, уникальная пара `[userId, productId]`.

### 5.4. Заказы

**`Order`** — заказ: `status` (`OrderStatus`), `shippingAddress`, `phone`, `comment`, `totalCents`.

**`OrderItem`** — позиция заказа. Хранит **снэпшот** `productTitle`, `productSku` и `priceCents` на момент оформления — история заказа не ломается, если товар потом переименуют, изменят цену или удалят.

**`OrderStatus`** (enum): `PENDING` → `PAID` → `SHIPPED` → `DELIVERED`, либо `CANCELLED`.

### 5.5. Карусель на главной

**`CarouselSlide`** — товар в карусели (`productId`, `position`, `active`); один товар может быть слайдом только один раз (`@@unique([productId])`).

**`CarouselSettings`** — единственная запись-синглтон (`id` всегда равен строке `"singleton"`) с настройками: `autoplay`, `intervalMs`, `showIndicators`, `showControls`.

### 5.6. ER-диаграмма связей (упрощённо)

```
User 1───1 Cart 1───* CartItem *───1 Product
User 1───* Favorite *───1 Product
User 1───* Order 1───* OrderItem (снэпшот) ───* Product
User 1───* PasswordResetToken
User 1───* EmailVerificationToken
Category 1───* Product 1───* ProductImage
Product 1───* CarouselSlide (уникально по товару)
Product 1───* OrderItem
```

---

## 6. API — справочник эндпоинтов

Базовый URL: `http://localhost:4000` (задаётся `NEXT_PUBLIC_API_URL`/`API_PORT`).
Авторизация — httpOnly JWT cookie `access_token` (не localStorage). Пометка **[Auth]** — требуется вход, **[Admin]** — требуется роль `ADMIN`.

### 6.1. `auth` — регистрация, вход, профиль

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/auth/register` | публичный | Создаёт аккаунт (заблокирован), отправляет код подтверждения на email |
| POST | `/auth/login` | публичный | Вход; отклоняется, если `isVerified: false` |
| POST | `/auth/logout` | публичный | Очищает cookie |
| GET | `/auth/me` | [Auth] | Текущий пользователь |
| PATCH | `/auth/profile` | [Auth] | Обновление имени |
| POST | `/auth/change-password` | [Auth] | Смена пароля (требует текущий пароль) |
| POST | `/auth/verify-email` | публичный | Проверка кода, активация аккаунта, автологин |
| POST | `/auth/resend-verification` | публичный | Повторная отправка кода |
| POST | `/auth/restore` | публичный | Запрос ссылки для сброса пароля |
| POST | `/auth/reset-password` | публичный | Установка нового пароля по токену из письма |

### 6.2. `catalog` — публичный каталог

| Метод | Путь | Описание |
|---|---|---|
| GET | `/categories` | Список категорий |
| GET | `/products` | Список товаров: пагинация (`page`, `limit`), поиск (`search`), сортировка (`sort`: `newest`\|`price_asc`\|`price_desc`), фильтр по категории (`category` — slug) |
| GET | `/products/:slug` | Карточка товара |

### 6.3. `cart` — корзина [Auth]

| Метод | Путь | Описание |
|---|---|---|
| GET | `/cart` | Текущая корзина с товарами и суммой |
| POST | `/cart/items` | Добавить товар (`productId`, `quantity`) |
| PATCH | `/cart/items/:productId` | Изменить количество (0 = удалить позицию) |
| DELETE | `/cart/items/:productId` | Удалить позицию |
| DELETE | `/cart` | Очистить корзину |

### 6.4. `favorites` — избранное [Auth]

| Метод | Путь | Описание |
|---|---|---|
| GET | `/favorites` | Список избранных товаров (полные данные) |
| GET | `/favorites/ids` | Только id избранных товаров (для отметок в каталоге) |
| POST | `/favorites/:productId` | Добавить в избранное |
| DELETE | `/favorites/:productId` | Убрать из избранного |

### 6.5. `orders` — заказы пользователя [Auth]

| Метод | Путь | Описание |
|---|---|---|
| POST | `/orders` | Оформить заказ из корзины (`shippingAddress`, `phone`, `comment?`) — проверяет остатки, списывает товар, очищает корзину в транзакции |
| GET | `/orders` | История заказов пользователя |
| GET | `/orders/:id` | Детали заказа (только свой) |

### 6.6. `carousel` — публичная карусель

| Метод | Путь | Описание |
|---|---|---|
| GET | `/carousel` | Активные слайды + настройки |

### 6.7. `admin/*` — административная панель [Admin]

Все эндпоинты защищены `JwtAuthGuard` + `RolesGuard` (`@Roles('ADMIN')`). Роль подтягивается из БД при каждом запросе (не из самого JWT), поэтому смена роли применяется мгновенно без переlogина.

| Модуль | Методы | Путь |
|---|---|---|
| Товары | GET/POST /admin/products, GET/PUT/DELETE /admin/products/:id | CRUD, автогенерация slug, проверка уникальности slug/SKU |
| Категории | GET/POST /admin/categories, PUT/DELETE /admin/categories/:id | CRUD; при удалении товары не удаляются, теряют категорию |
| Пользователи | GET /admin/users, PUT /admin/users/:id/role, DELETE /admin/users/:id | Смена роли, удаление (нельзя себе снять права/удалить себя) |
| Заказы | GET /admin/orders, GET /admin/orders/:id, PUT /admin/orders/:id/status | Просмотр всех заказов, смена статуса |
| Карусель | GET/PUT /admin/carousel/settings, GET/POST /admin/carousel/slides, PUT/DELETE /admin/carousel/slides/:id | Настройки + управление слайдами |
| Статистика | GET /admin/stats | Счётчики для дашборда (товары, категории, пользователи, нет в наличии, новые заказы) |

---

## 7. Frontend — карта страниц

### 7.1. Публичная часть (`app/(shop)/`)

| Путь | Описание |
|---|---|
| `/` | Главная: карусель товаров (если есть активные слайды) + приветственный блок |
| `/catalog` | Список товаров: фильтр по категории, поиск, пагинация |
| `/catalog/[slug]` | Карточка товара: галерея, добавление в корзину/избранное |
| `/cart` | Корзина: изменение количества, удаление, переход к оформлению |
| `/checkout` | Форма оформления заказа (адрес, телефон, комментарий) + сводка |
| `/orders`, `/orders/[id]` | История заказов пользователя |
| `/favorites` | Список избранных товаров |
| `/profile` | Личный кабинет: редактирование имени, смена пароля |
| `/contacts` | Статическая страница с адресом, телефонами, соцсетями, картой |
| `/login`, `/register` | Вход и регистрация (с полем подтверждения пароля) |
| `/restore`, `/reset-password` | Восстановление пароля (запрос ссылки → установка нового пароля) |
| `/verify-email` | Ввод кода подтверждения email после регистрации |

### 7.2. Административная панель (`app/admin/`)

Доступ проверяется на сервере в `admin/layout.tsx` — неавторизованных редиректит на `/login`, пользователей без роли `ADMIN` — на `/`.

| Путь | Описание |
|---|---|
| `/admin` | Дашборд со статистикой |
| `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit` | CRUD товаров, включая галерею изображений (список URL) |
| `/admin/categories` | Список с инлайн-созданием/редактированием/удалением |
| `/admin/users` | Список пользователей, смена роли, удаление |
| `/admin/orders`, `/admin/orders/[id]` | Просмотр заказов, смена статуса |
| `/admin/carousel` | Настройки карусели + управление слайдами (выбор товара, порядок, активность) |

### 7.3. Ключевые архитектурные решения фронтенда

- **`AuthContext`/`AuthProvider`** (`lib/auth-context.tsx`) — единый источник состояния авторизации; шапка сайта (`AuthNav`) реактивно переключается между «Вход/Регистрация» и именем пользователя + «Выйти» без перезагрузки страницы.
- **`serverFetch`** (`lib/server-fetch.ts`) — хелпер для Server Components: пробрасывает httpOnly cookie пользователя в запросы к API (обычный `fetch` на сервере Next.js не имеет доступа к cookie браузера автоматически).
- Стилизация — **AdminLTE 4** через CDN, подключается один раз в каждом из двух root layout'ов (`(shop)/layout.tsx` и `admin/layout.tsx`); npm-пакет Bootstrap не используется вообще.
- Формы с денежными суммами — цена везде хранится в БД как `priceCents` (целое число), на фронте форматируется через `Intl.NumberFormat` (`formatPrice` в `lib/catalog-api.ts`).

---

## 8. Модель безопасности

- Пароли — bcrypt, 10 раундов
- JWT — в httpOnly cookie (`sameSite: 'lax'`, `secure` в production), недоступен из JS в браузере → защита от XSS-кражи токена
- Роль пользователя перепроверяется из БД на каждый запрос к защищённым роутам (а не берётся «как есть» из JWT-пейлоада) — смена роли администратором применяется мгновенно
- Восстановление пароля и повторная отправка кода верификации **не раскрывают**, существует ли email в базе (одинаковый ответ в обоих случаях)
- Админ не может снять с себя права администратора или удалить свою же учётную запись через `/admin/users`

---

## 9. Известные ограничения и точки роста

- Нет реального платёжного шлюза (эмулируется оплата при получении)
- Email пользователя нельзя изменить после регистрации
- Нет отзывов/рейтингов товаров
- Нет полнотекстового поиска с автоподсказками (только `contains`-фильтр по названию)
- Изображения товаров/карусели — только по внешним URL, без загрузки файлов на сервер
- SMTP не настроен «из коробки» — без него письма просто логируются в консоль API (годится для разработки, не для продакшена)
