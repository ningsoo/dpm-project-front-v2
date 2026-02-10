import { fetchClient } from './fetchClient';

/** Presigned URL 발급 API 응답 (백엔드: url 필드) */
export interface PresignedUrlResponse {
  url: string;
}

/**
 * S3 Presigned URL 발급 - GET /api/s3/presigned-url?fileKey={fileKey}
 * 응답의 url로 파일 다운로드 가능 (만료 10분)
 */
export const s3Api = {
  getPresignedUrl: (fileKey: string) =>
    fetchClient.get<PresignedUrlResponse | { data?: PresignedUrlResponse }>(
      '/s3/presigned-url',
      { params: { fileKey } }
    ),
};
