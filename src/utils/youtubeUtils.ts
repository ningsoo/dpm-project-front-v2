/**
 * YouTube URL에서 videoId 추출
 * @param url - YouTube URL (예: https://www.youtube.com/watch?v=Wls5uDJfMTM, https://youtu.be/Wls5uDJfMTM)
 * @returns videoId 또는 빈 문자열
 */
export function extractYouTubeVideoId(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // youtube.com/watch?v=, youtu.be/, youtube.com/embed/
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/
  );
  return match ? match[1] : '';
}

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  mute?: boolean;
}

/**
 * YouTube videoId로 embed URL 생성
 * @param videoId - YouTube video ID
 * @param options - autoplay, mute (브라우저 autoplay 정책 대응용)
 */
export function getYouTubeEmbedUrl(
  videoId?: string | null,
  options?: YouTubeEmbedOptions
): string {
  if (!videoId || typeof videoId !== 'string') return '';
  const trimmed = videoId.trim();
  if (!trimmed) return '';
  const base = `https://www.youtube.com/embed/${trimmed}`;
  if (options?.autoplay) {
    const params = new URLSearchParams({ autoplay: '1', mute: options.mute !== false ? '1' : '0' });
    return `${base}?${params.toString()}`;
  }
  return base;
}

/**
 * YouTube videoId로 썸네일 URL 생성
 * @param videoId - YouTube video ID
 * @param quality - hqdefault(기본) | mqdefault | sddefault | maxresdefault
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
