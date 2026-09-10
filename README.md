# E-commerce Monorepo

## Стек
- **Frontend:** Next.js (apps/web)
- **Backend:** Nest.js (apps/api)
- **БД:** PostgreSQL
- **ORM:** Prisma (packages/database)
- **Менеджер пакетов:** npm workspaces

## Структура

```
ecommerce-monorepo/
├── apps/
│   ├── web/          # Next.js фронтенд
│   └── api/           # Nest.js бэкенд
├── packages/
│   ├── database/       # Prisma schema + клиент
│   ├── shared/          # общие типы/DTO/константы
│   └── config/           # общие конфиги (eslint, tsconfig)
├── package.json
├── tsconfig.base.json
└── .env.example
```

## Дальнейшие шаги (после установки зависимостей)
1. `npm install` в корне — поднимет все workspaces
2. Настроить PostgreSQL (локально или через Docker) и заполнить `.env` по образцу `.env.example`
3. `npm run prisma:generate` — сгенерировать Prisma Client
4. `npm run prisma:migrate` — накатить первую миграцию
5. `npm run dev:api` и `npm run dev:web` — запустить бэкенд и фронтенд
