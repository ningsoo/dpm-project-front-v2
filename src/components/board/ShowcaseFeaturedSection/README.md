# ShowcaseFeaturedSection Component

Showcase 게시판을 위한 Featured Section UI 컴포넌트입니다. 4개의 고정된 카드를 가로로 배치하고, 호버 및 클릭 인터랙션을 제공합니다.

## 주요 기능

### 1. 레이아웃
- **4개의 고정 카드**: 항상 4개의 카드가 가로로 배치됩니다
- **PC 전용**: 모바일에서는 숨김 처리됩니다
- **16:9 비율**: 카드의 높이/너비 비율이 일관되게 유지됩니다
- **중앙 정렬**: 섹션이 콘텐츠 영역 중앙에 배치됩니다

### 2. 카드 기본 상태
- 썸네일 이미지만 표시
- 제목과 작성자 이름은 기본적으로 숨김

### 3. 호버 동작
- **다크 오버레이**: 호버 시 그라데이션 오버레이 표시
- **제목/작성자 표시**: 오버레이 위에 텍스트 표시
- **비디오 자동 재생**: YouTube 비디오가 자동으로 재생됩니다 (음소거)
- **마우스 떠나면**: 비디오 정지 및 썸네일로 복귀

### 4. 클릭 동작
- **중앙 카드 클릭**: 해당 게시글 상세 페이지로 이동
- **좌우 카드 클릭**: 클릭한 카드가 중앙으로 이동하고 확대됩니다
- **이전 중앙 카드**: 옆으로 이동하고 크기가 줄어듭니다
- **부드러운 전환**: CSS transitions를 사용한 애니메이션

## 상태 구조

```typescript
interface State {
  posts: ShowcasePost[];           // 표시할 게시글 목록 (최대 4개)
  centerIndex: number;              // 현재 중앙 카드의 인덱스 (기본값: 1)
  hoveredIndex: number | null;      // 현재 호버된 카드의 인덱스
}
```

### 상태 관리 로직

1. **centerIndex**: 
   - 초기값은 `1` (2번째 카드가 중앙)
   - 카드 클릭 시 해당 인덱스로 업데이트
   - 카드 위치와 스케일 계산의 기준점

2. **hoveredIndex**:
   - `onMouseEnter`에서 설정
   - `onMouseLeave`에서 `null`로 리셋
   - 비디오 재생/정지 제어에 사용

## 카드 위치 및 이동 로직

### 위치 계산 (`getCardTransform`)

```typescript
const getCardTransform = (index: number): string => {
  const cardWidth = 280;        // 기본 카드 너비
  const gap = 24;               // 카드 간격
  const relativeIndex = index - centerIndex;  // 중앙 기준 상대 위치
  
  // 중앙 카드는 0, 좌측은 음수, 우측은 양수
  const translateX = relativeIndex * (cardWidth + gap);
  
  return `translateX(${translateX}px)`;
};
```

**동작 원리**:
- 중앙 카드(`centerIndex`)는 `translateX(0px)`로 원점에 위치
- 좌측 카드는 음수 값으로 왼쪽으로 이동
- 우측 카드는 양수 값으로 오른쪽으로 이동
- 각 카드는 `(카드 너비 + 간격) × 상대 위치`만큼 이동

**예시** (centerIndex = 1인 경우):
- 인덱스 0: `translateX(-304px)` (왼쪽으로 1칸)
- 인덱스 1: `translateX(0px)` (중앙)
- 인덱스 2: `translateX(304px)` (오른쪽으로 1칸)
- 인덱스 3: `translateX(608px)` (오른쪽으로 2칸)

### 스케일 계산 (`getCardScale`)

```typescript
const getCardScale = (index: number): number => {
  return index === centerIndex ? 1.15 : 1.0;
};
```

- 중앙 카드만 `scale(1.15)`로 15% 확대
- 나머지 카드는 `scale(1.0)`으로 기본 크기

### Z-Index 계산 (`getCardZIndex`)

```typescript
const getCardZIndex = (index: number): number => {
  return index === centerIndex ? 10 : 1;
};
```

- 중앙 카드는 `z-index: 10`으로 최상위
- 나머지 카드는 `z-index: 1`로 하위

## 호버 비디오 재생 처리

### 현재 구현 (YouTube iframe)

YouTube 비디오는 CORS 정책으로 인해 직접 `<video>` 태그로 재생할 수 없습니다. 따라서 YouTube iframe embed를 사용합니다.

```typescript
// 호버 시 iframe src를 설정하여 자동 재생
<iframe
  src={isHovered ? getYoutubeEmbedUrl(post.youtubeUrl) : ''}
  className={`${styles.video} ${isHovered ? styles.visible : styles.hidden}`}
  allow="autoplay; encrypted-media"
/>
```

**동작 방식**:
1. `hoveredIndex === index`일 때 iframe의 `src` 속성에 YouTube embed URL 설정
2. YouTube embed URL에 `autoplay=1&mute=1` 파라미터 포함
3. `isHovered`가 `false`가 되면 `src`를 빈 문자열로 설정하여 비디오 제거

### 로컬 비디오 파일 사용 시

로컬 비디오 파일이 있는 경우, 컴포넌트 내 주석 처리된 코드를 활성화하여 `<video>` 태그를 사용할 수 있습니다:

```typescript
<video
  ref={(el) => {
    videoRefs.current[index] = el;
  }}
  src={post.videoUrl}
  className={`${styles.video} ${isHovered ? styles.visible : styles.hidden}`}
  muted
  loop
  playsInline
/>
```

그리고 `useEffect`에서 비디오 재생을 제어:

```typescript
useEffect(() => {
  videoRefs.current.forEach((video, index) => {
    if (!video) return;
    
    if (hoveredIndex === index) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  });
}, [hoveredIndex]);
```

## CSS Transitions

모든 애니메이션은 CSS transitions를 사용하여 부드럽게 처리됩니다:

```css
.card {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.thumbnail {
  transition: opacity 0.3s ease;
}

.video {
  transition: opacity 0.3s ease;
}

.overlay {
  transition: opacity 0.3s ease;
}
```

- **transform**: 카드 이동 및 스케일 변경 (0.5초)
- **opacity**: 썸네일/비디오/오버레이 전환 (0.3초)

## 사용 방법

```tsx
import ShowcaseFeaturedSection from '@/components/home/ShowcaseFeaturedSection';

function HomePage() {
  return (
    <div>
      <ShowcaseFeaturedSection />
    </div>
  );
}
```

## 확장 가능성

1. **비디오 소스 확장**: `ShowcasePost` 인터페이스에 `videoUrl` 필드를 추가하여 로컬 비디오 파일 지원
2. **카드 개수 조정**: `TOTAL_CARDS` 상수를 변경하여 다른 개수의 카드 표시
3. **애니메이션 커스터마이징**: CSS 변수를 사용하여 transition 시간 및 easing 함수 조정
4. **반응형 지원**: 미디어 쿼리를 추가하여 태블릿/모바일 레이아웃 구현
