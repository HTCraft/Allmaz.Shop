/**
 * Подключается ПЕРВОЙ строкой в каждом тесте с БД (до импорта @ecommerce/database):
 *  1. подгружает корневой .env (переменные, уже заданные в окружении, не перезаписываются — так CI главнее файла);
 *  2. переключает DATABASE_URL на TEST_DATABASE_URL, чтобы тесты никогда не трогали рабочую базу;
 *  3. отказывается работать, если в имени тестовой БД нет «test».
 * Без TEST_DATABASE_URL тесты с БД пропускаются, а DATABASE_URL заменяется заглушкой —
 * случайный запрос к рабочей базе в этом режиме невозможен.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export const ROOT_DIR = resolve(__dirname, '..', '..', '..', '..');

export function loadRootEnv(): void {
  for (const path of [resolve(ROOT_DIR, '.env'), resolve(process.cwd(), '../../.env')]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || line.trimStart().startsWith('#')) continue;
      const key = match[1] as string;
      let value = match[2] as string;
      if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return;
  }
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

loadRootEnv();

const testUrl = process.env['TEST_DATABASE_URL']?.trim();

if (testUrl) {
  if (!/test/i.test(databaseName(testUrl))) {
    throw new Error(
      `TEST_DATABASE_URL указывает на БД «${databaseName(testUrl)}»: в имени тестовой базы должно быть «test» ` +
        '(защита от очистки рабочей БД).',
    );
  }
  process.env['DATABASE_URL'] = testUrl;
} else {
  process.env['DATABASE_URL'] = 'postgresql://tests-disabled:tests-disabled@127.0.0.1:1/tests-disabled';
}

/** true, если задана тестовая БД и интеграционные тесты можно запускать */
export const dbTestsEnabled = Boolean(testUrl);
