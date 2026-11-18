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
export type PaymentMethod = 'COD' | 'CARD';

export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentId: string | null;
  shippingAddress: string;
  phone: string;
  comment: string | null;
  totalCents: number;
  discountCents: number;
  items: OrderItemData[];
  /** Для неоплаченного заказа с онлайн-оплатой — срок, после которого он отменяется автоматически */
  paymentDeadline: string | null;
  createdAt: string;
}

interface CreateOrderResponse extends Order {
  paymentUrl: string | null;
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
  create: (data: {
    shippingAddress: string;
    phone: string;
    comment?: string;
    paymentMethod?: PaymentMethod;
    promoCode?: string;
  }) =>
    request<CreateOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<Order[]>('/orders'),

  get: (id: string) => request<Order>(`/orders/${id}`),

  /** (Пере)создать платёж ЮKassa для уже существующего заказа */
  pay: (id: string) => request<{ paymentUrl: string | null }>(`/orders/${id}/pay`, { method: 'POST' }),

  /** Активно спросить у бэкенда актуальный статус оплаты (сверяется с ЮKassa) */
  checkPaymentStatus: (id: string) =>
    request<Order>(`/orders/${id}/payment-status`, { method: 'POST' }),
};

export interface PromoValidation {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export const promoApi = {
  validate: (code: string) =>
    request<PromoValidation>('/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Оплата при получении',
  CARD: 'Картой онлайн (ЮKassa)',
};
