import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';
import type { BoardCategory } from './boardTypes';
import { mockBoardData } from './mockBoardData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

function wrapMock<T>(data: ApiResponse<T>) {
  return Promise.resolve({ data }) as Promise<{ data: ApiResponse<T> }>;
}

async function withMock<T>(real: () => Promise<T>, fallback: () => Promise<T> | T) {
  if (USE_MOCK) return Promise.resolve(fallback());
  try {
    return await real();
  } catch (error) {
    console.warn('[boardApi] falling back to mock data', error);
    return Promise.resolve(fallback());
  }
}

export const boardApi = {
  getBoards: () =>
    withMock(
      () => fetchClient.get<ApiResponse<{ spotlights: unknown[] }>>('/boards'),
      () => wrapMock(mockBoardData.getBoards())
    ),

  getBoardByCategory: (category: BoardCategory, params?: { page?: number; search?: string }) =>
    withMock(
      () => fetchClient.get<ApiResponse<{ posts: unknown[]; total: number }>>(`/boards/${category}`, { params }),
      () => wrapMock(mockBoardData.getBoardByCategory(category, params))
    ),

  createPost: (category: BoardCategory, body: Record<string, unknown>) =>
    withMock(
      () => fetchClient.post<ApiResponse<{ boardId: string }>>(`/boards/${category}`, body),
      () => wrapMock(mockBoardData.createPost(category, body))
    ),

  getPost: (category: BoardCategory, boardId: string) =>
    withMock(
      () => fetchClient.get<ApiResponse<unknown>>(`/boards/${category}/${boardId}`),
      () => wrapMock(mockBoardData.getPost(category, boardId))
    ),

  updatePost: (category: BoardCategory, boardId: string, body: Record<string, unknown>) =>
    withMock(
      () => fetchClient.patch<ApiResponse<unknown>>(`/boards/${category}/${boardId}`, body),
      () => wrapMock(mockBoardData.updatePost(category, boardId, body))
    ),

  deletePost: (category: BoardCategory, boardId: string) =>
    withMock(
      () => fetchClient.delete<ApiResponse<unknown>>(`/boards/${category}/${boardId}`),
      () => wrapMock(mockBoardData.deletePost(category, boardId))
    ),

  pinPost: (category: BoardCategory, boardId: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/pin`),
      () => wrapMock(mockBoardData.pinPost())
    ),

  likePost: (category: BoardCategory, boardId: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/like`),
      () => wrapMock(mockBoardData.likePost(category, boardId))
    ),

  reportPost: (category: BoardCategory, boardId: string, reason: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/report`, { reason }),
      () => wrapMock(mockBoardData.reportPost())
    ),

  // Comments
  createComment: (category: BoardCategory, boardId: string, content: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/comments`, { content }),
      () => wrapMock(mockBoardData.createComment(category, boardId, content))
    ),

  updateComment: (category: BoardCategory, boardId: string, commentId: string, content: string) =>
    withMock(
      () => fetchClient.patch<ApiResponse<unknown>>(`/boards/${category}/${boardId}/comments/${commentId}`, { content }),
      () => wrapMock(mockBoardData.updateComment(category, boardId, commentId, content))
    ),

  deleteComment: (category: BoardCategory, boardId: string, commentId: string) =>
    withMock(
      () => fetchClient.delete<ApiResponse<unknown>>(`/boards/${category}/${boardId}/comments/${commentId}`),
      () => wrapMock(mockBoardData.deleteComment(category, boardId, commentId))
    ),

  likeComment: (category: BoardCategory, boardId: string, commentId: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/comments/${commentId}/like`),
      () => wrapMock(mockBoardData.likeComment(category, boardId, commentId))
    ),

  reportComment: (category: BoardCategory, boardId: string, commentId: string, reason: string) =>
    withMock(
      () => fetchClient.post<ApiResponse<unknown>>(`/boards/${category}/${boardId}/comments/${commentId}/report`, { reason }),
      () => wrapMock(mockBoardData.reportComment())
    ),

  createReply: (category: BoardCategory, boardId: string, commentId: string, replyId: string, content: string) =>
    withMock(
      () =>
        fetchClient.post<ApiResponse<unknown>>(
          `/boards/${category}/${boardId}/comments/${commentId}/${replyId}`,
          { content }
        ),
      () => wrapMock(mockBoardData.createReply(category, boardId, commentId, replyId, content))
    ),

  deleteReply: (category: BoardCategory, boardId: string, commentId: string, replyId: string) =>
    withMock(
      () =>
        fetchClient.delete<ApiResponse<unknown>>(
          `/boards/${category}/${boardId}/comments/${commentId}/${replyId}`
        ),
      () => wrapMock(mockBoardData.deleteReply(category, boardId, commentId, replyId))
    ),

  reportReply: (
    category: BoardCategory,
    boardId: string,
    commentId: string,
    replyId: string,
    reason: string
  ) =>
    withMock(
      () =>
        fetchClient.post<ApiResponse<unknown>>(
          `/boards/${category}/${boardId}/comments/${commentId}/${replyId}/report`,
          { reason }
        ),
      () => wrapMock(mockBoardData.reportReply())
    ),
};

export type { BoardCategory };
