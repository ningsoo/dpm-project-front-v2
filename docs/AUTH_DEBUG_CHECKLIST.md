# 인증 메커니즘 디버깅 체크 리스트

개발자도구(Chrome DevTools)를 사용하여 인증 흐름을 확인하는 방법입니다.

## 사전 준비

1. Chrome DevTools 열기: `F12` 또는 `Cmd+Option+I` (Mac)
2. **Network** 탭 열기
3. **Application** 탭 → **Local Storage** 확인 준비
4. **Console** 탭 열기

---

## 체크 항목

### 1. 로그인 응답 헤더에 Set-Cookie가 내려오는지 확인

**확인 방법:**
1. 로그인 페이지에서 로그인 시도
2. **Network** 탭에서 `/auth/login` 요청 선택
3. **Headers** 탭 → **Response Headers** 확인
4. `Set-Cookie` 헤더가 있는지 확인
   - Refresh Token이 HttpOnly 쿠키로 설정되어야 함
   - 예: `Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict`

**예상 결과:**
- ✅ `Set-Cookie` 헤더 존재
- ✅ `HttpOnly` 플래그 포함
- ✅ **Application** 탭 → **Cookies**에서 Refresh Token 확인 가능 (값은 보이지 않음)

---

### 2. accessToken이 localStorage에 저장되는지 확인

**확인 방법:**
1. 로그인 성공 후
2. **Application** 탭 → **Local Storage** → 현재 도메인 선택
3. `accessToken` 키 확인

