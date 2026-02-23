'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { fetchCancelRequests, approveCancelDonation } from './cancelRequestsService';

export function useCancelRequests() {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [processedCache, setProcessedCache] = useState<Map<string, Record<string, unknown>>>(
    new Map()
  );

  const load = useCallback(() => {
    setLoading(true);
    fetchCancelRequests()
      .then((list) => setData(list))
      .catch(() => ToastUtils.error('취소 요청 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = (transactionId: string, item: Record<string, unknown>) => {
    setSubmitting(true);
    setApproveTarget(transactionId);
    approveCancelDonation(transactionId)
      .then(() => {
        ToastUtils.success('취소가 승인되었습니다.');
        setProcessedCache((prev) => new Map(prev).set(transactionId, { ...item }));
        setApprovedIds((prev) => new Set([...prev, transactionId]));
        setApproveTarget(null);
        load();
      })
      .catch(() => {
        ToastUtils.error('취소 승인에 실패했습니다.');
        setApproveTarget(null);
      })
      .finally(() => setSubmitting(false));
  };

  return {
    data,
    loading,
    submitting,
    approveTarget,
    approvedIds,
    processedCache,
    load,
    handleApprove,
  };
}
