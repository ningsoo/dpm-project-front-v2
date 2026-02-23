'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import { fetchComments, deleteComment } from './commentsService';

export function useComments() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchComments(p)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('댓글 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    deleteComment(deleteTarget)
      .then(() => {
        ToastUtils.success('댓글이 삭제되었습니다.');
        setDeleteTarget(null);
        load(page);
      })
      .catch(() => ToastUtils.error('댓글 삭제에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return {
    data,
    page,
    totalPages,
    loading,
    deleteTarget,
    setDeleteTarget,
    submitting,
    load,
    handleDelete,
  };
}
