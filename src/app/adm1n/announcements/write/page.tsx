'use client';

import { useSearchParams } from 'next/navigation';
import { AnnouncementsWriteSection } from '@/components/adm1n/announcements/AnnouncementsWriteSection';
import type { AnnounceType } from '@/api/announcementTypes';

const DEFAULT_TYPE: AnnounceType = 'GENERAL';
const VALID_TYPES: AnnounceType[] = [
  'GENERAL',
  'EMERGENCY',
  'EVENT',
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
];

export default function AdminAnnouncementsWritePage() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('announceType') ?? DEFAULT_TYPE;
  const announceType: AnnounceType = VALID_TYPES.includes(raw as AnnounceType)
    ? (raw as AnnounceType)
    : DEFAULT_TYPE;

  return <AnnouncementsWriteSection announceType={announceType} />;
}
