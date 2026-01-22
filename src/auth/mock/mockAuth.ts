'use client';

export interface MockUser {
  id: number;
  email: string;
  nickname: string;
  role: string;
}

const MOCK_ACCESS_TOKEN_KEY = 'MOCK_ACCESS_TOKEN';
const MOCK_USER_KEY = 'MOCK_USER';

/**
 * 목로그인 상태를 설정합니다.
 * localStorage에 MOCK_ACCESS_TOKEN과 MOCK_USER를 저장합니다.
 */
export function setMockLogin(): void {
  if (typeof window === 'undefined') return;

  const mockUser: MockUser = {
    id: 1,
    email: 'test@test.com',
    nickname: 'mockUser',
    role: 'USER',
  };

  localStorage.setItem(MOCK_ACCESS_TOKEN_KEY, 'mock-access-token');
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
}

/**
 * 목로그인 상태를 해제합니다.
 * localStorage에서 MOCK_ACCESS_TOKEN과 MOCK_USER를 삭제합니다.
 */
export function clearMockLogin(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(MOCK_ACCESS_TOKEN_KEY);
  localStorage.removeItem(MOCK_USER_KEY);
}

/**
 * 저장된 목 사용자 정보를 반환합니다.
 * @returns MockUser 객체 또는 null
 */
export function getMockUser(): MockUser | null {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem(MOCK_USER_KEY);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as MockUser;
  } catch {
    return null;
  }
}

/**
 * 목로그인 상태인지 확인합니다.
 * @returns MOCK_ACCESS_TOKEN이 있으면 true, 없으면 false
 */
export function isMockLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem(MOCK_ACCESS_TOKEN_KEY);
  return !!token;
}

/**
 * MOCK_ 접두사를 가진 모든 localStorage 데이터를 삭제합니다.
 */
export function cleanupAllMockData(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('MOCK_')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
}
