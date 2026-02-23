'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners: Array<(t: ToastItem) => void> = [];

/* 리스너가 없을 때 토스트를 유실하지 않기 위한 큐 */
const pendingQueue: ToastItem[] = [];

export function addToast(message: string, type: ToastItem['type'] = 'info') {
  const item: ToastItem = { id: ++toastId, message, type };

  if (listeners.length === 0) {
    pendingQueue.push(item);
    return;
  }

  listeners.forEach((fn) => fn(item));
}

export default function ToastRoot() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setItem(t);

      timeoutRef.current = setTimeout(() => {
        setItem(null);
        timeoutRef.current = null;
      }, 3000);
    };

    listeners.push(onToast);

    /* 마운트 시 큐에 쌓인 토스트를 순서대로 방출 */
    if (pendingQueue.length > 0) {
      const copy = pendingQueue.splice(0, pendingQueue.length);
      copy.forEach((t) => onToast(t));
    }

    return () => {
      const i = listeners.indexOf(onToast);
      if (i >= 0) listeners.splice(i, 1);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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