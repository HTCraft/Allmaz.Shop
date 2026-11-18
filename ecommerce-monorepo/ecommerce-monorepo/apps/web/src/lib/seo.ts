import { headers } from 'next/headers';

/**
 * Настройки SEO читаются из переменных окружения на сервере в момент запроса (через process.env['…'],
 * в сборку не вшиваются): их достаточно задать в проекте web на платформе.
 *   SITE_NAME   — название магазина (по умолчанию Allmaz.Shop)
 *   SITE_URL    — публичный адрес сайта, например https://allmaz.shop (без него адрес берётся из заголовков запроса)
 *   SEO_NOINDEX — «true» закрывает сайт от индексации (тестовый стенд, превью, период до запуска)
 */
export function getSiteName(): string {
  return process.env['SITE_NAME']?.trim() || 'Allmaz.Shop';
}

export function isNoIndex(): boolean {
  return process.env['SEO_NOINDEX'] === 'true';
}

export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env['SITE_URL']?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto =
        h.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
        (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // вне контекста запроса — используем адрес по умолчанию
  }
  return 'http://localhost:3000';
}

/** Короткое описание для meta description: без переносов строк, не длиннее ~160 символов, по границе слова */
export function excerpt(text: string | null | undefined, max = 160): string | null {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, '')}…`;
}
