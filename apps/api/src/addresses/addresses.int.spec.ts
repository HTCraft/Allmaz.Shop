import { dbTestsEnabled } from '../../test/setup-env'; // должен быть первым импортом
import { strict as assert } from 'assert';
import { after, beforeEach, describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { createUser, resetDb } from '../../test/db';
import { AddressesService, MAX_ADDRESSES_PER_USER } from './addresses.service';

const suite = dbTestsEnabled ? describe : describe.skip;

const ADDRESS = (n: number) => ({ address: `Москва, ул. Тестовая, ${n}`, phone: '+79990000000' });

suite('AddressesService (нужна тестовая БД)', () => {
  const service = new AddressesService();

  beforeEach(resetDb);
  after(async () => {
    await prisma.$disconnect();
  });

  const defaults = async (userId: string) =>
    prisma.userAddress.findMany({ where: { userId, isDefault: true } });

  it('первый адрес автоматически становится основным', async () => {
    const user = await createUser();

    const first = await service.create(user.id, ADDRESS(1));
    const second = await service.create(user.id, ADDRESS(2));

    assert.equal(first.isDefault, true);
    assert.equal(second.isDefault, false);
  });

  it('новый адрес с isDefault делает основным его, а прежний — обычным; основной всегда один', async () => {
    const user = await createUser();
    await service.create(user.id, ADDRESS(1));
    const second = await service.create(user.id, { ...ADDRESS(2), isDefault: true });

    const found = await defaults(user.id);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.id, second.id);
  });

  it('список: основной адрес первым, дальше новые выше', async () => {
    const user = await createUser();
    const a = await service.create(user.id, ADDRESS(1));
    await new Promise((r) => setTimeout(r, 5));
    const b = await service.create(user.id, ADDRESS(2));
    await new Promise((r) => setTimeout(r, 5));
    const c = await service.create(user.id, ADDRESS(3));

    assert.deepEqual((await service.list(user.id)).map((x) => x.id), [a.id, c.id, b.id]);
  });

  it('смена основного адреса оставляет ровно один основной', async () => {
    const user = await createUser();
    await service.create(user.id, ADDRESS(1));
    const second = await service.create(user.id, ADDRESS(2));

    await service.setDefault(user.id, second.id);

    const found = await defaults(user.id);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.id, second.id);
  });

  it('основной адрес нельзя «снять» напрямую', async () => {
    const user = await createUser();
    const only = await service.create(user.id, ADDRESS(1));

    const updated = await service.update(user.id, only.id, { isDefault: false, label: 'Дом' });

    assert.equal(updated.isDefault, true);
    assert.equal(updated.label, 'Дом');
  });

  it('удаление основного адреса назначает основным самый свежий из оставшихся', async () => {
    const user = await createUser();
    const a = await service.create(user.id, ADDRESS(1)); // основной
    await new Promise((r) => setTimeout(r, 5));
    await service.create(user.id, ADDRESS(2));
    await new Promise((r) => setTimeout(r, 5));
    const c = await service.create(user.id, ADDRESS(3));

    await service.remove(user.id, a.id);

    const found = await defaults(user.id);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.id, c.id);
  });

  it('удаление последнего адреса оставляет пустой список', async () => {
    const user = await createUser();
    const only = await service.create(user.id, ADDRESS(1));

    await service.remove(user.id, only.id);

    assert.equal((await service.list(user.id)).length, 0);
  });

  it(`нельзя сохранить больше ${MAX_ADDRESSES_PER_USER} адресов`, async () => {
    const user = await createUser();
    for (let i = 0; i < MAX_ADDRESSES_PER_USER; i++) await service.create(user.id, ADDRESS(i));

    await assert.rejects(
      () => service.create(user.id, ADDRESS(99)),
      (e: unknown) => e instanceof BadRequestException && /не более/.test(e.message),
    );
  });

  it('чужие адреса недоступны: изменение, смена основного и удаление дают 404', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const address = await service.create(owner.id, ADDRESS(1));

    for (const action of [
      () => service.update(stranger.id, address.id, { address: 'Взлом, 1' }),
      () => service.setDefault(stranger.id, address.id),
      () => service.remove(stranger.id, address.id),
    ]) {
      await assert.rejects(action, (e: unknown) => e instanceof NotFoundException);
    }
    assert.equal((await service.list(owner.id)).length, 1);
    assert.equal((await service.list(stranger.id)).length, 0);
  });

  it('пустая подпись сохраняется как отсутствие подписи; пробелы по краям обрезаются', async () => {
    const user = await createUser();

    const created = await service.create(user.id, {
      label: '   ',
      address: '  Москва, ул. Тестовая, 1  ',
      phone: ' +79990000000 ',
    });

    assert.equal(created.label, null);
    assert.equal(created.address, 'Москва, ул. Тестовая, 1');
    assert.equal(created.phone, '+79990000000');
  });
});
