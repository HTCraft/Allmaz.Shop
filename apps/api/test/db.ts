import { randomUUID } from 'crypto';
import { prisma } from '@ecommerce/database';
import { databaseName } from './setup-env';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
type PaymentMethod = 'COD' | 'CARD';

/** Очищает все таблицы (кроме служебной таблицы миграций). Работает только на БД с «test» в имени */
export async function resetDb(): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (!name || !/test/i.test(name)) {
    throw new Error(`Отказ очищать БД «${name}»: в имени тестовой базы должно быть «test»`);
  }
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
}

export function createUser(overrides: { email?: string; name?: string | null } = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${randomUUID()}@test.local`,
      password: 'hash-not-used-in-tests',
      isVerified: true,
      name: overrides.name ?? null,
    },
  });
}

export function createProduct(overrides: { stock?: number; priceCents?: number; title?: string } = {}) {
  const id = randomUUID();
  return prisma.product.create({
    data: {
      title: overrides.title ?? `Товар ${id.slice(0, 6)}`,
      slug: `product-${id}`,
      sku: `SKU-${id}`,
      priceCents: overrides.priceCents ?? 100_000,
      stock: overrides.stock ?? 10,
    },
  });
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
}

export function createPromo(
  overrides: Partial<{
    code: string;
    discountType: 'PERCENT' | 'FIXED';
    value: number;
    maxUses: number | null;
    usedCount: number;
    minOrderCents: number;
    isActive: boolean;
  }> = {},
) {
  return prisma.promoCode.create({
    data: {
      code: overrides.code ?? `PROMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      discountType: overrides.discountType ?? 'PERCENT',
      value: overrides.value ?? 10,
      maxUses: overrides.maxUses ?? null,
      usedCount: overrides.usedCount ?? 0,
      minOrderCents: overrides.minOrderCents ?? 0,
      isActive: overrides.isActive ?? true,
    },
  });
}

/** Создаёт заказ напрямую в БД. Остаток товара НЕ меняет — тест выставляет его сам (как «после резерва») */
export function createOrder(params: {
  userId: string;
  items: Array<{ product: { id: string; title: string; sku: string; priceCents: number }; quantity: number }>;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string | null;
  promoCodeId?: string | null;
  createdAt?: Date;
}) {
  const total = params.items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);
  return prisma.order.create({
    data: {
      userId: params.userId,
      status: params.status ?? 'PENDING',
      paymentMethod: params.paymentMethod ?? 'COD',
      paymentId: params.paymentId ?? null,
      promoCodeId: params.promoCodeId ?? null,
      shippingAddress: 'Москва, ул. Тестовая, 1',
      phone: '+79990000000',
      totalCents: total,
      createdAt: params.createdAt,
      items: {
        create: params.items.map((i) => ({
          productId: i.product.id,
          productTitle: i.product.title,
          productSku: i.product.sku,
          priceCents: i.product.priceCents,
          quantity: i.quantity,
        })),
      },
    },
  });
}

export { databaseName };
