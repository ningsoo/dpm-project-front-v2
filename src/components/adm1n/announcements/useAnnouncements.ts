'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, type AnnouncementItem, type AnnouncementPageData } from '@/api/adminApi';
import type { ApiResponse } from '@/api/authApi';

const DEFAULT_SIZE = 20;

function extractPageData(res: { data?: ApiResponse<AnnouncementPageData> }): AnnouncementPageData | undefined {
  const raw = res.data?.data;
  return raw && typeof raw === 'object' && Array.isArray((raw as AnnouncementPageData).content)
    ? (raw as AnnouncementPageData)
    : undefined;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNext, setHasNext] = useState(true);

  const fetchAnnouncements = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAnnouncements({ page: pageNum, size: DEFAULT_SIZE });
      const data = extractPageData(res as { data?: ApiResponse<AnnouncementPageData> });
      const list = data?.content ?? [];
      const isLast = data?.last === true;

      setAnnouncements((prev) => (pageNum === 0 ? list : [...prev, ...list]));
      setHasNext(!isLast);
      setPage(pageNum);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading || !hasNext) return;
    const nextPage = page + 1;
    fetchAnnouncements(nextPage);
  }, [isLoading, hasNext, page, fetchAnnouncements]);

  useEffect(() => {
    fetchAnnouncements(0);
  }, [fetchAnnouncements]);

  return {
    announcements,
    page,
    isLoading,
    hasNext,
    fetchAnnouncements,
    loadMore,
  };
}
