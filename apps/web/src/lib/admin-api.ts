import type { OrderStatus, OrderItemData } from './orders-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  shippingAddress: string;
  phone: string;
  comment: string | null;
  totalCents: number;
  items: OrderItemData[];
  user: { id: string; email: string; name: string | null };
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

/** Отдельная функция для multipart-загрузки — нельзя ставить Content-Type вручную,
 *  браузер сам подставит правильный boundary для multipart/form-data */
async function uploadFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message ?? 'Произошла ошибка загрузки';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}

export interface AdminProductMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  filename: string | null;
  position: number;
}

export interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  priceCents: number;
  sku: string;
  stock: number;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  media: AdminProductMedia[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AdminStats {
  productsCount: number;
  categoriesCount: number;
  usersCount: number;
  outOfStockCount: number;
  pendingOrdersCount: number;
}

export interface ProductFormInput {
  title: string;
  slug?: string;
  description?: string;
  priceCents: number;
  sku: string;
  stock: number;
  categoryId?: string;
  images?: string[];
}

export interface AdminCarouselSettings {
  autoplay: boolean;
  intervalMs: number;
  showIndicators: boolean;
  showControls: boolean;
}

export interface AdminCarouselSlide {
  id: string;
  position: number;
  active: boolean;
  productId: string;
  product: {
    id: string;
    title: string;
    media: { url: string }[];
  };
}

export const adminApi = {
  getStats: () => request<AdminStats>('/admin/stats'),

  // Товары
  listProducts: () => request<AdminProduct[]>('/admin/products'),
  getProduct: (id: string) => request<AdminProduct>(`/admin/products/${id}`),
  createProduct: (data: ProductFormInput) =>
    request<AdminProduct>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<ProductFormInput>) =>
    request<AdminProduct>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    request(`/admin/products/${id}`, { method: 'DELETE' }),

  uploadProductMedia: (productId: string, file: File) =>
    uploadFile<AdminProductMedia>(`/admin/products/${productId}/media`, file),

  deleteProductMedia: (productId: string, mediaId: string) =>
    request(`/admin/products/${productId}/media/${mediaId}`, { method: 'DELETE' }),

  // Категории
  listCategories: () => request<AdminCategory[]>('/admin/categories'),
  createCategory: (data: { name: string; slug?: string }) =>
    request<AdminCategory>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: { name?: string; slug?: string }) =>
    request<AdminCategory>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request(`/admin/categories/${id}`, { method: 'DELETE' }),

  // Пользователи
  listUsers: () => request<AdminUser[]>('/admin/users'),
  updateUserRole: (id: string, role: 'USER' | 'ADMIN') =>
    request<AdminUser>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Карусель
  getCarouselSettings: () => request<AdminCarouselSettings>('/admin/carousel/settings'),
  updateCarouselSettings: (data: Partial<AdminCarouselSettings>) =>
    request<AdminCarouselSettings>('/admin/carousel/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listCarouselSlides: () => request<AdminCarouselSlide[]>('/admin/carousel/slides'),
  createCarouselSlide: (data: { productId: string; position?: number; active?: boolean }) =>
    request<AdminCarouselSlide>('/admin/carousel/slides', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCarouselSlide: (id: string, data: { position?: number; active?: boolean }) =>
    request<AdminCarouselSlide>(`/admin/carousel/slides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCarouselSlide: (id: string) =>
    request(`/admin/carousel/slides/${id}`, { method: 'DELETE' }),

  // Заказы
  listOrders: () => request<AdminOrder[]>('/admin/orders'),
  getOrder: (id: string) => request<AdminOrder>(`/admin/orders/${id}`),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<AdminOrder>(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parsePriceInput(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100);
}
