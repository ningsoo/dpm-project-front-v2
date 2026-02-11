# 사이트 아이콘·로고 에셋

**사이트 파비콘(탭 아이콘)** 과 **헤더/푸터 로고** 등에 쓸 이미지와 관련 코드를 두는 폴더입니다.  
외부에서 접근하는 용도가 아니라, 이 사이트의 브랜딩용 에셋만 모아 둡니다.

## 넣을 것

- **이미지**: `favicon.ico`, `logo.png`, `logo-dark.png` 등
- **코드**: 로고/아이콘 경로를 모아 둔 `paths.ts` (이미 있음)

## 사용 방법

- **이미지를 이 폴더에 넣은 경우**  
  컴포넌트에서 직접 import 해서 사용:
  ```ts
  import logo from '@/assets/site/logo.png';
  // <img src={logo.src} alt="로고" />
  ```
- **경로만 쓰고 싶은 경우**  
  이미지를 `public/site-assets/` 에 두고, `paths.ts`의 경로를 그에 맞게 수정한 뒤  
  `import { SITE_LOGO_PATH } from '@/assets/site/paths'` 로 사용하면 됩니다.

이 폴더에 아이콘·로고 이미지와 코드를 넣어 두시면 됩니다.
