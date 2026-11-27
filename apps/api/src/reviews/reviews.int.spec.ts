import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { createProduct, createUser, resetDb } from '../../test/db';
import { getRatingMap } from './rating-stats';
import { ReviewsService } from './reviews.service';

const suite = dbTestsEnabled ? describe : describe.skip;

suite('ReviewsService и рейтинг (нужна тестовая БД)', () => {
  const reviews = new ReviewsService();

  beforeEach(resetDb);
  after(async () => {
    await prisma.$disconnect();
  });

  it('сводка: среднее, количество и распределение по звёздам', async () => {
    const product = await createProduct();
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    await reviews.create(a.id, product.slug, { rating: 5, text: 'Отлично' });
    await reviews.create(b.id, product.slug, { rating: 4, text: 'Хорошо' });
    await reviews.create(c.id, product.slug, { rating: 4, text: 'Нормально' });

    const { summary, items, pagination } = await reviews.list(product.slug, 1);

    assert.equal(summary.count, 3);
    assert.equal(summary.average, 4.3); // 13 / 3 = 4,333… → 4,3
    assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 });
    assert.equal(items.length, 3);
    assert.equal(pagination.total, 3);
  });

  it('автор виден по имени, а без имени — в виде маски, без email', async () => {
    const product = await createProduct();
    const named = await createUser({ name: 'Анна' });
    const anonymous = await createUser({ email: 'petrov@example.com' });
    await reviews.create(named.id, product.slug, { rating: 5, text: 'Супер' });
    await reviews.create(anonymous.id, product.slug, { rating: 3, text: 'Так себе' });

    const { items } = await reviews.list(product.slug, 1);
    const authors = items.map((i) => i.author).sort();

    assert.deepEqual(authors, ['Анна', 'pe***'].sort());
    assert.ok(!JSON.stringify(items).includes('example.com'));
  });

  it('второй отзыв того же пользователя на товар — конфликт', async () => {
    const product = await createProduct();
    const user = await createUser();
    await reviews.create(user.id, product.slug, { rating: 5, text: 'Первый' });

    await assert.rejects(
      () => reviews.create(user.id, product.slug, { rating: 1, text: 'Второй' }),
      (e: unknown) => e instanceof ConflictException,
    );
    assert.equal(await prisma.review.count(), 1);
  });

  it('свой отзыв можно получить и удалить; повторное удаление — 404', async () => {
    const product = await createProduct();
    const user = await createUser();
    await reviews.create(user.id, product.slug, { rating: 5, text: 'Отзыв' });

    assert.equal((await reviews.getMine(user.id, product.slug)).review?.rating, 5);
    assert.deepEqual(await reviews.removeMine(user.id, product.slug), { deleted: true });
    assert.equal((await reviews.getMine(user.id, product.slug)).review, null);
    await assert.rejects(
      () => reviews.removeMine(user.id, product.slug),
      (e: unknown) => e instanceof NotFoundException,
    );
  });

  it('несуществующий товар — 404', async () => {
    await assert.rejects(
      () => reviews.list('net-takogo-tovara', 1),
      (e: unknown) => e instanceof NotFoundException,
    );
  });

  it('getRatingMap: рейтинг считается пачкой, товары без отзывов в карту не попадают', async () => {
    const rated = await createProduct();
    const bare = await createProduct();
    const [a, b] = await Promise.all([createUser(), createUser()]);
    await reviews.create(a.id, rated.slug, { rating: 5, text: 'Отлично' });
    await reviews.create(b.id, rated.slug, { rating: 4, text: 'Хорошо' });

    const map = await getRatingMap([rated.id, bare.id]);

    assert.deepEqual(map.get(rated.id), { average: 4.5, count: 2 });
    assert.equal(map.has(bare.id), false);
    assert.equal((await getRatingMap([])).size, 0);
  });
});
