import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Ищет корневой .env монорепозитория, перебирая несколько вероятных
 * расположений — поведение process.cwd() при запуске через
 * `npm run ... --workspace=...` не всегда предсказуемо одинаково
 * на разных ОС/версиях npm, поэтому вместо одного "угаданного" пути
 * пробуем несколько и берём первый существующий.
 */
export function resolveRootEnvPath(): string | undefined {
  const candidates = [
    join(process.cwd(), '..', '..', '.env'), // если cwd == apps/api
    join(process.cwd(), '.env'), // если cwd уже == корень репозитория
    join(__dirname, '..', '..', '..', '.env'), // от src или dist до корня
    resolve(process.cwd(), '../../../.env'), // на случай если cwd глубже, чем ожидалось
  ];

  const found = candidates.find((p) => existsSync(p));

  console.log('[env] Ищем корневой .env, кандидаты:');
  for (const c of candidates) {
    console.log(`  ${existsSync(c) ? '✓ найден' : '  нет   '} — ${c}`);
  }

  return found;
}
