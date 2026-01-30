import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';
import type {
  BoardCategory,
  BoardListItem,
  BoardDetail,
  CommentItem,
  CreateBoardRequest,
  UpdateBoardRequest,
  CreateCommentRequest,
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
  /** 1. 카테고리 게시글 목록 조회 - GET /api/boards/category/[categoryType] */
  getBoardByCategory: (categoryType: BoardCategory) =>
    fetchClient.get<ApiResponse<BoardListItem[]>>(
      `/boards/category/${categoryType}`
    ),

  /** 2. 카테고리 내 게시글 작성 - POST /api/boards/category/[categoryType] */
  createPost: (categoryType: BoardCategory, body: CreateBoardRequest) =>
    fetchClient.post<ApiResponse<string>>(
      `/boards/category/${categoryType}`,
      body
    ),

  /** 3. 게시글 상세 조회 - GET /api/boards/[boardId] */
  getPost: (boardId: string) =>
    fetchClient.get<ApiResponse<BoardDetail>>(
      `/boards/${boardId}`
    ),

  /** 4. 게시글 수정 - PUT /api/boards/[boardId] */
  updatePost: (boardId: string, body: UpdateBoardRequest) =>
    fetchClient.patch<ApiResponse<string>>(
      `/boards/${boardId}`,
      body
    ),

  /** 5. 게시글 삭제 - DELETE /api/boards/[boardId] */
  deletePost: (boardId: string) =>
    fetchClient.delete<ApiResponse<string>>(
      `/boards/${boardId}`
    ),

  /**
   * 댓글 전체 조회
   * GET /api/boards/{boardId}/comments
   */
  getComments: (boardId: string) =>
    fetchClient.get<ApiResponse<CommentItem[]>>(
      `/boards/${boardId}/comments`
    ),

  /**
   * 댓글 등록
   * POST /api/boards/{boardId}/comments
   */
  createComment: (boardId: string, body: CreateCommentRequest) =>
    fetchClient.post<ApiResponse<CommentItem>>(
      `/boards/${boardId}/comments`,
      body
    ),

  /**
   * 댓글 삭제
   * DELETE /api/boards/{boardId}/comments/{commentId}
   */
  deleteComment: (boardId: string, commentId: string) =>
    fetchClient.delete<ApiResponse<string>>(
      `/boards/${boardId}/comments/${commentId}`
    ),
};

export type {
  BoardCategory,
  BoardListItem,
  BoardDetail,
  CommentItem,
};
