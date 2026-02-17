import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export type NotificationType = 'LIKE' | 'COMMENT' | 'DONATION';

export interface NotificationItem {
  notificationId: number;
  sendingUserId: number;
  senderNickname: string;
  notificationtype: NotificationType;
  boardId: number;
  /** ISO 문자열 또는 [year, month, day, hour, minute, second] 배열 */
  createdAt: string | number[];
  read: boolean;
}

export interface NotificationListResponse {
  content: NotificationItem[];
  last: boolean;
  totalElements: number;
}

export const notificationApi = {
  /** 읽지 않은 알림 개수 조회 - GET /api/users/notification/unread */
  getUnreadCount: () =>
    fetchClient.get<ApiResponse<number>>('/api/users/notification/unread'),

  /** 알림 리스트 조회 - GET /api/users/notification?page=0&size=10 */
  getNotificationList: (params: { page: number; size: number }) =>
    fetchClient.get<ApiResponse<NotificationListResponse>>('/api/users/notification', {
      params,
    }),

  /** 알림 상세 조회 및 읽음 처리 - GET /api/users/notification/{notificationId} */
  getNotificationDetail: (notificationId: number) =>
    fetchClient.get<ApiResponse<NotificationItem>>(
      `/api/users/notification/${notificationId}`
    ),
};
