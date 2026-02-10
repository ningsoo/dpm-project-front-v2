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
    fetchClient.post<ApiResponse<string>>('/boards/category/PLAYLISTS', formData),

  /** 2-3. SPOTLIGHT 게시글 작성 - POST /api/boards/category/SPOTLIGHT (multipart) */
  createPostSpotlight: (formData: FormData) =>
    fetchClient.post<ApiResponse<string>>('/boards/category/SPOTLIGHT', formData),

  /** 2-4. COMMUNITY/REVIEWS 게시글 작성 - POST /api/boards/category/{categoryType} (multipart) */
  createPostWithFile: (categoryType: BoardCategory, formData: FormData) =>
    fetchClient.post<ApiResponse<string>>(
      `/boards/category/${categoryType}`,
      formData
    ),

  /** 3. 게시글 상세 조회 - GET /api/boards/[boardId] (signal: AbortController 취소용) */
  getPost: (boardId: string, options?: { signal?: AbortSignal }) =>
    fetchClient.get<ApiResponse<BoardDetail>>(
      `/api/boards/${boardId}`,
    ),

  /** 4. 게시글 수정 - PUT /api/boards/[boardId] */
  updatePost: (boardId: string, body: UpdateBoardRequest) =>
    fetchClient.patch<ApiResponse<string>>(
      `/api/boards/${boardId}`,
      body
    ),

  /** 5. 게시글 삭제 - DELETE /api/boards/[boardId] */
  deletePost: (boardId: string) =>
    fetchClient.delete<ApiResponse<string>>(
      `/api/boards/${boardId}`
    ),

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
