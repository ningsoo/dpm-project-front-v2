export type BoardCategory = 'SHOWCASE' | 'PLAYLISTS' | 'SPOTLIGHT' | 'COMMUNITY' | 'REVIEWS';

// Swagger 명세 기반 타입 정의
export interface BoardListItem {
  userId: number;
  boardId: number;
  title: string;
  content: string | null;
  nickname: string;
  views: number;
  likes: number;
  /** 댓글 수 (목록/상세 API 응답) */
  countComment?: number;
  createdDateTime: number[]; // [year, month, day, hour, minute, second]
  fileUrl: string | null;
  /** 카테고리 타입 (목록 API 응답) */
  categoryType?: string;
  /** YouTube 링크 (SHOWCASE) */
  linkUrl?: string | null;
  /** 썸네일/이미지 URL (서버에서 내려주는 URL) */
  imageUrl?: string | null;
  /** 이미지 URL 배열 */
  imageUrls?: string[] | null;
  /** 첨부파일 URL */
  attachmentUrl?: string | null;
  /** 좋아요 여부 (상세 조회 시) */
  liked?: boolean;
  /** 작성자 프로필 이미지 URL */
  profileImage?: string | null;
}

/** 페이지네이션된 게시글 목록 API 응답 data 구조 */
export interface PageableBoardResponse {
  content: BoardListItem[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort?: { empty?: boolean; sorted?: boolean; unsorted?: boolean };
  };
  totalPages?: number;
  totalElements?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

/** COMMUNITY/REVIEWS 상세 조회 시 첨부파일 (imageUrls 또는 attachment 중 하나만 존재) */
export interface BoardAttachment {
  /** API 응답이 filekey(소문자)로 올 수 있음 */
  fileKey?: string;
  filekey?: string;
  originalFilename: string;
}

/** PLAYLISTS 상세용 플레이리스트 아이템 */
export interface PlaylistItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  position: number;
}

export interface BoardDetail extends BoardListItem {
  /** 상세 조회 시 서버에서 내려주는 좋아요 여부 */
  liked?: boolean;
  /** COMMUNITY/REVIEWS 첨부파일 (imageUrl 또는 attachment 중 하나만 존재) */
  attachment?: BoardAttachment | null;
  /** 플레이리스트 ID (PLAYLISTS) */
  playlistId?: string | number | null;
  /** 플레이리스트 제목 (PLAYLISTS) */
  playlistTitle?: string | null;
  /** 플레이리스트 영상 목록 (PLAYLISTS) */
  playlistItems?: PlaylistItem[] | null;
}

/** 게시글 좋아요 API 응답 data 필드 */
export interface BoardLikeResponse {
  userId?: number | null;
  boardId?: number | null;
  title?: string | null;
  content?: string | null;
  nickname?: string | null;
  views?: number;
  likes?: number;
  createdDateTime?: number[] | null;
  fileUrl?: string | null;
  liked: boolean;
}

export interface CommentItem {
  commentId?: number | string;
  userId?: number;
  nickname: string;
  likeCount: number;
  toggledLike: boolean;
  content: string;
  createdDateTime: number[] | string; // API: number[] (LocalDateTime)
}

/** 댓글 좋아요 API 응답 data 필드 */
export interface CommentLikeResponse {
  commentId?: number;
  userId?: number;
  nickname?: string;
  content?: string;
  likeCount: number;
  toggledLike: boolean;
  countComment?: number;
  createdDatetime?: string;
  updatedDatetime?: string;
}

export interface CreateBoardRequest {
  title: string;
  content: string;
  category: string;
}

export interface UpdateBoardRequest {
  title: string;
  content: string;
  fileUrl: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}
