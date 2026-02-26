# 마이페이지 프로필 카드(ProfileCard) 분리 — props/책임 설계서

- **대상**: `src/app/mypage/page.tsx` 내 프로필 카드 영역 전체
- **목표**: `ProfileCard.tsx` 분리 시 필요한 props와 부모/자식 책임 정리. **이 문서는 설계만 포함하며, 실제 코드 수정은 하지 않음.**
- **범위**: 프로필 이미지, 연필 버튼 hover/클릭, file input, 닉네임/받은 좋아요/이메일/전화번호/POP 잔액, 비밀번호 변경/정보수정/패스워드리스 버튼. **크롭 모달·패스워드리스 QR/완료/해지 모달은 분리 대상에 포함하지 않고, 카드에서는 “열기 요청만” 하는 구조로 설계.**

---

## 1. ProfileCard용 필수 props 목록

### 1.1 값 props (Value props)

| Prop | 타입 | 설명 | 소유 |
|------|------|------|------|
| `profileUrl` | `string \| null` | 표시할 프로필 이미지 URL. null/빈 문자열이면 기본 이미지 표시 | 부모 state |
| `nickname` | `string` | 표시 닉네임 | 부모 `user.nickname` |
| `email` | `string` | 표시 이메일 | 부모 `user.email` |
| `phoneDisplay` | `string` | 포맷된 전화번호 문자열 (예: `010-1234-5678` 또는 `—`) | 부모에서 `formatPhone11(user.phoneNumber) \|\| '—'` 계산 후 전달 |
| `popBalance` | `number` | POP 잔액 (표시용) | 부모 `user.popBalance ?? 0` |
| `receivedLikes` | `number` | 받은 좋아요 수 | 부모 state |
| `passwordless` | `boolean` | 패스워드리스 사용 여부 (해지/등록 버튼 분기) | 부모 `user.passwordless === true` |
| `pwlsRegisterLoading` | `boolean` | 패스워드리스 등록 진행 중 (등록 버튼 disabled) | 부모 state |
| `pwlsWithdrawalLoading` | `boolean` | 패스워드리스 해지 진행 중 (해지 버튼 disabled) | 부모 state |

**타입/상수 의존**

- `ProfileCard`는 마이페이지 전용이므로, **공통 UserInfo 타입을 import하지 않고** 표시용 최소 타입만 정의해도 됨.
- 기본 프로필 이미지: `ProfileCard` 내부에서 `@/assets/site/profile.png`를 그대로 import (기존 page와 동일 경로). 또는 부모가 fallback URL을 넘기는 방식도 가능하나, 기존 DOM/동작 유지를 위해 내부 import 권장.

### 1.2 콜백 props (Callback props)

| Prop | 시그니처 | 설명 | 호출 시점 |
|------|----------|------|------------|
| `onPencilClick` | `() => void` | 연필 버튼 클릭. 부모에서 `setShowImageUpload(true)` + `fileInputRef.current?.click()` 수행 | 연필 버튼 클릭 시 |
| `onFileChange` | `(e: React.ChangeEvent<HTMLInputElement>) => void` | file input `onChange`. 부모의 `handleImageSelect` 전달 | 파일 선택 시 (검증·크롭 모달 오픈은 부모 책임) |
| `onPasswordChange` | `() => void` | 비밀번호 변경 요청. 부모에서 `setPasswordVerifyTarget('/mypage/updatepassword')` + `setShowPasswordVerifyModal(true)` | 비밀번호 변경 버튼 클릭 |
| `onProfileEdit` | `() => void` | 정보수정 요청. 부모에서 `setPasswordVerifyTarget('/mypage/updateprofile')` + `setShowPasswordVerifyModal(true)` | 정보수정 버튼 클릭 |
| `onPwlsWithdraw` | `() => void` | 패스워드리스 해지 요청. 부모에서 `setShowPwlsWithdrawalModal(true)` | 해지 버튼 클릭 |
| `onPwlsRegister` | `(email: string) => void` | 패스워드리스 등록 요청. 부모에서 `openPwlsRegister(email)` 등 호출 | 등록 버튼 클릭. ProfileCard는 값 props로 받은 `email`을 그대로 전달해 `onPwlsRegister(email)` 호출 |

