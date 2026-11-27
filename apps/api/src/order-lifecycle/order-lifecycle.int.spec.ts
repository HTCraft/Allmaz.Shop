import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { createOrder, createProduct, createPromo, createUser, resetDb } from '../../test/db';
import { OrderLifecycleService } from './order-lifecycle.service';

const suite = dbTestsEnabled ? describe : describe.skip;

suite('OrderLifecycleService (нужна тестовая БД)', () => {
  const lifecycle = new OrderLifecycleService();

  beforeEach(resetDb);
  after(async () => {
    await prisma.$disconnect();
  });

  /** Заказ на 2 шт. товара; остаток уже «после резерва» (3), после отмены должно стать 5 */
  async function setup(status: 'PENDING' | 'PAID' | 'CANCELLED' = 'PENDING', withPromo = false) {
    const user = await createUser();
    const product = await createProduct({ stock: 3 });
    const promo = withPromo ? await createPromo({ usedCount: 1 }) : null;
    const order = await createOrder({
      userId: user.id,
      items: [{ product, quantity: 2 }],
      status,
      promoCodeId: promo?.id,
    });
    return { product, promo, order };
  }

  const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;
  const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

  it('отмена возвращает товар на склад и освобождает промокод', async () => {
    const { product, promo, order } = await setup('PENDING', true);

    assert.equal(await lifecycle.cancelOrder(order.id), true);

    assert.equal(await statusOf(order.id), 'CANCELLED');
    assert.equal(await stockOf(product.id), 5);
    const after = await prisma.promoCode.findUniqueOrThrow({ where: { id: promo!.id } });
    assert.equal(after.usedCount, 0);
  });

  it('повторная отмена ничего не меняет', async () => {
    const { product, order } = await setup();

    assert.equal(await lifecycle.cancelOrder(order.id), true);
    assert.equal(await lifecycle.cancelOrder(order.id), false);

    assert.equal(await stockOf(product.id), 5);
  });

  it('с ограничением по статусу оплаченный заказ не отменяется', async () => {
    const { product, order } = await setup('PAID');

    assert.equal(await lifecycle.cancelOrder(order.id, ['PENDING']), false);

    assert.equal(await statusOf(order.id), 'PAID');
    assert.equal(await stockOf(product.id), 3);
  });

  it('одновременные отмены возвращают товар ровно один раз', async () => {
    const { product, order } = await setup();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => lifecycle.cancelOrder(order.id)),
    );

    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await stockOf(product.id), 5);
  });

  it('восстановление заказа заново резервирует товар и промокод', async () => {
    const { product, promo, order } = await setup('PENDING', true);
    await lifecycle.cancelOrder(order.id);

    assert.equal(await lifecycle.reopenOrder(order.id, 'PAID'), true);

    assert.equal(await statusOf(order.id), 'PAID');
    assert.equal(await stockOf(product.id), 3);
    const after = await prisma.promoCode.findUniqueOrThrow({ where: { id: promo!.id } });
    assert.equal(after.usedCount, 1);
  });

  it('если товара не хватает, восстановление отклоняется и ничего не меняет', async () => {
    const { product, order } = await setup('CANCELLED');
    await prisma.product.update({ where: { id: product.id }, data: { stock: 1 } }); // нужно 2

    await assert.rejects(
      () => lifecycle.reopenOrder(order.id, 'PAID'),
      (e: unknown) => e instanceof BadRequestException && /не хватает на складе/.test(e.message),
    );

    assert.equal(await statusOf(order.id), 'CANCELLED');
    assert.equal(await stockOf(product.id), 1);
  });

  it('восстановить можно только отменённый заказ', async () => {
    const { product, order } = await setup('PAID');

    assert.equal(await lifecycle.reopenOrder(order.id, 'PENDING'), false);

    assert.equal(await statusOf(order.id), 'PAID');
    assert.equal(await stockOf(product.id), 3);
  });
});
