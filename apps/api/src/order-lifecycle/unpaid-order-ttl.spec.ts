import { strict as assert } from 'assert';
import { afterEach, describe, it } from 'node:test';
import { unpaidOrderTtlMs } from './unpaid-order-ttl';

const KEY = 'UNPAID_ORDER_TTL_MINUTES';
const original = process.env[KEY];

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

const minutes = () => unpaidOrderTtlMs() / 60_000;

describe('unpaidOrderTtlMs', () => {
  it('по умолчанию — 120 минут', () => {
    delete process.env[KEY];
    assert.equal(minutes(), 120);
  });

  it('берёт значение из переменной окружения', () => {
    process.env[KEY] = '30';
    assert.equal(minutes(), 30);
  });

  it('не опускается ниже 5 минут', () => {
    process.env[KEY] = '1';
    assert.equal(minutes(), 5);
  });

  it('мусор и неположительные значения заменяются значением по умолчанию', () => {
    for (const bad of ['abc', '', '0', '-15']) {
      process.env[KEY] = bad;
      assert.equal(minutes(), 120, `значение «${bad}»`);
    }
  });
});
