'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import {
  fetchSettlements,
  fetchSettlement,
  approveSettlement,
  approveSettlementByPopHistoryId,
  rejectSettlementByPopHistoryId,
} from './settlementsService';

export function useSettlements() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvingPopHistoryId, setApprovingPopHistoryId] = useState<number | null>(null);
  const [rejectingPopHistoryId, setRejectingPopHistoryId] = useState<number | null>(null);
  /** 한 번의 정산 신청 단위(그룹) 승인/거절 시 해당 그룹 키 */
  const [approvingGroupKey, setApprovingGroupKey] = useState<string | null>(null);
  const [rejectingGroupKey, setRejectingGroupKey] = useState<string | null>(null);

  const load = useCallback((p: number, st?: string) => {
    setLoading(true);
    const params: { page: number; status?: string } = { page: p };
    if (st) params.status = st;
    fetchSettlements(params)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('정산 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const openDetail = (boardId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setMemo('');
    fetchSettlement(boardId)
      .then((d) => setDetail(d))
      .catch(() => ToastUtils.error('정산 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handleApprove = () => {
    if (!detail) return;
    const boardId = str(detail.boardId ?? detail.id);
    setSubmitting(true);
    approveSettlement(boardId, memo ? { memo } : undefined)
      .then(() => {
        ToastUtils.success('정산이 승인되었습니다.');
        setDetail(null);
        load(page, statusFilter);
      })
      .catch(() => ToastUtils.error('정산 승인에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  /** 행 단위 정산 승인 (SETTLEMENT_REQUEST → 승인 버튼 클릭, popHistoryId로 호출) */
  const handleApproveRow = useCallback(
    (popHistoryId: number) => {
      if (approvingPopHistoryId != null) return;
      setApprovingPopHistoryId(popHistoryId);
      approveSettlementByPopHistoryId(popHistoryId)
        .then(() => {
          ToastUtils.success('정산이 승인되었습니다.');
          load(page, statusFilter);
        })
        .catch(() => ToastUtils.error('정산 승인에 실패했습니다.'))
        .finally(() => setApprovingPopHistoryId(null));
    },
    [approvingPopHistoryId, load, page, statusFilter]
  );

  /** 행 단위 정산 거절 */
  const handleRejectRow = useCallback(
    (popHistoryId: number) => {
      if (rejectingPopHistoryId != null) return;
      setRejectingPopHistoryId(popHistoryId);
      rejectSettlementByPopHistoryId(popHistoryId)
        .then(() => {
          ToastUtils.success('정산이 거절되었습니다.');
          load(page, statusFilter);
        })
        .catch(() => ToastUtils.error('정산 거절에 실패했습니다.'))
        .finally(() => setRejectingPopHistoryId(null));
    },
    [rejectingPopHistoryId, load, page, statusFilter]
  );

  /** 한 번의 정산 신청(그룹) 단위 승인 — 해당 그룹의 모든 popHistoryId 순차 승인 */
  const handleApproveGroup = useCallback(
    async (groupKey: string, popHistoryIds: number[]) => {
      if (approvingGroupKey != null || popHistoryIds.length === 0) return;
      setApprovingGroupKey(groupKey);
      try {
        for (const id of popHistoryIds) {
          await approveSettlementByPopHistoryId(id);
        }
        ToastUtils.success('정산이 승인되었습니다.');
        load(page, statusFilter);
      } catch {
        ToastUtils.error('정산 승인에 실패했습니다.');
      } finally {
        setApprovingGroupKey(null);
      }
    },
    [approvingGroupKey, load, page, statusFilter]
  );

  /** 한 번의 정산 신청(그룹) 단위 거절 — 해당 그룹의 모든 popHistoryId 순차 거절 */
  const handleRejectGroup = useCallback(
    async (groupKey: string, popHistoryIds: number[]) => {
      if (rejectingGroupKey != null || popHistoryIds.length === 0) return;
      setRejectingGroupKey(groupKey);
      try {
        for (const id of popHistoryIds) {
          await rejectSettlementByPopHistoryId(id);
        }
        ToastUtils.success('정산이 거절되었습니다.');
        load(page, statusFilter);
      } catch {
        ToastUtils.error('정산 거절에 실패했습니다.');
      } finally {
        setRejectingGroupKey(null);
      }
    },
    [rejectingGroupKey, load, page, statusFilter]
  );

  return {
    data,
    page,
    totalPages,
    statusFilter,
    setStatusFilter,
    loading,
    detail,
    setDetail,
    detailLoading,
    setDetailLoading,
    memo,
    setMemo,
    submitting,
    load,
    openDetail,
    handleApprove,
    handleApproveRow,
    approvingPopHistoryId,
    handleRejectRow,
    rejectingPopHistoryId,
    handleApproveGroup,
    handleRejectGroup,
    approvingGroupKey,
    rejectingGroupKey,
  };
}
