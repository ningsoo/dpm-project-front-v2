import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export type MessageType = 'RECEIVED' | 'SENT';

export interface MessageItem {
  messageId: number;
  content: string;
  createdDatetime: number[];
  readAt: number[] | null;
  sendingUserId: number;
  sendingUserNickname: string;
  receivedUserId: number;
  receivedUserNickname: string;
  isRead: boolean;
}

export const messageApi = {
  /** 읽지 않은 메시지 개수 조회 - GET /api/users/message/unread */
  getUnreadCount: () =>
    fetchClient.get<ApiResponse<number>>('/api/users/message/unread'),

  /** 메시지 목록 조회 - GET /api/users/message?type=RECEIVED|SENT */
  getMessageList: (type: MessageType) =>
    fetchClient.get<ApiResponse<MessageItem[]>>('/api/users/message', {
      params: { type },
    }),

  /** 메시지 상세 조회 - GET /api/users/message/{messageId} */
  getMessageDetail: (messageId: number) =>
    fetchClient.get<ApiResponse<MessageItem>>(`/api/users/message/${messageId}`),

  /** 메시지 전송 - POST /api/users/message/{userId} */
  sendMessage: (userId: number, content: string) =>
    fetchClient.post<ApiResponse<unknown>>(`/api/users/message/${userId}`, {
      content,
    }),
};
