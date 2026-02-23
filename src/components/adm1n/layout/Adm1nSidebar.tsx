'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  HelpCircle,
  Flag,
  ShieldBan,
  Wallet,
  RotateCcw,
  Megaphone,
} from 'lucide-react';
import styles from '@/app/adm1n/admin.module.css';

const SIDEBAR_ITEMS = [
  { path: '/adm1n', label: '대시보드', icon: LayoutDashboard },
  { path: '/adm1n/users', label: '회원관리', icon: Users },
  { path: '/adm1n/boards', label: '게시글관리', icon: FileText },
  { path: '/adm1n/comments', label: '댓글관리', icon: MessageSquare },
  { path: '/adm1n/inquiries', label: '문의관리', icon: HelpCircle },
  { path: '/adm1n/reports', label: '신고관리', icon: Flag },
  { path: '/adm1n/penalties', label: '제재관리', icon: ShieldBan },
  { path: '/adm1n/settlements', label: '정산관리', icon: Wallet },
  { path: '/adm1n/cancel-requests', label: '후원 취소요청', icon: RotateCcw },
  { path: '/adm1n/announcements', label: '공지관리', icon: Megaphone },
] as const;

export function Adm1nSidebar() {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.sidebarTitle}>관리자</h2>
      <nav className={styles.sidebarNav}>
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/adm1n' ? pathname === '/adm1n' : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={isActive ? styles.navItemActive : styles.navItem}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
