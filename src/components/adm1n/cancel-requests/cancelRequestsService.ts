import { adminApi } from '@/api/adminApi';

export async function fetchCancelRequests(): Promise<unknown[]> {
  const res = await adminApi.getCancelRequests();
  const raw = res.data?.data;
  return Array.isArray(raw) ? raw : [];
}

export async function approveCancelDonation(transactionId: string): Promise<void> {
  await adminApi.approveCancelDonation(transactionId);
}
