/**
 * Адрес API читается во время работы, а не при сборке.
 * Раньше он вшивался в код через NEXT_PUBLIC_API_URL, но на хостингах, которые не передают переменные
 * в Docker-сборку, сайт собирался с адресом по умолчанию (localhost:4000) и не мог достучаться до API.
 *
 *  • сервер (SSR, sitemap): переменная окружения API_URL, затем NEXT_PUBLIC_API_URL;
 *  • браузер: значение, которое сервер кладёт в <head> страницы как window.__ENV.API_URL
 *    (компонент RuntimeEnv), затем NEXT_PUBLIC_API_URL.
 */
declare global {
  interface Window {
    __ENV?: { API_URL?: string };
  }
}

const FALLBACK = 'http://localhost:4000';

export function getApiUrl(): string {
  const url =
    typeof window !== 'undefined'
      ? window.__ENV?.API_URL
      : process.env['API_URL'];
  return (url || process.env.NEXT_PUBLIC_API_URL || FALLBACK).replace(/\/+$/, '');
}