### 1.3 Ref props

| Prop | 타입 | 설명 | 소유 |
|------|------|------|------|
| `fileInputRef` | `React.RefObject<HTMLInputElement \| null>` | hidden file input에 부착할 ref. 부모가 소유하고 `handleImageSelect` 등과 함께 사용 | 부모 |

---

## 2. 불필요한 props 목록

- **`user` 객체 전체**  
  표시용 필드만 넘기면 되므로, `user`를 통째로 넘기지 않고 `nickname`, `email`, `phoneDisplay`, `popBalance`, `passwordless` 등으로 나누어 전달하는 쪽을 권장. (또는 설계상 단순화를 위해 `user`를 넘기되, ProfileCard에서는 위 필드만 사용하고 타입은 최소 인터페이스로 제한해도 됨.)
- **`setShowPencilIcon`**  
  연필 아이콘 hover 표시는 ProfileCard 내부 state로 두면 되므로, 부모에서 넘길 필요 없음 (아래 5절).
- **`setShowImageUpload`**  
  카드는 “클릭”만 알리고, 실제 `setShowImageUpload(true)`는 부모의 `onPencilClick` 구현 안에서 처리. 따라서 ProfileCard에는 `setShowImageUpload`를 넘기지 않음.
- **`setPasswordVerifyTarget` / `setShowPasswordVerifyModal` / `setShowPwlsWithdrawalModal`**  
  모달 state는 모두 부모에 두고, 카드는 `onPasswordChange`, `onProfileEdit`, `onPwlsWithdraw`, `onPwlsRegister` 콜백만 받음.
- **`handleImageSelect`**  
  이름만 다를 뿐, 동일한 역할을 `onFileChange`로 props 전달.

---

## 3. 부모(page.tsx)가 유지할 책임

- **데이터·state**
  - `user`, `profileUrl`, `receivedLikes`, `pwlsRegisterLoading`, `pwlsWithdrawalLoading` 등 모든 관련 state 보유.
  - `tabParam` / `getValidTab` / 날짜·서브탭 등 기존 로직 유지.
- **프로필 이미지 플로우**
  - `fileInputRef` 소유, `handleImageSelect` 구현 (파일 검증, FileReader, `setSelectedImage` / `setShowCropModal` 등).
  - 크롭 모달 오픈/확인/취소, `handleCropConfirm`, 프로필 이미지 API 호출, `setProfileUrl` / `setUser` 갱신.
- **모달 제어**
  - 비밀번호 확인 모달: `showPasswordVerifyModal`, `passwordVerifyTarget`, 열기/닫기.
  - 패스워드리스 해지 모달: `showPwlsWithdrawalModal`, `pwlsWithdrawalLoading`, 해지 API 호출.
  - 패스워드리스 QR/완료 모달: `pwlsQrModalOpen`, `pwlsRegisterDoneModalOpen` 등 관련 state와 `openPwlsRegister`, `requestPwlsQR` 등 로직.
- **유틸**
  - `formatPhone11` 유지. 부모에서 `phoneDisplay={formatPhone11(user.phoneNumber) || '—'}` 계산 후 ProfileCard에 전달.
- **라우팅**
  - 비밀번호 변경/정보수정 이동은 부모의 콜백 구현 안에서 `router`/`passwordVerifyTarget` 등으로 처리.

---

## 4. ProfileCard가 소비할 책임

- **표시**
  - `profileUrl` / `nickname` / `email` / `phoneDisplay` / `popBalance` / `receivedLikes` 표시.
  - 기본 프로필 이미지 fallback (동일 CSS·DOM 구조 유지).
