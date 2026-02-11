# Passwordless 로그인 스펙

## 2-1. 목적

Passwordless 등록/로그인 플로우를 로그인 화면에 통합한다.

---

## 2-2. 원본 HTML 엔드포인트/동작 요약

| 구분 | HTTP | URL / Body | 용도 |
|------|------|------------|------|
| **status** | GET | `/api/v1/auth/status?user={id}` | 등록 여부 판단. 응답 `json.data.exist` 로 기등록 여부 확인 |
| **register** | POST | `/api/v1/auth/register` body `{ id }` | 비밀번호 없음 등록. 응답 `json.data.qr` 로 QR 이미지 표시 |
| **login-trigger** | POST | `/api/v1/auth/login-trigger?userId={id}&ip=127.0.0.1` | 로그인 트리거. 응답 `json.data.servicePassword` 표시 후 폴링 시작 |
| **result** | GET | `/api/v1/auth/result?userId={id}` | 승인 결과 조회. `json.data.auth === "Y"` 이면 승인 성공 |
| **폴링** | - | - | result 호출 주기: **2초** |

- **status**: 사용자(id)가 이미 Passwordless 등록된 경우 `exist: true`
- **register**: 미등록 사용자가 등록 시 QR 코드 발급, 화면에 QR 표시
- **login-trigger**: 로그인 시도 시 일회용 코드(servicePassword) 발급, 화면에 6자리 코드 표시 후 result 폴링
- **result**: 2초마다 호출하여 `auth === "Y"` 이면 로그인 성공 처리(메인 이동 등)

---

## 2-3. UI 요구사항 요약 (추후 구현)

- **로그인 버튼 위**: 라디오 선택 — **Password** / **Passwordless**
- **하단 링크**: "Passwordless 설정" 링크 추가
- **Passwordless 설정 클릭 시 모달**
  - QR 코드 표시
  - 안내 텍스트
  - 카운트다운
  - 시간에 따라 줄어드는 게이지
- **Passwordless 로그인 시**
  - 비밀번호 input 자리에 **6자리 코드** 표시
  - 승인 **폴링** (result 2초 주기)
  - 성공 시 메인(또는 redirect)으로 이동

---

## 2-4. 원본 HTML 코드 전문

아래 영역에 원본 HTML 코드를 그대로 붙여넣기.

```html
<!-- 원본 HTML 코드 붙여넣기 -->
```
