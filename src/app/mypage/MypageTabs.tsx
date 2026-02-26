'use client';

import styles from './mypage.module.css';

export interface MypageTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: ReadonlyArray<{ id: string; label: string }>;
}

export function MypageTabs({ activeTab, onTabChange, tabs }: MypageTabsProps) {
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={activeTab === t.id ? styles.tabActive : styles.tab}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
