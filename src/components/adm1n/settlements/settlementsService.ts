import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export interface GetSettlementsParams {
  page: number;
  status?: string;
}

export async function fetchSettlements(params: GetSettlementsParams): Promise<PageResponse> {
  const res = await adminApi.getSettlements(params);
  return safeParse(res.data?.data);
}

export async function fetchSettlement(boardId: string): Promise<Record<string, unknown>> {
  const res = await adminApi.getSettlement(boardId);
  const d = res.data?.data as Record<string, unknown>;
  return d || {};
}

export async function approveSettlement(
  boardId: string,
  body?: { memo?: string }
): Promise<void> {
  await adminApi.approveSettlement(boardId, body);
}
