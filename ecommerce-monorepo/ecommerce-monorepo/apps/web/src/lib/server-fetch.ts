import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * fetch для Server Components/Route Handlers, который пробрасывает
 * httpOnly cookie пользователя дальше в Nest.js API (обычный fetch на
 * сервере Next.js не имеет доступа к cookie браузера автоматически).
 */
export async function serverFetch(path: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      ...options.headers,
    },
    cache: 'no-store',
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get('access_token'));
}
