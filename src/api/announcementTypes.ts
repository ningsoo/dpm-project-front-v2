/** API 공지 타입 (백엔드 enum) */
export type AnnounceType =
  | 'GENERAL'
  | 'EMERGENCY'
  | 'EVENT'
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY';

/** [year, month, day, hour?, minute?, second?] */
export type DateTimeArray = [number, number, number, number?, number?, number?];

export interface Announcement {
  announceId: number;
  announceType: AnnounceType;
  title: string;
  content: string | null;
  linkUrl: string | null;
  priority: number;
  isActive: boolean;
  startedAt: DateTimeArray | null;
  endedAt: DateTimeArray | null;
  createdAt: DateTimeArray;
  fileUrls: string[] | null;
  attachmentIds: number[] | null;
}

/** 타입별 단건 조회 응답 (날짜는 ISO 문자열) */
export interface AnnouncementByType {
  announceId: number;
  announceType: AnnounceType;
  title: string;
  content: string;
  linkUrl: string | null;
  priority: number;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  fileUrls: string[] | null;
  attachmentIds: number[] | null;
}

export interface PageableAnnouncementResponse {
  content: Announcement[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  size: number;
  number: number;
  first: boolean;
  empty: boolean;
}
