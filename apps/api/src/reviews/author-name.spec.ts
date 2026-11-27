import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { authorName } from './author-name';

describe('authorName', () => {
  it('показывает имя, если оно есть', () => {
    assert.equal(authorName({ name: '  Анна  ', email: 'anna@example.com' }), 'Анна');
  });

  it('без имени маскирует email, не раскрывая адрес', () => {
    const shown = authorName({ name: null, email: 'ivanov@example.com' });
    assert.equal(shown, 'iv***');
    assert.ok(!shown.includes('@') && !shown.includes('example'));
  });

  it('пустое имя из пробелов считается отсутствующим', () => {
    assert.equal(authorName({ name: '   ', email: 'ivanov@example.com' }), 'iv***');
  });

  it('короткая локальная часть email не ломает маску', () => {
    assert.equal(authorName({ name: null, email: 'a@example.com' }), 'a***');
  });
});
