import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { createOrder, createProduct, createUser, resetDb } from '../../test/db';
import { MailService } from '../mail/mail.service';
import { OrderLifecycleService } from '../order-lifecycle/order-lifecycle.service';
import { PaymentsService } from './payments.service';
import { YookassaService } from './yookassa.service';

const suite = dbTestsEnabled ? describe : describe.skip;

suite('PaymentsService: синхронизация статуса платежа (нужна тестовая БД)', () => {
  let paymentStatus: 'succeeded' | 'canceled' | 'pending' = 'pending';
  const yookassa = {
    getPayment: async (id: string) => ({ id, status: paymentStatus }),
    createPayment: async () => ({ id: 'new-payment', confirmation: { confirmation_url: 'https://pay.test' } }),
  } as unknown as YookassaService;
  const mail = { sendOrderStatusChangedEmail: async () => undefined } as unknown as MailService;
  const payments = new PaymentsService(yookassa, mail, new OrderLifecycleService());

  beforeEach(async () => {
    await resetDb();
    paymentStatus = 'pending';
  });
  after(async () => {
    await prisma.$disconnect();
  });

  async function cardOrder(status: 'PENDING' | 'CANCELLED', stock = 3) {
    const user = await createUser();
    const product = await createProduct({ stock });
    const order = await createOrder({
      userId: user.id,
      items: [{ product, quantity: 2 }],
      paymentMethod: 'CARD',
      paymentId: 'pay-1',
      status,
    });
    return { user, product, order };
  }

  const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
  const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  it('оплаченный платёж переводит заказ в «Оплачен»', async () => {
    const { order } = await cardOrder('PENDING');
    paymentStatus = 'succeeded';

    await payments.syncOrderPaymentStatus(order.id);

    assert.equal(await statusOf(order.id), 'PAID');
  });

  it('отменённый платёж отменяет заказ и возвращает товар на склад', async () => {
    const { order, product } = await cardOrder('PENDING');
    paymentStatus = 'canceled';

    await payments.syncOrderPaymentStatus(order.id);

    assert.equal(await statusOf(order.id), 'CANCELLED');
    assert.equal(await stockOf(product.id), 5);
  });

  it('платёж ещё в ожидании — заказ не меняется', async () => {
    const { order, product } = await cardOrder('PENDING');

    await payments.syncOrderPaymentStatus(order.id);

    assert.equal(await statusOf(order.id), 'PENDING');
    assert.equal(await stockOf(product.id), 3);
  });

  it('оплата после автоотмены восстанавливает заказ, если товар ещё есть', async () => {
    const { order, product } = await cardOrder('CANCELLED', 5);
    paymentStatus = 'succeeded';

    await payments.syncOrderPaymentStatus(order.id);

    assert.equal(await statusOf(order.id), 'PAID');
    assert.equal(await stockOf(product.id), 3);
  });

  it('оплата после автоотмены при нехватке товара не падает и оставляет заказ отменённым', async () => {
    const { order, product } = await cardOrder('CANCELLED', 1); // нужно 2
    paymentStatus = 'succeeded';

    await assert.doesNotReject(() => payments.syncOrderPaymentStatus(order.id));

    assert.equal(await statusOf(order.id), 'CANCELLED'); // нужен ручной возврат — это пишется в лог
    assert.equal(await stockOf(product.id), 1);
  });

  it('отменённый заказ нельзя оплатить заново', async () => {
    const { user, order } = await cardOrder('CANCELLED');

    await assert.rejects(
      () => payments.initiatePayment(user.id, order.id),
      (e: unknown) => e instanceof BadRequestException && /отменён/.test(e.message),
    );
  });
});
