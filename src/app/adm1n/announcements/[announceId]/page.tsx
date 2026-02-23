'use client';

import { useParams } from 'next/navigation';
import { AnnouncementsDetailSection } from '@/components/adm1n/announcements/AnnouncementsDetailSection';

export default function AdminAnnouncementDetailPage() {
  const params = useParams();
  const announceId = Number(params.announceId);
  if (!Number.isFinite(announceId) || announceId < 1) {
    return null;
  }
  return <AnnouncementsDetailSection announceId={announceId} />;
}
