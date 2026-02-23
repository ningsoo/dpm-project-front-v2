'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import {
  fetchSettlements,
  fetchSettlement,
  approveSettlement,
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
  };
}
