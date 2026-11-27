import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { addToCart, createProduct, createPromo, createUser, resetDb } from '../../test/db';
import { MailService } from '../mail/mail.service';
import { PaymentsService } from '../payments/payments.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { OrdersService } from './orders.service';

const suite = dbTestsEnabled ? describe : describe.skip;

const DTO = { shippingAddress: 'Москва, ул. Тестовая, 1', phone: '+79990000000' };

suite('OrdersService.createOrder (нужна тестовая БД)', () => {
  // Почта и ЮKassa в этих тестах не участвуют — подставляем заглушки
  const mail = {
    sendOrderConfirmationEmail: async () => undefined,
    sendOrderStatusChangedEmail: async () => undefined,
  } as unknown as MailService;
  const payments = {
    initiatePayment: async () => ({ paymentUrl: 'https://pay.test/checkout' }),
  } as unknown as PaymentsService;
  const orders = new OrdersService(mail, payments, new PromoCodesService());

  beforeEach(resetDb);
  after(async () => {
    await prisma.$disconnect();
  });

  const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  it('списывает остаток, считает сумму и очищает корзину', async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 5, priceCents: 100_000 });
    await addToCart(user.id, product.id, 2);

    const order = await orders.createOrder(user.id, DTO);

    assert.equal(order.status, 'PENDING');
    assert.equal(order.totalCents, 200_000);
    assert.equal(order.items.length, 1);
    assert.equal(await stockOf(product.id), 3);
    assert.equal(await prisma.cartItem.count(), 0);
  });

  it('применяет промокод: скидка в заказе, счётчик использований растёт', async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 5, priceCents: 100_000 });
    const promo = await createPromo({ discountType: 'PERCENT', value: 10 });
    await addToCart(user.id, product.id, 2);

    const order = await orders.createOrder(user.id, { ...DTO, promoCode: ` ${promo.code.toLowerCase()} ` });

    assert.equal(order.discountCents, 20_000);
    assert.equal(order.totalCents, 180_000);
    assert.equal(order.promoCodeId, promo.id);
    assert.equal((await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } })).usedCount, 1);
  });

  it('заказ картой получает срок оплаты', async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 5 });
    await addToCart(user.id, product.id, 1);

    const order = await orders.createOrder(user.id, { ...DTO, paymentMethod: 'CARD' });

    assert.ok(order.paymentDeadline instanceof Date);
    assert.ok(order.paymentDeadline.getTime() > order.createdAt.getTime());
    assert.equal(order.paymentUrl, 'https://pay.test/checkout');
  });

  it('при нехватке товара отказывает и ничего не меняет', async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 1 });
    const promo = await createPromo();
    await addToCart(user.id, product.id, 2);

    await assert.rejects(
      () => orders.createOrder(user.id, { ...DTO, promoCode: promo.code }),
      (e: unknown) => e instanceof BadRequestException && /осталось только 1 шт\./.test(e.message),
    );

    assert.equal(await stockOf(product.id), 1);
    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.cartItem.count(), 1);
    assert.equal((await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } })).usedCount, 0);
  });

  it('пустая корзина — отказ', async () => {
    const user = await createUser();
    await assert.rejects(
      () => orders.createOrder(user.id, DTO),
      (e: unknown) => e instanceof BadRequestException && /Корзина пуста/.test(e.message),
    );
  });

  it('гонка: на последнюю единицу товара проходит ровно один заказ', async () => {
    const product = await createProduct({ stock: 1 });
    const [u1, u2] = await Promise.all([createUser(), createUser()]);
    await addToCart(u1.id, product.id, 1);
    await addToCart(u2.id, product.id, 1);

    const results = await Promise.allSettled([
      orders.createOrder(u1.id, DTO),
      orders.createOrder(u2.id, DTO),
    ]);

    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    assert.ok(failed.reason instanceof BadRequestException);
    assert.equal(await stockOf(product.id), 0); // не в минус
    assert.equal(await prisma.order.count(), 1);
  });

  it('гонка: промокод с лимитом в одно использование срабатывает один раз', async () => {
    const product = await createProduct({ stock: 10 });
    const promo = await createPromo({ maxUses: 1 });
    const [u1, u2] = await Promise.all([createUser(), createUser()]);
    await addToCart(u1.id, product.id, 1);
    await addToCart(u2.id, product.id, 1);

    const results = await Promise.allSettled([
      orders.createOrder(u1.id, { ...DTO, promoCode: promo.code }),
      orders.createOrder(u2.id, { ...DTO, promoCode: promo.code }),
    ]);

    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } })).usedCount, 1);
    assert.equal(await prisma.order.count(), 1);
    assert.equal(await stockOf(product.id), 9); // проигравший заказ откатился целиком, остаток не списан
  });
});
