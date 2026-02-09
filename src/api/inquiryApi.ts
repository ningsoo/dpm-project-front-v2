import { fetchClient } from './fetchClient';
import type { ApiResponse } from './authApi';

export type InquiryType = 'USER' | 'PAYMENT' | 'DONATION' | 'POST' | 'API' | 'ETC';

export interface CreateInquiryParams {
  inquiryType: InquiryType;
  title: string;
  content: string;
  attachment?: File;
}

export const inquiryApi = {
  createInquiry: (params: CreateInquiryParams) => {
    const formData = new FormData();
    formData.append('inquiryType', params.inquiryType);
    formData.append('title', params.title);
    formData.append('content', params.content);
    if (params.attachment) {
      formData.append('attachment', params.attachment);
    }

    return fetchClient.post<ApiResponse<unknown>>('/inquiry/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
