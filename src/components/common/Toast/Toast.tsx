'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './Toast.module.css';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners: Array<(t: ToastItem) => void> = [];

export function addToast(message: string, type: ToastItem['type'] = 'info') {
  const item: ToastItem = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(item));
}

export default function ToastRoot() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      // 기존 타이머가 있으면 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // 기존 토스트를 새 것으로 덮어쓰기
      setItem(t);
      
      // 3초 후 자동 제거
      timeoutRef.current = setTimeout(() => {
        setItem(null);
        timeoutRef.current = null;
      }, 3000);
    };
    listeners.push(onToast);
    return () => {
      const i = listeners.indexOf(onToast);
      if (i >= 0) listeners.splice(i, 1);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!item) return null;

  return (
    <div className={styles.container} role="alert">
      <div key={item.id} className={`${styles.toast} ${styles[item.type]}`}>
        {item.message}
      </div>
    </div>
  );
}
