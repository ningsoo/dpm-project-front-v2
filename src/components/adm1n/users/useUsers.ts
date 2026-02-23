'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { str } from '../common/helpers';
import { fetchUsers, manageUser } from './usersService';
import type { UserModalState } from './types';
import type { ManageForm } from './types';

export function useUsers() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<UserModalState | null>(null);
  const [manageForm, setManageForm] = useState<ManageForm>({ grade: '', role: '', status: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, s?: string, st?: string) => {
    setLoading(true);
    const params: { page: number; search?: string; status?: string } = { page: p };
    if (s) params.search = s;
    if (st) params.status = st;
    fetchUsers(params)
      .then((parsed) => {
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('회원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const handleSearch = () => load(0, search, statusFilter);

  const openManage = (user: unknown) => {
    const u = user as Record<string, unknown>;
    setManageForm({
      grade: str(u.grade),
      role: str(u.role),
      status: str(u.status),
    });
    setModal({ user: u });
  };

  const handleManage = () => {
    if (!modal) return;
    setSubmitting(true);
    manageUser(str(modal.user.userId ?? modal.user.id), manageForm)
      .then(() => {
        ToastUtils.success('회원 정보가 수정되었습니다.');
        setModal(null);
        load(page, search, statusFilter);
      })
      .catch(() => ToastUtils.error('회원 정보 수정에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return {
    data,
    page,
    totalPages,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    modal,
    setModal,
    manageForm,
    setManageForm,
    submitting,
    load,
    handleSearch,
    openManage,
    handleManage,
  };
}
