/**
 * Кладёт адрес API в <head> страницы (window.__ENV) — браузер получает его с сервера при каждом запросе,
 * поэтому пересборка при смене адреса не нужна. Подключается первым элементом <head> каждого корневого layout.
 */
export default function RuntimeEnv() {
  const apiUrl = process.env['API_URL'] || process.env.NEXT_PUBLIC_API_URL || '';
  const payload = JSON.stringify({ API_URL: apiUrl }).replace(/</g, '\\u003c');
  return <script dangerouslySetInnerHTML={{ __html: `window.__ENV=${payload};` }} />;
}
