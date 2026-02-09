import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export type InquiryType = 'USER' | 'PAYMENT' | 'DONATION' | 'POST' | 'API' | 'ETC';

export interface CreateInquiryBody {
  inquiryType: InquiryType;
  title: string;
  content: string;
  fileUrl: string | null;
  fileKey: string | null;
  isImage: boolean | null;
}

export interface S3UploadResult {
  fileUrl: string;
  fileKey: string;
  isImage: boolean;
}

export const inquiryApi = {
  /** S3 단일 파일 업로드 - POST /s3/upload/single */
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchClient.post<ApiResponse<S3UploadResult>>('/s3/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** 문의 등록 - POST /inquiries/create (JSON) */
  createInquiry: (body: CreateInquiryBody) =>
    fetchClient.post<ApiResponse<unknown>>('/inquiry/create', body),
};
