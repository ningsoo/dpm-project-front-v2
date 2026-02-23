'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import {
  fetchInquiries,
  fetchInquiry,
  completeInquiry,
} from './inquiriesService';

export function useInquiries() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchInquiries(p)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('문의 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const openDetail = (userInquiryId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setReply('');
    fetchInquiry(userInquiryId)
      .then((d) => setDetail(d))
      .catch(() => ToastUtils.error('문의 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handleReply = () => {
    if (!detail) return;
    setSubmitting(true);
    const id = str(detail.userInquiryId ?? detail.inquiryId ?? detail.id);
    completeInquiry(id, { adminComment: reply })
      .then(() => {
        ToastUtils.success('답변이 등록되었습니다.');
        setDetail(null);
        load(page);
      })
      .catch(() => ToastUtils.error('답변 등록에 실패했습니다.'))
      .finally(() => setSubmitting(false));
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
    reply,
    setReply,
    submitting,
    load,
    openDetail,
    handleReply,
  };
}
