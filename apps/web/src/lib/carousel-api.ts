import { getApiUrl } from './api-url';
const API_URL = getApiUrl();

export interface CarouselSettings {
  autoplay: boolean;
  intervalMs: number;
  showIndicators: boolean;
  showControls: boolean;
}

export interface CarouselSlideData {
  id: string;
  position: number;
  product: {
    id: string;
    title: string;
    slug: string;
    priceCents: number;
    image: string | null;
  };
}

export interface CarouselData {
  settings: CarouselSettings;
  slides: CarouselSlideData[];
}

export async function getCarousel(): Promise<CarouselData> {
  const res = await fetch(`${API_URL}/carousel`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить карусель');
  return res.json();
}
