'use client';

import { useState, useEffect } from 'react';
import { ToastUtils } from '@/utils/toastUtils';
import { fetchDashboardData } from './dashboardService';
import type { DashboardStats } from './types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    boards: 0,
    inquiries: 0,
    reports: 0,
  });
  const [recentBoards, setRecentBoards] = useState<unknown[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboardData()
      .then(({ users: u, boards: b, inquiries: i, reports: rp }) => {
        if (cancelled) return;
        setStats({
          users: u.totalElements,
          boards: b.totalElements,
          inquiries: i.totalElements,
          reports: rp.totalElements,
        });
        setRecentBoards(b.content.slice(0, 5));
        setRecentInquiries(i.content.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) ToastUtils.error('대시보드 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, recentBoards, recentInquiries, loading };
}
