# Публикация Allmaz.Shop на Render

Схема: **PostgreSQL** (уже есть) + **allmazshop-api** (Nest.js) + **allmaz-web** (Next.js), код — в одном GitHub-репозитории (монорепо).
**Redis проекту сейчас не нужен** — в коде он не используется, подключать его не надо.

> Важно про домены. Авторизация держится на httpOnly-cookie, которую выдаёт API, а читает и API, и сервер Next.js.
> Адреса вида `*.onrender.com` — это разные «сайты» для браузера, cookie между ними не ходит, поэтому **вход и админка
> заработают только на своём домене** с поддоменами одного родителя: `allmaz.shop` (сайт) и `api.allmaz.shop` (API).
> Публичные страницы (каталог, товар) на `onrender.com` откроются, но войти нельзя.

## 0. Что решить заранее

| Вопрос | Рекомендация |
|---|---|
| Тариф API | Для магазина — платный (Starter и выше): бесплатный засыпает после ~15 мин простоя (первый запрос ~1 мин), блокирует исходящий SMTP на портах 25/465/587 и не умеет Persistent Disk |
| Картинки/видео товаров | Файлы лежат на диске API. Эфемерная ФС Render стирает их при каждом деплое → нужен **Persistent Disk** (платный инстанс) или внешние ссылки на картинки в форме товара |
| База | Лучше чистая БД под проект. `prisma migrate deploy` падает с ошибкой, если в БД уже есть чужие таблицы без истории миграций |
| Домен | Нужен домен с доступом к DNS |

## 1. Репозиторий (GitHub)

1. Убедитесь, что в git попали: `packages/database/prisma/migrations/` (**обязательно**), `package-lock.json`, `docs/`.
2. В git не должно быть `.env`, `node_modules`, `dist`, `apps/api/uploads` — они уже в `.gitignore`.
3. Распакуйте свежий архив поверх проекта, затем:
   ```bash
   npm install
   npm run dev:api     # теперь сам собирает packages/* перед запуском
   ```
   `dev:api` вызывает `build:packages` — это нужно, чтобы `@ecommerce/database` и `@ecommerce/shared` были скомпилированы в JS
   (в production Node не умеет загружать их TypeScript-исходники).
4. `git add . && git commit -m "Prepare for Render" && git push`.

## 2. PostgreSQL

В Dashboard → ваша база → **Connections** скопируйте **Internal Database URL** (вида `postgresql://user:pass@dpg-xxxx/dbname`).
Он работает только между сервисами Render **в одном регионе** — создавайте API в том же регионе, что и база.
(External URL нужен лишь для подключения с вашего компьютера через `psql`.)

## 3. Сервис allmazshop-api

**New → Web Service** → подключите репозиторий.

