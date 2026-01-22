# 목로그인 제거 가이드

이 문서는 개발용 목로그인 기능을 제거하는 방법을 안내합니다.

## 1. 삭제할 파일 목록

다음 파일들을 삭제하세요:

- [ ] `src/auth/mock/mockAuth.ts`
- [ ] `src/auth/AuthContext.tsx`
- [ ] `src/auth/MockAuthWrapper.tsx`
- [ ] `src/app/dev/mock-login/page.tsx`
- [ ] `src/components/auth/MockAuthHeaderButtons.tsx`
- [ ] `MOCK_AUTH_REMOVAL_GUIDE.md` (이 파일)

## 2. 수정 되돌릴 파일 목록

### `src/components/common/Header/Header.tsx`

다음 라인들을 삭제하세요:

- `import { MockAuthHeaderButtons } from '@/components/auth/MockAuthHeaderButtons';` (import 섹션)
- `<MockAuthHeaderButtons />` (actions div 내부)

### `src/app/mypage/page.tsx`

다음 라인들을 삭제/수정하세요:

- `import { useAuth } from '@/auth/AuthContext';` 삭제
- `const { isLoggedIn } = useAuth();` 삭제
- `if (!isLoggedIn)` → `if (!user)` 로 복구 (기존 로직으로 되돌림)

### `src/app/mypage/credits/page.tsx`

다음 라인들을 삭제/수정하세요:

- `import { useAuth } from '@/auth/AuthContext';` 삭제
- `const { isLoggedIn, user: mockUser } = useAuth();` 삭제
- MockUser를 UserInfo로 변환하는 로직 삭제
- `if (!isLoggedIn)` → `if (!user)` 로 복구 (기존 로직으로 되돌림)

### `src/app/mypage/updateprofile/page.tsx`

다음 라인들을 삭제/수정하세요:

- `import { useAuth } from '@/auth/AuthContext';` 삭제
- `const { isLoggedIn, user: mockUser } = useAuth();` 삭제
- MockUser를 UserInfo로 변환하는 로직 삭제
- `if (!isLoggedIn)` → `if (!user) { router.push('/auth/login'); return null; }` 로 복구 (기존 로직으로 되돌림)
- `useState` 초기값에서 `mockUser?.nickname` 제거

### `src/app/mypage/updatepassword/page.tsx`

다음 라인들을 삭제/수정하세요:

- `import Link from 'next/link';` (목로그인 체크에서 사용한 것만 제거)
- `import { useAuth } from '@/auth/AuthContext';` 삭제
- `const { isLoggedIn, user: mockUser } = useAuth();` 삭제
- MockUser를 UserInfo로 변환하는 로직 삭제
- `if (!isLoggedIn)` → `if (!user) { router.push('/auth/login'); return null; }` 로 복구 (기존 로직으로 되돌림)

### `src/app/dev/mock-login/page.tsx`

다음 라인들을 삭제/수정하세요:

- 추가한 "비밀번호 변경" 버튼 제거
- 버튼 순서를 원래대로 복구 (필요시)

### `src/app/layout.tsx`

다음 라인들을 삭제하세요:

- `import { MockAuthWrapper } from '@/auth/MockAuthWrapper';` (7번째 라인)
- `{/* 목로그인 전용 - 추후 이 라인과 import만 삭제 */}` (19번째 라인)
- `<MockAuthWrapper>` (20번째 라인)
- `</MockAuthWrapper>` (28번째 라인)

수정 전:
```tsx
import { MockAuthWrapper } from '@/auth/MockAuthWrapper';
// ... 다른 imports ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 목로그인 전용 - 추후 이 라인과 import만 삭제 */}
        <MockAuthWrapper>
          <Providers>
            {/* ... */}
          </Providers>
        </MockAuthWrapper>
      </body>
    </html>
  );
}
```

수정 후:
```tsx
// MockAuthWrapper import 삭제
// ... 다른 imports ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {/* ... */}
        </Providers>
      </body>
    </html>
  );
}
```

## 3. localStorage 정리

개발자 도구 Console에서 다음 명령어를 실행하여 목데이터를 정리하세요:

```javascript
localStorage.removeItem('MOCK_ACCESS_TOKEN');
localStorage.removeItem('MOCK_USER');
```

또는 MOCK_ 접두사를 가진 모든 데이터를 삭제:

```javascript
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('MOCK_')) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
```

## 4. 제거 후 확인 사항

다음 항목들을 확인하세요:

- [ ] `npm run build` 성공 확인
- [ ] 기존 회원가입/로그인 플로우 동작 확인
- [ ] 보드 기능 정상 동작 확인
- [ ] localStorage에 MOCK_ 접두사 데이터 없는지 확인
- [ ] Redux store 정상 동작 확인
- [ ] SSR 에러 없는지 확인

## 5. 백엔드 연동 시 필요한 작업

목로그인을 제거한 후 실제 백엔드와 연동하려면 다음 작업이 필요합니다:

- 실제 JWT 토큰 처리 로직 구현 (HttpOnly Cookie 방식)
- 실제 API 엔드포인트 연결 (Axios)
- 인증 상태 관리 로직 구현 (Redux 활용 권장)
- SSR 환경에서 쿠키 기반 인증 처리

## 참고사항

- 목로그인은 개발 환경에서만 사용되도록 구현되어 있습니다 (`process.env.NODE_ENV === 'production'` 체크)
- 목로그인 관련 코드는 기존 인증 로직과 완전히 분리되어 있어 제거가 쉽습니다
- `src/app/layout.tsx`의 수정은 최소한으로 이루어졌으므로 되돌리기가 간단합니다
