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
}

export interface BoardDetail extends BoardListItem {
  /** 상세 조회 시 서버에서 내려주는 좋아요 여부 */
  isliked?: boolean;
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
  isliked: boolean;
}

export interface CommentItem {
  commentId?: number | string;
  userId?: number;
  nickname: string;
  content: string;
  createdDateTime: number[] | string; // API: number[] (LocalDateTime)
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
