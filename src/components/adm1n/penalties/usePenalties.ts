'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { fetchPenalties, fetchPenalty } from './penaltiesService';

export function usePenalties() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchPenalties(p)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('제재 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const openDetail = (userId: string) => {
    setDetailLoading(true);
    setDetail(null);
    fetchPenalty(userId)
      .then((d) => setDetail(d))
      .catch(() => ToastUtils.error('제재 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  return {
    data,
    page,
    totalPages,
    loading,
    detail,
    setDetail,
    detailLoading,
    setDetailLoading,
    load,
    openDetail,
  };
}