- **연필 버튼**
  - hover 시 연필 버튼 표시 여부는 **ProfileCard 내부 state**로 관리 (`showPencilIcon` + `setShowPencilIcon`을 props로 받지 않음).
  - 연필 클릭 시 `onPencilClick()` 호출. file input은 `fileInputRef`를 받아 동일한 위치에 렌더, `onChange={onFileChange}`.
- **액션 버튼**
  - 비밀번호 변경 → `onPasswordChange()`
  - 정보수정 → `onProfileEdit()`
  - 패스워드리스 해지 → `onPwlsWithdraw()` (그리고 `pwlsWithdrawalLoading`일 때 disabled)
  - 패스워드리스 등록 → `onPwlsRegister(email)` (부모가 email 전달하므로, 콜백이 `() => void`라면 부모에서 `user.email`을 클로저로 넣어서 호출 가능. 또는 `onPwlsRegister: (email: string) => void`로 받고, 부모가 `onPwlsRegister={user.email} onPwlsRegisterClick={() => openPwlsRegister(user.email)}`처럼 나눌 필요 없이 `onPwlsRegister`에 `(email: string) => void`를 넘기고, ProfileCard는 `onPwlsRegister(email)`만 호출하면 됨. 이때 `email`은 props로 `user.email`을 넘겨 받음.)
- **DOM·스타일**
  - 기존 `styles.profile`, `styles.avatarWrap`, `styles.avatar`, `styles.profileText`, `styles.profileActions` 등 **동일한 className 및 DOM 구조** 유지.
  - `mypage.module.css`를 그대로 import하여 사용.

---

## 5. hover / file input / 버튼 흐름 설계

### 5.1 showPencilIcon (hover 상태)

- **권장: ProfileCard 내부 state**
  - 현재 page 내에서 `showPencilIcon`을 참조하는 곳은 프로필 아바타 영역뿐이므로, 이 state를 ProfileCard 안으로 옮겨도 동작이 바뀌지 않음.
  - 장점: props 수 감소, hover가 “프로필 카드 내부 UI 상태”로 명확히 캡슐화됨.
- **대안: 부모 state 유지**
  - 기존과 동일하게 부모가 `showPencilIcon` / `setShowPencilIcon`을 가지고, `showPencilIcon`과 `onMouseEnter`/`onMouseLeave`에서 호출할 setter를 props로 넘김. 동작은 100% 동일하지만 props가 늘어남.

**설계서 권장**: 자식(ProfileCard) 내부 state로 두고, 해당 props는 넘기지 않음.

### 5.2 File input과 연필 버튼 클릭

- **연필 클릭**
  1. ProfileCard: 연필 버튼 `onClick`에서 `onPencilClick()` 호출.
  2. 부모 `onPencilClick` 구현: `setShowImageUpload(true)` 후 `fileInputRef.current?.click()` 호출.
  3. 파일 선택 대화상자 표시.
- **파일 선택 후**
  1. `<input type="file" ref={fileInputRef} onChange={onFileChange} />`는 ProfileCard가 렌더하되, `ref`와 `onChange`는 부모에서 받음.
  2. 사용자가 파일 선택 시 `onFileChange`(부모의 `handleImageSelect`) 실행.
  3. 부모가 파일 검증, FileReader, `setShowCropModal(true)` 등 처리. 크롭 모달·API 호출·`setProfileUrl`은 모두 부모 책임.

이렇게 하면 기존과 동일한 “연필 클릭 → 파일 선택 → 크롭 모달” 흐름이 유지됨.

---

## 6. 모달과의 연결 방식

