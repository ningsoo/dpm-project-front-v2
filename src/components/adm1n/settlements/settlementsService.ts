import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export interface GetSettlementsParams {
  page: number;
  status?: string;
}

/** 정산 요청 내역 조회 (백엔드 GET /settlements → List<AdminSettlementResponse>) */
export async function fetchSettlements(_params?: GetSettlementsParams): Promise<PageResponse> {
  try {
    const res = await adminApi.getAdminSettlements();
    // 응답이 { data: [...] } 또는 { data: { data: [...] } } 형태일 수 있음
    const raw = res.data;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    return {
      content: list,
      totalPages: list.length > 0 ? 1 : 0,
      number: 0,
      totalElements: list.length,
    };
  } catch {
    // 백엔드에서 정산 요청 내역 없을 때 예외(ResourceNotFoundException) 시 빈 목록 반환
    return {
      content: [],
      totalPages: 0,
      number: 0,
      totalElements: 0,
    };
  }
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

/** 정산 승인 (popHistoryId 기준) */
export async function approveSettlementByPopHistoryId(popHistoryId: number): Promise<void> {
  await adminApi.approveSettlementByPopHistoryId(popHistoryId);
}

/** 정산 거절 (popHistoryId 기준) */
export async function rejectSettlementByPopHistoryId(popHistoryId: number): Promise<void> {
  await adminApi.rejectSettlementByPopHistoryId(popHistoryId);
}
