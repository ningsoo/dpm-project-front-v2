import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export interface GetUsersParams {
  page: number;
  search?: string;
  status?: string;
}

export interface ManageUserBody {
  grade: string;
  role: string;
  status: string;
}

export async function fetchUsers(params: GetUsersParams): Promise<PageResponse> {
  const res = await adminApi.getUsers(params);
  return safeParse(res.data?.data);
}

export async function manageUser(userId: string, body: ManageUserBody): Promise<void> {
  await adminApi.manageUser(userId, body);
}
