const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    priceCents: number;
    stock: number;
    image: string | null;
  };
  subtotalCents: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalCents: number;
  totalItems: number;
}

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

export const cartApi = {
  get: () => request<Cart>('/cart'),

  addItem: (productId: string, quantity = 1) =>
    request<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: (productId: string, quantity: number) =>
    request<Cart>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (productId: string) =>
    request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }),

  clear: () => request<Cart>('/cart', { method: 'DELETE' }),
};