**예상 결과:**
- ✅ `accessToken` 키 존재
- ✅ 값이 JWT 형식 (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**콘솔로 확인:**
```javascript
localStorage.getItem('accessToken')
```

---

### 3. 보호 API 호출 중 401 발생 시 /auth/refresh가 1회만 호출되는지 확인

**확인 방법:**
1. 로그인 후 accessToken을 만료된 토큰으로 수동 변경:
   ```javascript
   localStorage.setItem('accessToken', 'expired_token')
   ```
2. 보호된 API 호출 (예: `/mypage` 페이지 접근)
3. **Network** 탭에서 요청 흐름 확인:
   - 원본 요청 (예: `/mypage`) → **401 Unauthorized**
   - `/auth/refresh` → **200 OK** (1회만 호출되어야 함)
   - 원본 요청 재시도 → **200 OK**

**예상 결과:**
- ✅ `/auth/refresh` 요청이 **정확히 1회**만 발생
- ✅ 원본 요청이 재시도되어 성공

**주의:**
- `/auth/refresh`가 여러 번 호출되면 무한루프 가능성 있음

---

### 4. refresh 성공 시 accessToken이 갱신되고 원 요청이 1회 재시도되어 성공하는지 확인

**확인 방법:**
1. **Network** 탭에서 `/auth/refresh` 요청 선택
2. **Response** 탭에서 새 `accessToken` 확인
3. **Application** 탭 → **Local Storage**에서 `accessToken` 값이 변경되었는지 확인
4. 원본 요청이 재시도되어 성공하는지 확인

**예상 결과:**
- ✅ `/auth/refresh` 응답에 `accessToken` 포함
- ✅ `localStorage`의 `accessToken` 값이 새 토큰으로 갱신됨
- ✅ 원본 요청이 재시도되어 **200 OK** 응답

**콘솔로 확인:**
```javascript
// refresh 전
const oldToken = localStorage.getItem('accessToken');
// refresh 후
const newToken = localStorage.getItem('accessToken');
console.log('토큰 변경:', oldToken !== newToken);
```

---

### 5. /auth/refresh 자체가 401일 때 무한 호출이 발생하지 않는지 확인

**확인 방법:**
1. Refresh Token 쿠키를 삭제하거나 만료된 상태로 설정:
   - **Application** 탭 → **Cookies** → Refresh Token 쿠키 삭제
   - 또는 백엔드에서 Refresh Token을 무효화
2. 만료된 accessToken으로 보호된 API 호출
3. **Network** 탭에서 요청 흐름 확인:
   - 원본 요청 → **401**
   - `/auth/refresh` → **401** (1회만 호출되어야 함)
   - 이후 추가 `/auth/refresh` 호출 없음
   - 리다이렉트 발생 (홈으로)

**예상 결과:**
- ✅ `/auth/refresh`가 **1회만** 호출됨
- ✅ `/auth/refresh` 401 후 무한루프 없음
- ✅ `localStorage`의 `accessToken` 제거됨
- ✅ 홈 페이지(`/`)로 리다이렉트

**코드 확인:**
- `fetchClient.ts`의 47-49줄: `/auth/refresh` 요청은 refresh 시도하지 않음

---

### 6. ERR_CONNECTION_REFUSED 등 네트워크 오류 상황에서 accessToken이 삭제되지 않는지 확인

**확인 방법:**
1. 백엔드 서버 중지 또는 네트워크 차단
2. 로그인 상태에서 보호된 API 호출
3. **Network** 탭에서 `ERR_CONNECTION_REFUSED` 또는 `ERR_NETWORK_CHANGED` 오류 확인
4. **Application** 탭 → **Local Storage**에서 `accessToken` 확인

**예상 결과:**
- ✅ 네트워크 오류 발생
- ✅ `accessToken`이 **삭제되지 않음** (유지됨)
- ✅ 리다이렉트 발생하지 않음
- ✅ **Console**에 네트워크 오류만 표시

**코드 확인:**
- `fetchClient.ts`의 52-55줄: `!err.response`인 경우 토큰 제거하지 않음

**콘솔로 확인:**
```javascript
// 네트워크 오류 전
const tokenBefore = localStorage.getItem('accessToken');
// 네트워크 오류 후
const tokenAfter = localStorage.getItem('accessToken');
console.log('토큰 유지:', tokenBefore === tokenAfter); // true여야 함
```

---

## 추가 확인 사항

### Authorization 헤더 자동 주입 확인

**확인 방법:**
1. **Network** 탭에서 보호된 API 요청 선택
2. **Headers** 탭 → **Request Headers** 확인
3. `Authorization: Bearer {accessToken}` 헤더 확인

**예상 결과:**
- ✅ 모든 보호된 API 요청에 `Authorization` 헤더 포함
- ✅ `/auth/login`, `/auth/refresh` 등 인증 API는 제외 가능

---

### withCredentials 설정 확인

**확인 방법:**
1. **Network** 탭에서 요청 선택
2. **Headers** 탭 → **Request Headers** 확인
3. `Cookie` 헤더가 자동으로 포함되는지 확인

**예상 결과:**
- ✅ Refresh Token 쿠키가 자동으로 전송됨
- ✅ `fetchClient`와 `refreshClient` 모두 `withCredentials: true` 설정

---

## 문제 해결

### 문제: `/auth/refresh`가 무한 호출됨

**원인:**
- `refreshClient`가 `fetchClient`의 인터셉터를 사용하고 있음

**해결:**
- `fetchClient.ts`의 17-25줄: `refreshClient`는 별도 인스턴스로 인터셉터 없음 확인

---

### 문제: 네트워크 오류 시 토큰이 삭제됨

**원인:**
- `err.response`가 없는 경우에도 토큰 제거 로직 실행

**해결:**
- `fetchClient.ts`의 52-55줄: `!err.response` 체크 확인

---

### 문제: accessToken이 localStorage에 저장되지 않음

**원인:**
- SSR 환경에서 `localStorage` 접근 시도
- `tokenUtils.setAccessToken()` 호출 실패

**해결:**
- `tokenUtils.ts`의 `setAccessToken` 함수에서 `window` 체크 확인
- `login/page.tsx`의 98-110줄: 토큰 저장 확인 로직 확인
