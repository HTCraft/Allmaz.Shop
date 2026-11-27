const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface SavedAddress {
  id: string;
  label: string | null;
  address: string;
  phone: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressInput {
  label?: string;
  address: string;
  phone: string;
  isDefault?: boolean;
}

export const MAX_SAVED_ADDRESSES = 10;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message ?? 'Произошла ошибка';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}

export const addressesApi = {
  list: () => request<SavedAddress[]>('/addresses'),
  create: (data: AddressInput) =>
    request<SavedAddress>('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AddressInput>) =>
    request<SavedAddress>(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setDefault: (id: string) => request<SavedAddress>(`/addresses/${id}/default`, { method: 'POST' }),
  remove: (id: string) => request(`/addresses/${id}`, { method: 'DELETE' }),
};
