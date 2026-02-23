import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export async function fetchPenalties(page: number): Promise<PageResponse> {
  const res = await adminApi.getPenalties({ page });
  return safeParse(res.data?.data);
}

export async function fetchPenalty(userId: string): Promise<Record<string, unknown>> {
  const res = await adminApi.getPenalty(userId);
  const d = res.data?.data as Record<string, unknown>;
  return d || {};
}
