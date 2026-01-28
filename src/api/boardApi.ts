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
 * Swagger 명세 기반 Board API
 * 모든 API는 /api/boards 경로를 사용합니다.
 */
export const boardApi = {
  /**
   * 게시글 목록 조회
   * GET /api/boards/{categoryType}
   * 
   * @param categoryType - SHOWCASE, PLAYLISTS, COMMUNITY, SPOTLIGHT, REVIEWS
   * @returns BoardListItem[]
   */
  getBoardByCategory: (categoryType: BoardCategory) =>
    fetchClient.get<BoardListItem[]>(`/boards/${categoryType}`),

  /**
   * 게시글 작성 (로그인 필요)
   * POST /api/boards/{categoryType}
   * 
   * @param categoryType - SHOWCASE, PLAYLISTS, COMMUNITY, SPOTLIGHT, REVIEWS
   * @param body - { title: string, content: string, category: string }
   * @returns ApiResponse<string>
   */
  createPost: (categoryType: BoardCategory, body: CreateBoardRequest) =>
    fetchClient.post<ApiResponse<string>>(`/boards/${categoryType}`, body),

  /**
   * 게시글 상세 조회
   * GET /api/boards/{boardId}
   * 
   * @param boardId - 게시글 ID
   * @returns BoardDetail
   */
  getPost: (boardId: string) =>
    fetchClient.get<BoardDetail>(`/boards/${boardId}`),

  /**
   * 게시글 삭제 (작성자 본인)
   * DELETE /api/boards/{boardId}
   * 
   * @param boardId - 게시글 ID
   * @returns ApiResponse<string>
   */
  deletePost: (boardId: string) =>
    fetchClient.delete<ApiResponse<string>>(`/boards/${boardId}`),

  /**
   * 게시글 수정 (작성자 본인)
   * PATCH /api/boards/{boardId}
   * 
   * @param boardId - 게시글 ID
   * @param body - { title: string, content: string, fileUrl: string }
   * @returns ApiResponse<string>
   */
  updatePost: (boardId: string, body: UpdateBoardRequest) =>
    fetchClient.patch<ApiResponse<string>>(`/boards/${boardId}`, body),

  /**
   * 댓글 전체 조회
   * GET /api/boards/{boardId}/comments
   * 
   * @param boardId - 게시글 ID
   * @returns CommentItem[]
   */
  getComments: (boardId: string) =>
    fetchClient.get<CommentItem[]>(`/boards/${boardId}/comments`),

  /**
   * 댓글 등록 (로그인 필요)
   * POST /api/boards/{boardId}/comments
   * 
   * @param boardId - 게시글 ID
   * @param body - { content: string }
   * @returns CommentItem
   */
  createComment: (boardId: string, body: CreateCommentRequest) =>
    fetchClient.post<CommentItem>(`/boards/${boardId}/comments`, body),

  /**
   * 댓글 삭제 (작성자 본인)
   * DELETE /api/boards/{boardId}/comments/{commentId}
   * 
   * @param boardId - 게시글 ID
   * @param commentId - 댓글 ID
   * @returns ApiResponse<string>
   */
  deleteComment: (boardId: string, commentId: string) =>
    fetchClient.delete<ApiResponse<string>>(`/boards/${boardId}/comments/${commentId}`),
};

export type { BoardCategory, BoardListItem, BoardDetail, CommentItem };
