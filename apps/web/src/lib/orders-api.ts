const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface OrderItemData {
  id: string;
  productId: string;
  productTitle: string;
  productSku: string;
  quantity: number;
  priceCents: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  status: OrderStatus;
  shippingAddress: string;
  phone: string;
  comment: string | null;
  totalCents: number;
  items: OrderItemData[];
  createdAt: string;
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

export const ordersApi = {
  create: (data: { shippingAddress: string; phone: string; comment?: string }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<Order[]>('/orders'),

  get: (id: string) => request<Order>(`/orders/${id}`),
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Ожидает обработки',
  PAID: 'Оплачен',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: 'text-bg-warning',
  PAID: 'text-bg-info',
  SHIPPED: 'text-bg-primary',
  DELIVERED: 'text-bg-success',
  CANCELLED: 'text-bg-danger',
};
