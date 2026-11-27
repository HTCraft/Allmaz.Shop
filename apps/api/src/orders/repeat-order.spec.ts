import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { repeatQuantity } from './repeat-order';

describe('repeatQuantity', () => {
  it('кладёт столько же, сколько было в заказе, если остатка хватает', () => {
    assert.deepEqual(repeatQuantity(0, 3, 10), { finalQuantity: 3, added: 3 });
  });

  it('суммируется с тем, что уже в корзине', () => {
    assert.deepEqual(repeatQuantity(2, 3, 10), { finalQuantity: 5, added: 3 });
  });

  it('ограничивается остатком на складе', () => {
    assert.deepEqual(repeatQuantity(0, 5, 2), { finalQuantity: 2, added: 2 });
    assert.deepEqual(repeatQuantity(1, 5, 3), { finalQuantity: 3, added: 2 });
  });

  it('если корзина уже на максимуме по остатку, ничего не добавляется', () => {
    assert.deepEqual(repeatQuantity(3, 2, 3), { finalQuantity: 3, added: 0 });
  });

  it('при нулевом или отрицательном остатке добавлять нечего', () => {
    assert.equal(repeatQuantity(0, 2, 0).added, 0);
    assert.equal(repeatQuantity(0, 2, -4).finalQuantity, 0);
  });
});
