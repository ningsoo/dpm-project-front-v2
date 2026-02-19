import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';
import type {
  BoardCategory,
  BoardListItem,
  BoardDetail,
  BoardLikeResponse,
  CommentItem,
  CommentLikeResponse,
  CreateBoardRequest,
  UpdateBoardRequest,
  CreateCommentRequest,
  PageableBoardResponse,
} from './boardTypes';

/**
 * Board API
 * 1. GET  /api/boards/category/[categoryType] - 카테고리 게시글 목록 조회
 * 2. POST /api/boards/category/[categoryType] - 카테고리 내 게시글 작성
 * 3. GET  /api/boards/[boardId] - 게시글 상세 조회
 * 4. PUT  /api/boards/[boardId] - 게시글 수정
 * 5. DELETE /api/boards/[boardId] - 게시글 삭제
 */
export const boardApi = {
  /** 1. 카테고리 게시글 목록 조회 - GET /api/boards/category/[categoryType]?page={page} */
  getBoardByCategory: (categoryType: BoardCategory, page = 0) =>
    fetchClient.get<ApiResponse<PageableBoardResponse>>(
      `/api/boards/category/${categoryType}`,
      { params: { page } }
    ),

  /** 2. 카테고리 내 게시글 작성 - POST /api/boards/category/[categoryType] (JSON) */
  createPost: (categoryType: BoardCategory, body: CreateBoardRequest) =>
    fetchClient.post<ApiResponse<string>>(
      `/api/boards/category/${categoryType}`,
      body
    ),

  /** 2-1. SHOWCASE 게시글 작성 - POST /api/boards/category/SHOWCASE (multipart) */
  createPostShowcase: (formData: FormData) =>
    fetchClient.post<ApiResponse<string>>('/api/boards/category/SHOWCASE', formData),

  /** 2-2. PLAYLISTS 게시글 작성 - POST /api/boards/category/PLAYLISTS (multipart) */
  createPostPlaylists: (formData: FormData) =>
    fetchClient.post<ApiResponse<string>>('/api/boards/category/PLAYLISTS', formData),

  /** 2-3. SPOTLIGHT 게시글 작성 - POST /api/boards/category/SPOTLIGHT (multipart) */
  createPostSpotlight: (formData: FormData) =>
    fetchClient.post<ApiResponse<string>>('/api/boards/category/SPOTLIGHT', formData),

  /** 2-4. COMMUNITY/REVIEWS 게시글 작성 - POST /api/boards/category/{categoryType} (multipart) */
  createPostWithFile: (categoryType: BoardCategory, formData: FormData) =>
    fetchClient.post<ApiResponse<string>>(
      `/api/boards/category/${categoryType}`,
      formData
    ),

  /** 3. 게시글 상세 조회 - GET /api/boards/[boardId] (signal: AbortController 취소용) */
  getPost: (boardId: string, _options?: { signal?: AbortSignal }) =>
    fetchClient.get<ApiResponse<BoardDetail>>(
      `/api/boards/${boardId}`,
    ),

  /** 4. 게시글 수정 - PATCH /api/boards/[boardId] (JSON) */
  updatePost: (boardId: string, body: UpdateBoardRequest) =>
    fetchClient.patch<ApiResponse<string>>(
      `/api/boards/${boardId}`,
      body
    ),

  /** 4-1. SHOWCASE 게시글 수정 - PATCH /api/boards/[boardId] (multipart, data: { title, content, youtubeUrl }) */
  updatePostShowcase: (boardId: string, formData: FormData) =>
    fetchClient.patch<ApiResponse<string>>(`/api/boards/${boardId}`, formData),

  /** 4-2. PLAYLISTS 게시글 수정 - PATCH /api/boards/[boardId] (multipart, data: { title, content, playlistId }) */
  updatePostPlaylists: (boardId: string, formData: FormData) =>
    fetchClient.patch<ApiResponse<string>>(`/api/boards/${boardId}`, formData),

  /** 4-3. SPOTLIGHT 게시글 수정 - PATCH /api/boards/[boardId] (multipart, data: { title, content, deleteAttachmentIds, imageOrder }, files) */
  updatePostSpotlight: (boardId: string, formData: FormData) =>
    fetchClient.patch<ApiResponse<string>>(`/api/boards/${boardId}`, formData),

  /** 4-4. COMMUNITY/REVIEWS 게시글 수정 - PATCH /api/boards/[boardId] (multipart, data: { title, content }, deleteIds, files) */
  updatePostCommunityReviews: (boardId: string, formData: FormData) =>
    fetchClient.patch<ApiResponse<string>>(`/api/boards/${boardId}`, formData),

  /** 5. 게시글 삭제 - DELETE /api/boards/[boardId] */
  deletePost: (boardId: string) =>
    fetchClient.delete<ApiResponse<string>>(
      `/api/boards/${boardId}`
    ),
  
  /** 6. Top 8 카테고리별 월간 인기 게시글 조회 - GET /api/boards/hot/main */
  getHotMainBoard: (categoryType: BoardCategory) =>
    fetchClient.get<ApiResponse<BoardListItem[]>>(`/api/boards/hot/main/${categoryType}`),

  /** 7. 카테고리별 주간 인기 게시글 조회 - GET /api/boards/hot/[categoryType] */
  getHotCategoryBoard: (categoryType: BoardCategory) =>
    fetchClient.get<ApiResponse<BoardListItem[]>>(`/api/boards/hot/${categoryType}`),

  /**
   * 댓글 전체 조회
   * GET /api/boards/{boardId}/comments
   */
  getComments: (boardId: string) =>
    fetchClient.get<ApiResponse<CommentItem[]>>(
      `/api/boards/${boardId}/comments`
    ),

  /**
   * 댓글 등록
   * POST /api/boards/{boardId}/comments
   */
  createComment: (boardId: string, body: CreateCommentRequest) =>
    fetchClient.post<ApiResponse<CommentItem>>(
      `/api/boards/${boardId}/comments`,
      body
    ),

  /**
   * 댓글 삭제
   * DELETE /api/boards/{boardId}/comments/{commentId}
   */
  deleteComment: (boardId: string, commentId: string) =>
    fetchClient.delete<ApiResponse<string>>(
      `/api/boards/${boardId}/comments/${commentId}`
    ),

  /**
   * 댓글 수정
   * PATCH /api/boards/{boardId}/comments/{commentId}
   */
  updateComment: (boardId: string, commentId: string, body: { content: string }) =>
    fetchClient.patch<ApiResponse<unknown>>(
      `/api/boards/${boardId}/comments/${commentId}`,
      body
    ),

  /**
   * 게시글 좋아요
   * POST /api/boards/{boardId}/like
   */
  likePost: (boardId: string) =>
    fetchClient.post<ApiResponse<BoardLikeResponse>>(
      `/api/boards/${boardId}/like`
    ),

  /**
   * 댓글 좋아요
   * POST /api/boards/{boardId}/comments/{commentId}/like
   */
  likeComment: (boardId: string, commentId: string) =>
    fetchClient.post<ApiResponse<CommentLikeResponse>>(
      `/api/boards/${boardId}/comments/${commentId}/like`
    ),
};

export type {
  BoardCategory,
  BoardListItem,
  BoardDetail,
  BoardLikeResponse,
  CommentItem,
  CommentLikeResponse,
};
