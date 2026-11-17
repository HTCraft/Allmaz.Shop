const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type MediaType = 'IMAGE' | 'VIDEO';

export interface ProductMedia {
  id: string;
  type: MediaType;
  url: string;
  alt: string | null;
  position: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  priceCents: number;
  sku: string;
  stock: number;
  category: Category | null;
  media: ProductMedia[];
  /** Есть в ответах каталога и страницы товара; в других списках может отсутствовать */
  rating?: { average: number | null; count: number };
}

export interface ProductListResponse {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductListParams {
  page?: number;
  category?: string;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json();
}

export async function getProducts(
  params: ProductListParams = {},
): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.category) searchParams.set('category', params.category);
  if (params.search) searchParams.set('search', params.search);
  if (params.sort) searchParams.set('sort', params.sort);

  const res = await fetch(`${API_URL}/products?${searchParams.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Не удалось загрузить товары');
  return res.json();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/products/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить товар');
  return res.json();
}

export interface ProductSuggestion {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  image: string | null;
}

export async function suggestProducts(query: string): Promise<ProductSuggestion[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_URL}/products/suggest?q=${encodeURIComponent(query)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
