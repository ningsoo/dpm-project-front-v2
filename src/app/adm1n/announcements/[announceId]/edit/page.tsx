'use client';

import { useParams } from 'next/navigation';
import { AnnouncementsEditSection } from '@/components/adm1n/announcements/AnnouncementsEditSection';

export default function AdminAnnouncementsEditPage() {
  const params = useParams();
  const announceId = Number(params.announceId);
  if (!Number.isFinite(announceId) || announceId < 1) {
    return null;
  }
  return <AnnouncementsEditSection announceId={announceId} />;
}
