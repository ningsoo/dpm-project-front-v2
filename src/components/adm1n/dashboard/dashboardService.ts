import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export async function fetchDashboardData(): Promise<{
  users: PageResponse;
  boards: PageResponse;
  inquiries: PageResponse;
  reports: PageResponse;
}> {
  const [u, b, i, rp] = await Promise.all([
    adminApi.getUsers({ page: 0 }).then((r) => safeParse(r.data?.data)),
    adminApi.getBoards({ page: 0 }).then((r) => safeParse(r.data?.data)),
    adminApi.getInquiries({ page: 0 }).then((r) => safeParse(r.data?.data)),
    adminApi.getReports({ page: 0 }).then((r) => safeParse(r.data?.data)),
  ]);
  return { users: u, boards: b, inquiries: i, reports: rp };
}
