/**
 * Toast utility - integrates with Toast component
 * PRD: Toast for success/error messages (Logged out, Successfully updated, etc.)
 */

import { addToast } from '@/components/common/Toast/Toast';

export const ToastUtils = {
  success: (msg: string) => addToast(msg, 'success'),
  error: (msg: string) => addToast(msg, 'error'),
  info: (msg: string) => addToast(msg, 'info'),
};
