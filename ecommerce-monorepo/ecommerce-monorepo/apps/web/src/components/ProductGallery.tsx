'use client';

import { useState } from 'react';

interface GalleryMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt: string | null;
}

export default function ProductGallery({
  media,
  title,
}: {
  media: GalleryMedia[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];

  if (!active) {
    return (
      <img
        src="https://via.placeholder.com/600x600?text=No+Image"
        alt={title}
        className="img-fluid rounded shadow-sm mb-3"
        style={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%' }}
      />
    );
  }

  return (
    <div>
      {active.type === 'VIDEO' ? (
        <video
          key={active.id}
          src={active.url}
          controls
          className="rounded shadow-sm mb-3"
          style={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%', background: '#000' }}
        />
      ) : (
        <img
          key={active.id}
          src={active.url}
          alt={active.alt ?? title}
          className="img-fluid rounded shadow-sm mb-3"
          style={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%' }}
        />
      )}

      {media.length > 1 && (
        <div className="d-flex gap-2 flex-wrap">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="p-0 border-0 bg-transparent position-relative"
              style={{
                width: 80,
                height: 80,
                borderRadius: 6,
                overflow: 'hidden',
                outline: index === activeIndex ? '2px solid var(--bs-primary)' : 'none',
              }}
            >
              {item.type === 'VIDEO' ? (
                <>
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    className="position-absolute top-50 start-50 translate-middle text-white"
                    style={{ textShadow: '0 0 4px rgba(0,0,0,.8)' }}
                  >
                    ▶
                  </span>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt ?? title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
