'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import AnnouncementDetail from '@/components/announcement/AnnouncementDetail/AnnouncementDetail';

function isValidAnnounceId(id: unknown): id is string {
  return typeof id === 'string' && id.trim() !== '';
}

export default function AnnouncementDetailPage() {
  const params = useParams();
  const announceId = useMemo(() => {
    const raw = params?.announceId;
    return isValidAnnounceId(raw) ? String(raw).trim() : null;
  }, [params?.announceId]);

  if (!announceId) {
    return (
      <div className="loadingFallback">
        로딩 중…
      </div>
    );
  }

  return <AnnouncementDetail announceId={announceId} />;
}
