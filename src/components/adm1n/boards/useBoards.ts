'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { fetchBoards, deleteBoard } from './boardsService';

export function useBoards() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, cat?: string) => {
    setLoading(true);
    const params: { page: number; category?: string } = { page: p };
    if (cat) params.category = cat;
    fetchBoards(params)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('게시글 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    deleteBoard(deleteTarget)
      .then(() => {
        ToastUtils.success('게시글이 삭제되었습니다.');
        setDeleteTarget(null);
        load(page, categoryFilter);
      })
      .catch(() => ToastUtils.error('게시글 삭제에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return {
    data,
    page,
    totalPages,
    categoryFilter,
    setCategoryFilter,
    loading,
    deleteTarget,
    setDeleteTarget,
    submitting,
    load,
    handleDelete,
  };
}