- **크롭 모달 / 패스워드 확인 모달 / 패스워드리스 QR·완료·해지 모달**은 모두 **page.tsx에 그대로 두고**, 구조·state·API 호출은 변경하지 않음.
- ProfileCard는 다음만 수행:
  - **비밀번호 변경**: `onPasswordChange()` 호출 → 부모가 `setPasswordVerifyTarget('/mypage/updatepassword')` + `setShowPasswordVerifyModal(true)`.
  - **정보수정**: `onProfileEdit()` 호출 → 부모가 `setPasswordVerifyTarget('/mypage/updateprofile')` + `setShowPasswordVerifyModal(true)`.
  - **패스워드리스 해지**: `onPwlsWithdraw()` 호출 → 부모가 `setShowPwlsWithdrawalModal(true)`.
  - **패스워드리스 등록**: `onPwlsRegister(email)` 호출 → 부모가 `openPwlsRegister(email)` 등 기존 로직 실행 (QR 모달 등 연쇄는 부모에서 처리).

즉, 프로필 카드는 “이 버튼을 눌렀다”는 **요청만** 콜백으로 전달하고, 모달을 띄우고 닫는 것은 전부 부모 책임.

---

## 7. 분리 시 주의사항

- **DOM·className**
  - `<section className={styles.profile}>`, `avatarWrap`, `avatar`, `avatarImg`, `profileText`, `nickname`, `profileLikesRow`, `email`, `phone`, `credits`, `profileActions`, `iconLink`, `inputHidden` 등 **기존 구조와 class명을 그대로 유지**. `mypage.module.css` 수정·class명 변경 금지.
- **아이콘**
  - `Pencil`, `Heart`, `KeyRound`, `UserCog`, `Unplug`, `Fingerprint` 등 기존과 동일한 lucide-react 아이콘 사용.
- **마이페이지 전용**
  - 게시판/홈/관리자 등 다른 화면의 프로필 UI는 건드리지 않음. 공통 `ProfileCard`로 전역화하지 말 것.
- **state·API**
  - 모달 state, API 호출, `handleImageSelect`/`handleCropConfirm`, `openPwlsRegister` 등은 부모에만 두고, ProfileCard에는 콜백과 표시용 값만 전달.
- **성능**
  - 이번 단계에서는 `dynamic()`, `memo`, `useMemo`, `React.memo` 등 성능 최적화 추가 금지.
- **CSP·보안**
  - `dangerouslySetInnerHTML`, `eval`, `new Function`, 인라인 script, 외부 CDN, 런타임 script 삽입, CSP 완화 전제 해결책 사용 금지. 스타일은 기존 CSS Modules 범위 내만 사용.

---

## 8. 가장 안전한 책임 배치 요약

| 구분 | 부모(page.tsx) | ProfileCard |
|------|----------------|-------------|
| **데이터·state** | `user`, `profileUrl`, `receivedLikes`, `pwlsRegisterLoading`, `pwlsWithdrawalLoading`, `fileInputRef`, 모달 관련 모든 state | (없음. 전부 props로 받음) |
| **hover(연필)** | (없음) | 내부 `showPencilIcon` state로 표시 제어 |
| **파일 선택** | `fileInputRef` 소유, `handleImageSelect`(검증·크롭 모달 오픈) | `ref` + `onFileChange` 받아 input 렌더, 연필 클릭 시 `onPencilClick()` 호출 |
| **버튼 액션** | 비밀번호 확인/정보수정/패스워드리스 해지·등록의 실제 처리 및 모달 제어 | 해당 4가지에 대해 콜백만 호출 |
| **표시** | `formatPhone11`로 `phoneDisplay` 계산 후 전달, 그 외 값 props 전달 | 받은 props로만 렌더, 기존 DOM·className 유지 |
| **모달** | 크롭/비밀번호 확인/패스워드리스 관련 모달 전부 소유·렌더 | 모달 없음. “열기 요청”만 콜백으로 전달 |

이렇게 두면 기존 동작이 바뀌지 않고, 프로필 카드만 마이페이지 전용 컴포넌트로 분리되며, 운영 배포 환경(CSP 등)에서도 기존 허용 범위만 사용하게 됨.
