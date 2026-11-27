/**
 * Запуск всех тестов: `npm test` (из корня или из apps/api).
 *  1. Если задана TEST_DATABASE_URL — накатывает миграции на тестовую БД.
 *  2. Находит скомпилированные *.spec.js и запускает их встроенным раннером Node (`node --test`).
 * Необязательный аргумент — часть имени файла: `npm test -- orders`.
 */
import { spawnSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT_DIR, dbTestsEnabled } from './setup-env';

function collectSpecs(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collectSpecs(full));
    else if (entry.endsWith('.spec.js')) files.push(full);
  }
  return files;
}

if (dbTestsEnabled) {
  console.log('[test] Применяю миграции к тестовой БД...');
  const migrate = spawnSync('npm', ['run', 'migrate:deploy', '-w', 'packages/database'], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });
  if (migrate.status !== 0) {
    console.error('[test] Не удалось применить миграции к тестовой БД');
    process.exit(migrate.status ?? 1);
  }
} else {
  console.log(
    '[test] TEST_DATABASE_URL не задан — тесты с БД (*.int.spec) будут пропущены. ' +
      'Как включить: docs/TESTING.md',
  );
}

const filter = process.argv[2];
const specs = collectSpecs(resolve(__dirname, '..', 'src')).filter((f) => !filter || f.includes(filter));
if (specs.length === 0) {
  console.error('[test] Тестовые файлы не найдены');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...specs], { env: process.env, stdio: 'inherit' });
process.exit(result.status ?? 1);
