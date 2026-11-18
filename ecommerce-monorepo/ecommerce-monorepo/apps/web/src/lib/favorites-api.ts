const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message ?? 'Произошла ошибка';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}

export const favoritesApi = {
  list: () => request('/favorites'),
  listIds: () => request<string[]>('/favorites/ids'),
  add: (productId: string) => request(`/favorites/${productId}`, { method: 'POST' }),
  remove: (productId: string) => request(`/favorites/${productId}`, { method: 'DELETE' }),
};
