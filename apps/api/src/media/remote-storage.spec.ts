import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { isRemoteUrl } from './remote-storage';

describe('isRemoteUrl', () => {
  it('узнаёт ссылки хранилища RelaxDev', () => {
    assert.equal(isRemoteUrl('https://cdn.relaxdev.ru/users/1/shop/products/a.webp'), true);
    assert.equal(isRemoteUrl('https://files.relaxdev.ru/a.webp'), true);
  });

  it('локальные пути и чужие ссылки — не хранилище', () => {
    assert.equal(isRemoteUrl('/uploads/a.jpg'), false);
    assert.equal(isRemoteUrl('https://example.com/a.jpg'), false);
    assert.equal(isRemoteUrl('not a url'), false);
  });

  it('поддомен-подделка не считается хранилищем', () => {
    assert.equal(isRemoteUrl('https://cdn.relaxdev.ru.evil.com/a.jpg'), false);
    assert.equal(isRemoteUrl('https://evilcdn.relaxdev.ru/a.jpg'), false);
  });
});
