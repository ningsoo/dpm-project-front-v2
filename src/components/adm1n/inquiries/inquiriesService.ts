import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export async function fetchInquiries(page: number): Promise<PageResponse> {
  const res = await adminApi.getInquiries({
    page,
    size: 20,
    sort: 'createdAt,desc',
  });
  return safeParse(res.data?.data);
}

export async function fetchInquiry(userInquiryId: string): Promise<Record<string, unknown>> {
  const res = await adminApi.getInquiry(userInquiryId);
  const d = res.data?.data as Record<string, unknown>;
  return d || {};
}

export async function completeInquiry(
  id: string,
  body: { adminComment: string }
): Promise<void> {
  await adminApi.completeInquiry(id, body);
}