| Поле | Значение |
|---|---|
| Name | `allmazshop-api` |
| Region | тот же, что у базы |
| Branch | `main` |
| Root Directory | *(пусто — корень репозитория)* |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build:api` |
| Start Command | `npm run start:api` |
| Health Check Path | `/health` |
| Instance Type | Starter (если нужны диск и SMTP) |

`--include=dev` обязателен: Render ставит `NODE_ENV=production`, а TypeScript, Nest CLI и Prisma лежат в devDependencies.
`build:api` делает: `prisma generate` → сборка `packages/*` → сборка Nest. `start:api` сначала применяет миграции
(`prisma migrate deploy`), затем запускает `node apps/api/dist/main.js`.

**Environment Variables** (Advanced → Add Environment Variable):

| Переменная | Значение |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal Database URL из шага 2 |
| `JWT_SECRET` | длинная случайная строка (`openssl rand -hex 48`); без неё API в production не запустится |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://allmaz.shop` (пока домена нет — временно `https://allmaz-web.onrender.com`) |
| `CORS_ORIGINS` | `https://allmaz.shop,https://www.allmaz.shop` |
| `API_PUBLIC_URL` | `https://api.allmaz.shop` |
| `COOKIE_DOMAIN` | `.allmaz.shop` |
| `THROTTLE_LIMIT` | `1000` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | см. шаг 7 |
| `YOOKASSA_SHOP_ID` `YOOKASSA_SECRET_KEY` | см. шаг 8 |
| `UPLOADS_DIR` | `/var/data/uploads` (если подключаете диск) |

**Persistent Disk** (вкладка Disks → Add Disk, только платный инстанс): Name `uploads`, Mount Path `/var/data`, размер 1 GB.
С диском сервис работает в одном экземпляре (не масштабируйте горизонтально).

Нажмите **Create Web Service**, дождитесь `Live`. Проверьте `https://allmazshop-api.onrender.com/health` → `{"status":"ok"}`.

## 4. Сервис allmaz-web

**New → Web Service**, тот же репозиторий.

| Поле | Значение |
|---|---|
| Name | `allmaz-web` |
| Region | тот же регион |
| Root Directory | *(пусто)* |
| Build Command | `npm install --include=dev && npm run build:web` |
| Start Command | `npm run start:web` |
| Instance Type | Free/Starter |

Переменные:

| Переменная | Значение |
|---|---|
| `NODE_VERSION` | `22` |
| `NEXT_PUBLIC_API_URL` | `https://api.allmaz.shop` |

`NEXT_PUBLIC_API_URL` вшивается в сборку: после её изменения нужен **Manual Deploy → Clear build cache & deploy**.

## 5. Домен и DNS

1. `allmazshop-api` → Settings → **Custom Domains** → добавьте `api.allmaz.shop`.
2. `allmaz-web` → Custom Domains → добавьте `allmaz.shop` и `www.allmaz.shop` (Render сам настроит редирект между ними).
3. У регистратора домена создайте записи ровно в тех значениях, что покажет Render:
   - поддомены (`api`, `www`) — `CNAME` на `<имя-сервиса>.onrender.com`;
   - корень `allmaz.shop` — запись `A` на IP, который указан в Render (или `ALIAS`/`ANAME`, если регистратор их поддерживает).
4. Нажмите **Verify** — после проверки Render выпустит TLS-сертификаты (до нескольких минут).
5. Если переменные в шагах 3–4 указывали временно — поправьте на итоговые и пересоберите web (см. выше).

## 6. Первый запуск

В production **не запускайте `db:seed`**: он создаёт `admin@example.com / admin12345` и тестовые товары.

Создание администратора:
1. Зарегистрируйтесь на сайте обычным образом и подтвердите email (нужен рабочий SMTP, шаг 7).
2. С вашего компьютера подключитесь к базе по **External Database URL** (`psql "<External URL>"`) и выполните:
   ```sql
   UPDATE "User" SET role = 'ADMIN', "isVerified" = true WHERE email = 'ваш@email';
   ```
3. Перезайдите на сайт — в меню появится админка. Категории, товары, промокоды заведите через неё.

## 7. Почта (SMTP)

Render блокирует исходящий SMTP на портах 25, 465 и 587 для бесплатных сервисов, а порт 25 — вообще для всех.
Варианты: платный инстанс (465/587 откроются) или провайдер с альтернативным портом **2525** (его поддерживают, например,
Mailtrap и Brevo — уточните у выбранного). Для писем реальным клиентам нужен подтверждённый домен отправителя
(`SMTP_FROM` на нём) и записи SPF/DKIM у провайдера.

## 8. ЮKassa

1. В личном кабинете ЮKassa: Интеграция → Ключи API — возьмите `shopId` и секретный ключ, впишите в `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY`.
   Если переменные пусты, код использует публичные тестовые ключи ЮKassa — платежи будут тестовыми.
2. Интеграция → HTTP-уведомления: URL `https://api.allmaz.shop/payments/yookassa/webhook`, события `payment.succeeded` и `payment.canceled`.

## 9. Проверка после запуска

- [ ] `https://api.allmaz.shop/health` отвечает `ok`
- [ ] Главная и каталог открываются, картинки товаров грузятся
- [ ] Регистрация → письмо → вход; после входа в шапке виден аккаунт (проверка, что cookie ходит на сервер Next.js)
- [ ] Админка открывается под администратором
- [ ] Корзина → заказ с промокодом → оплата (в тесте — тестовая карта ЮKassa)
- [ ] Загрузка картинки товара в админке и **она остаётся после редеплоя** (диск подключён)

## 10. Если что-то не работает

| Симптом | Причина / решение |
|---|---|
| Build падает на `prisma`/`tsc: not found` | Нет `--include=dev` в Build Command |
| `Cannot find module '@ecommerce/database'` при старте | Не выполнился `build:packages`: Build Command должен вызывать `npm run build:api` |
| `P3005 database schema is not empty` | В БД уже есть таблицы без истории миграций — используйте чистую БД |
| Вход «проходит», но сайт считает вас гостем | Не задан `COOKIE_DOMAIN` или сайт/API не на общем родительском домене |
| Ошибка CORS в консоли браузера | `CORS_ORIGINS`/`FRONTEND_URL` не совпадают с адресом сайта (схема `https://`, без слэша на конце) |
| Картинки ведут на `localhost` | Не задан `API_PUBLIC_URL` |
| 429 Too Many Requests | Поднимите `THROTTLE_LIMIT` |
| Письма не уходят, в логах `ETIMEDOUT` | Заблокированы SMTP-порты на бесплатном тарифе (шаг 7) |
| Картинки пропали после деплоя | Нет Persistent Disk или не задан `UPLOADS_DIR` |
| Первый запрос после простоя очень долгий | Бесплатный тариф засыпает |

## 11. Обновления и Redis

Каждый `git push` в `main` запускает автодеплой обоих сервисов. Redis пригодится позже (например, общее хранилище rate-limit
при нескольких экземплярах API или кэш каталога) — сейчас его подключать не нужно.
