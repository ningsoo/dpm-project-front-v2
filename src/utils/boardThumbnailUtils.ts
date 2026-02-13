import type { BoardListItem, PageableBoardResponse } from '@/api/boardTypes';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from './youtubeUtils';

/**
 * API 응답에서 게시글 목록 추출
 * data.content (페이지네이션) 또는 data (배열 직접) 지원
 */
export function extractBoardListFromResponse(
  data: { data?: PageableBoardResponse | BoardListItem[] } | null
): BoardListItem[] {
  if (!data?.data) return [];
  const d = data.data;
  if (Array.isArray(d)) return d;
  const content = (d as PageableBoardResponse).content;
  return Array.isArray(content) ? content : [];
}

/**
 * API 응답에서 페이지네이션 정보 추출
 * @returns { content, last } - last: 마지막 페이지 여부
 */
export function extractPageableInfoFromResponse(
  data: { data?: PageableBoardResponse | BoardListItem[] } | null
): { content: BoardListItem[]; last: boolean } {
  const content = extractBoardListFromResponse(data);
  if (!data?.data || Array.isArray(data.data)) {
    return { content, last: true };
  }
  const d = data.data as PageableBoardResponse;
  const last = d.last === true;
  return { content, last };
}

export type BoardCategorySlug =
  | 'showcase'
  | 'playlists'
  | 'spotlight'
  | 'community'
  | 'reviews';

const PLACEHOLDER = '/placeholder-playlist.png';

/**
 * 카테고리별 게시글 썸네일 URL 반환
 * - SHOWCASE: imageUrl/linkUrl에서 YouTube videoId 추출 → hqdefault.jpg
 * - PLAYLISTS: imageUrl 그대로 (서버에서 썸네일 URL 내려옴)
 * - SPOTLIGHT: imageUrl 그대로 (jpg, png 등 이미지)
 * - 그 외: fileUrl 또는 placeholder
 */
export function getBoardThumbnailUrl(
  item: BoardListItem,
  category: BoardCategorySlug
): string {
  const imageUrl = item.imageUrl ?? null;
  const linkUrl = item.linkUrl ?? null;
  const fileUrl = item.fileUrl ?? null;

  switch (category) {
    case 'showcase': {
      // imageUrl 또는 linkUrl에서 YouTube URL 확인
      const ytUrl = imageUrl || linkUrl;
      const videoId = extractYouTubeVideoId(ytUrl);
      if (videoId) {
        return getYouTubeThumbnailUrl(videoId, 'hqdefault');
      }
      // fallback: fileUrl (구 API 호환)
      if (fileUrl) return fileUrl;
      return PLACEHOLDER;
    }
    case 'playlists': {
      // imageUrl에 썸네일 URL이 이미 내려옴
      if (imageUrl) return imageUrl;
      if (fileUrl) return fileUrl;
      return PLACEHOLDER;
    }
    case 'spotlight': {
      // imageUrl에 jpg, png 등 이미지 파일 URL
      if (imageUrl) return imageUrl;
      if (fileUrl) return fileUrl;
      return PLACEHOLDER;
    }
    default: {
      // community, reviews - 기존 fileUrl 로직
      if (fileUrl) return fileUrl;
      return PLACEHOLDER;
    }
  }
}

/**
 * SHOWCASE용: YouTube videoId 추출 (hover 자동재생용)
 * imageUrl 또는 linkUrl에서 추출
 */
export function getShowcaseVideoId(item: BoardListItem): string {
  const ytUrl = item.imageUrl ?? item.linkUrl ?? item.fileUrl ?? null;
  return extractYouTubeVideoId(ytUrl);
}
