import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '@ecommerce/database';
import { createOrder, createProduct, createUser, resetDb } from '../../test/db';
import { MailService } from '../mail/mail.service';
import { OrderLifecycleService } from '../order-lifecycle/order-lifecycle.service';
import { PaymentsService } from './payments.service';
import { UnpaidOrdersJob } from './unpaid-orders.job';

const suite = dbTestsEnabled ? describe : describe.skip;

const TTL_MIN = 5;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

suite('UnpaidOrdersJob — автоотмена неоплаченных заказов (нужна тестовая БД)', () => {
  process.env['UNPAID_ORDER_TTL_MINUTES'] = String(TTL_MIN);

  let emails: string[] = [];
  const mail = {
    sendOrderStatusChangedEmail: async (to: string) => {
      emails.push(to);
    },
  } as unknown as MailService;

  /** Поведение «ЮKassa» в каждом тесте задаётся через эту переменную */
  let syncImpl: (orderId: string) => Promise<unknown> = async (id) =>
    prisma.order.findUnique({ where: { id } });
  const payments = {
    syncOrderPaymentStatus: (id: string) => syncImpl(id),
  } as unknown as PaymentsService;

  const job = new UnpaidOrdersJob(payments, new OrderLifecycleService(), mail);

  beforeEach(async () => {
    await resetDb();
    emails = [];
    syncImpl = async (id) => prisma.order.findUnique({ where: { id } });
  });
  after(async () => {
    await prisma.$disconnect();
  });

  async function stale(overrides: { paymentMethod?: 'CARD' | 'COD'; paymentId?: string; ageMin?: number; status?: 'PENDING' | 'PAID' } = {}) {
    const user = await createUser();
    const product = await createProduct({ stock: 3 });
    const order = await createOrder({
      userId: user.id,
      items: [{ product, quantity: 2 }],
      paymentMethod: overrides.paymentMethod ?? 'CARD',
      paymentId: overrides.paymentId ?? null,
      status: overrides.status ?? 'PENDING',
      createdAt: minutesAgo(overrides.ageMin ?? TTL_MIN + 5),
    });
    return { user, product, order };
  }

  const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
  const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  it('просроченный заказ картой отменяется, товар возвращается, покупатель получает письмо', async () => {
    const { user, product, order } = await stale();

    assert.equal(await job.run(), 1);

    assert.equal(await statusOf(order.id), 'CANCELLED');
    assert.equal(await stockOf(product.id), 5);
    assert.deepEqual(emails, [user.email]);
  });

  it('свежий заказ картой не трогает', async () => {
    const { order, product } = await stale({ ageMin: 1 });

    assert.equal(await job.run(), 0);

    assert.equal(await statusOf(order.id), 'PENDING');
    assert.equal(await stockOf(product.id), 3);
  });

  it('заказ с оплатой при получении не трогает, даже старый', async () => {
    const { order, product } = await stale({ paymentMethod: 'COD', ageMin: 24 * 60 });

    assert.equal(await job.run(), 0);

    assert.equal(await statusOf(order.id), 'PENDING');
    assert.equal(await stockOf(product.id), 3);
  });

  it('уже оплаченный заказ не трогает', async () => {
    const { order } = await stale({ status: 'PAID' });

    assert.equal(await job.run(), 0);

    assert.equal(await statusOf(order.id), 'PAID');
  });

  it('если ЮKassa сообщает, что заказ оплачен, он не отменяется', async () => {
    const { order, product } = await stale({ paymentId: 'pay-1' });
    syncImpl = async (id) => {
      // Как PaymentsService.syncOrderPaymentStatus при статусе succeeded
      await prisma.order.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PAID' } });
      return prisma.order.findUnique({ where: { id } });
    };

    assert.equal(await job.run(), 0);

    assert.equal(await statusOf(order.id), 'PAID');
    assert.equal(await stockOf(product.id), 3);
    assert.deepEqual(emails, []);
  });

  it('если ЮKassa недоступна, заказ не отменяется — повторим в следующий раз', async () => {
    const { order, product } = await stale({ paymentId: 'pay-2' });
    syncImpl = async () => {
      throw new Error('ЮKassa недоступна');
    };

    assert.equal(await job.run(), 0);

    assert.equal(await statusOf(order.id), 'PENDING');
    assert.equal(await stockOf(product.id), 3);

    // ...и при восстановлении связи отменяется
    syncImpl = async (id) => prisma.order.findUnique({ where: { id } });
    assert.equal(await job.run(), 1);
    assert.equal(await statusOf(order.id), 'CANCELLED');
  });

  it('параллельные запуски не отменяют заказ дважды', async () => {
    const { product } = await stale();

    const [a, b] = await Promise.all([job.run(), job.run()]);

    assert.equal(a + b, 1);
    assert.equal(await stockOf(product.id), 5);
  });
});
