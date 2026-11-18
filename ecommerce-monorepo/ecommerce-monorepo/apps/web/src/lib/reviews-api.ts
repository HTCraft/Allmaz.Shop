const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ProductRating {
  average: number | null;
  count: number;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  author: string;
  createdAt: string;
}

export interface ReviewsSummary extends ProductRating {
  distribution: Record<number, number>;
}

export interface ReviewsResponse {
  items: Review[];
  summary: ReviewsSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface MyReview {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message ?? 'Произошла ошибка';
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }
  return data as T;
}

export const reviewsApi = {
  list: (slug: string, page = 1) =>
    request<ReviewsResponse>(`/products/${encodeURIComponent(slug)}/reviews?page=${page}`),

  /** 401, если пользователь не авторизован */
  mine: (slug: string) =>
    request<{ review: MyReview | null }>(`/products/${encodeURIComponent(slug)}/reviews/mine`),

  create: (slug: string, data: { rating: number; text: string }) =>
    request<{ review: MyReview }>(`/products/${encodeURIComponent(slug)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeMine: (slug: string) =>
    request(`/products/${encodeURIComponent(slug)}/reviews/mine`, { method: 'DELETE' }),
};
