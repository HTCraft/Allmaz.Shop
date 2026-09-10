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
  images: { id: string; url: string; position: number }[];
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
};

export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parsePriceInput(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100);
}
