'use client';

import { useEffect, useState } from 'react';
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
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== t.id));
      }, 3000);
    };
    listeners.push(onToast);
    return () => {
      const i = listeners.indexOf(onToast);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={styles.container} role="alert">
      {items.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
