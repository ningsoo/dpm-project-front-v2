'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import { fetchReports, fetchReport, penalizeUser } from './reportsService';
import type { PenaltyForm } from './types';

export function useReports() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState<PenaltyForm>({
    reason: '',
    type: 'WARNING',
    until: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, st?: string) => {
    setLoading(true);
    const params: { page: number; status?: string } = { page: p };
    if (st) params.status = st;
    fetchReports(params)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('신고 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const openDetail = (reportId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setPenaltyForm({ reason: '', type: 'WARNING', until: '' });
    fetchReport(reportId)
      .then((d) => setDetail(d))
      .catch(() => ToastUtils.error('신고 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handlePenalize = () => {
    if (!detail) return;
    const userId = str(detail.reportedUserId ?? detail.targetUserId ?? detail.userId);
    if (!userId || userId === '-') {
      ToastUtils.error('제재 대상 사용자를 확인할 수 없습니다.');
      return;
    }
    setSubmitting(true);
    const body: { reason: string; type: string; until?: string } = {
      reason: penaltyForm.reason,
      type: penaltyForm.type,
    };
    if (penaltyForm.until) body.until = penaltyForm.until;
    penalizeUser(userId, body)
      .then(() => {
        ToastUtils.success('제재가 적용되었습니다.');
        setDetail(null);
        load(page, statusFilter);
      })
      .catch(() => ToastUtils.error('제재 적용에 실패했습니다.'))
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
    penaltyForm,
    setPenaltyForm,
    submitting,
    load,
    openDetail,
    handlePenalize,
  };
}
