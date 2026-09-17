import type { CSSProperties } from 'react';

interface MediaLike {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string | null;
}

export default function MediaThumbnail({
  media,
  alt,
  className,
  style,
}: {
  media?: MediaLike[] | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const first = media?.[0];

  if (!first) {
    return (
      <img
        src="https://via.placeholder.com/400x400?text=No+Image"
        alt={alt}
        className={className}
        style={style}
      />
    );
  }

  if (first.type === 'VIDEO') {
    // preload="metadata" обычно достаточно, чтобы браузер показал первый кадр
    // как статичное превью, даже без autoplay
    return (
      <video src={first.url} muted playsInline preload="metadata" className={className} style={style} />
    );
  }

  return <img src={first.url} alt={first.alt ?? alt} className={className} style={style} />;
}
