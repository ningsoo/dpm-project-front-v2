# Soundock Frontend

음악을 좋아하는 사람들이 자기만의 플레이리스트를 공유하고, 마음에 드는 게시글에 후원까지 할 수 있는 커뮤니티 플랫폼 **Soundock**의 프론트엔드입니다.

[Soundock Backend](https://github.com/ningsoo/soundock)와 연동되어 동작하며, Next.js App Router 기반으로 개발했습니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router), React 18, TypeScript
- **상태관리**: Redux Toolkit, React Redux
- **HTTP 통신**: Axios
- **결제**: Toss Payments SDK
- **아이콘**: Lucide React
- **코드 품질**: ESLint, Prettier, Husky + lint-staged (커밋 전 자동 포맷팅/린팅)

## 주요 기능

### 홈
- Spotlight 캐러셀, 인기 Showcase, 인기 플레이리스트 노출

### 게시판
- 카테고리별 게시글 목록/상세/작성/수정
- YouTube 플레이리스트 첨부, 이미지 업로드
- 좋아요, 댓글

### 인증
- 로그인 / 회원가입
- 이메일 찾기 / 비밀번호 찾기 & 재설정
- 관리자 로그인

### 마이페이지
- 프로필 조회/수정, 비밀번호 변경, 회원 탈퇴
- 내 게시글 / 좋아요한 게시글 / 내 댓글
- YouTube 플레이리스트 연동 관리
- Pop 충전 (토스 페이먼츠 연동, 성공/실패 처리)
- 후원(도네이션) 내역, 정산 내역
- 문의 내역, 신고 내역

### 알림 & 메시지
- 알림 드롭다운
- 쪽지함 모달

### 날씨
- 지역별 습도 정보 모달

### 공지사항 & 문의
- 공지사항 목록/상세
- 1:1 문의 작성

### 관리자 (`/adm1n`)
- 게시글 / 댓글 관리
- 공지사항 작성/수정
- 후원 취소 요청 처리
- 문의 / 신고 관리
- 정산 관리, 이용 제재(penalty) 관리
- 회원 관리

## 프로젝트 구조

```
src/
├── app/                 # Next.js App Router 페이지
│   ├── auth/            # 로그인, 회원가입, 비밀번호/이메일 찾기
│   ├── boards/           # 게시판 목록/상세/작성/수정
│   ├── mypage/           # 마이페이지 (프로필, 충전, 정산, 문의 등)
│   ├── announcement/     # 공지사항
│   ├── inquiry/          # 1:1 문의
│   ├── event/             # 이벤트 페이지
│   └── adm1n/             # 관리자 페이지
├── components/           # 공통/도메인별 UI 컴포넌트
│   ├── common/            # Header, Footer, Toast, Carousel 등
│   ├── board/              # 게시글 카드, 작성/수정 폼
│   ├── home/                # 메인 페이지 섹션
│   └── adm1n/                # 관리자 전용 컴포넌트
├── api/                    # 도메인별 API 클라이언트 (axios)
├── store/                  # Redux Toolkit 스토어 & 슬라이스
├── contexts/               # React Context
└── utils/                  # 공통 유틸 함수
```

## 팀

**dopamine** — 총 팀원 4명, 2026년 1월부터 3월까지 개발
