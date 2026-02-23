import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export interface GetReportsParams {
  page: number;
  status?: string;
}

export async function fetchReports(params: GetReportsParams): Promise<PageResponse> {
  const res = await adminApi.getReports(params);
  return safeParse(res.data?.data);
}

export async function fetchReport(reportId: string): Promise<Record<string, unknown>> {
  const res = await adminApi.getReport(reportId);
  const d = res.data?.data as Record<string, unknown>;
  return d || {};
}

export interface PenalizeBody {
  reason: string;
  type: string;
  until?: string;
}

export async function penalizeUser(userId: string, body: PenalizeBody): Promise<void> {
  await adminApi.penalizeUser(userId, body);
}
