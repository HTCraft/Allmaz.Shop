const API_PORT = process.env.API_PORT ?? 4000;
const API_ORIGIN = `http://localhost:${API_PORT}`;

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
