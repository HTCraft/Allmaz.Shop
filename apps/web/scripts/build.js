/**
 * Сборка Next.js с принудительным NODE_ENV=production.
 * Хостинг подставляет в сборку своё (нестандартное) значение NODE_ENV, и Next.js при нём падает
 * на странице /404 с ошибкой «<Html> should not be imported outside of pages/_document».
 * Скрипт работает одинаково в Windows, Linux и Docker, поэтому не зависит от Dockerfile и платформы.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

process.exit(result.status === null ? 1 : result.status);
