const API_PORT = process.env['API_PORT'] ?? 4000;
// В production задайте API_PUBLIC_URL (например, https://api.allmaz.shop) —
// публичный адрес API, по которому браузер сможет получить загруженные файлы
const API_ORIGIN = (process.env['API_PUBLIC_URL'] ?? `http://localhost:${API_PORT}`).replace(/\/$/, '');

/**
 * Превращает относительный путь загруженного файла ("/uploads/xxx.jpg") в
 * полный URL, по которому его отдаёт статика Express. Внешние ссылки
 * (http:// или https://), вставленные вручную в форме товара, возвращает как есть.
 */
export function resolveMediaUrl(media: { url: string }): string {
  if (/^https?:\/\//.test(media.url)) {
    return media.url;
  }
  return `${API_ORIGIN}${media.url}`;
}
