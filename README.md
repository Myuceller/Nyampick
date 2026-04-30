# 냠픽

냠픽은 아이 식단 기록, 냉장고 재료 관리, 영수증 스캔, AI 레시피 추천을 한 번에 다루는 모바일 중심 웹앱입니다.

## 주요 기능

- 아이별 식단 기록: 아침, 점심, 저녁, 간식 기록
- 일주일 식단표 전체보기 및 이미지 저장
- 냉장고 재료 관리: 일반 재료, 이유식 큐브, 소스, 간식 분류
- 영수증 스캔 기반 재료 후보 추출
- 냉장고 재료와 식단 맥락을 활용한 AI 레시피 추천
- 아기 관리, 가족 연동, 알레르기 정보 확인
- PWA 설치 지원
- 공개 랜딩 페이지, OG 이미지, sitemap, robots 설정

## 기술 스택

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth / Database
- OpenAI API
- Sonner Toast
- PWA manifest / service worker

## 시작하기

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

로컬 개발은 `.env.local`, 배포는 배포 플랫폼의 환경 변수 또는 `.env.production`에 설정합니다.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini
```

배포 환경에서는 `NEXT_PUBLIC_APP_URL`을 실제 배포 주소로 설정해야 합니다.

```env
NEXT_PUBLIC_APP_URL=https://nyampick.vercel.app
```

## 스크립트

```bash
npm run dev        # 개발 서버
npm run dev:clean  # .next 삭제 후 개발 서버
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript 검사
npm run build      # 프로덕션 빌드
npm start          # 빌드 결과 실행
```

## 주요 라우트

- `/landing`: 공개 랜딩 페이지
- `/auth`: 로그인/회원가입
- `/`: 홈
- `/meal/edit`: 식단 편집
- `/meal/overview`: 식단 전체보기
- `/fridge`: 냉장고
- `/fridge/edit`: 냉장고 편집
- `/recipe`: 레시피 추천
- `/children`: 아기 관리
- `/mypage`: 마이페이지

## API

- `GET /api/home/summary`
- `GET|POST|PATCH|DELETE /api/meals`
- `GET|POST|PATCH|DELETE /api/fridge/items`
- `POST /api/fridge/receipt-scan`
- `GET /api/fridge/receipt-scan?scanId=...`
- `POST /api/fridge/receipt-confirm`
- `GET /api/recipes/recommendations`
- `GET|POST /api/recipes/saved`
- `GET /api/profile`
- `GET|POST /api/children`
- `POST /api/children/invite-code`
- `POST /api/children/join-code`
- `POST /api/children/unlink`

자세한 요청/응답 형식은 [docs/api-spec.md](docs/api-spec.md)를 참고합니다.

## 배포 전 확인

```bash
npm run lint
npx tsc --noEmit
npm run build
```

추가로 확인할 항목:

- 배포 환경 변수 설정
- Supabase Auth Site URL / Redirect URL 설정
- Kakao OAuth Redirect URI 설정
- `/landing`, `/robots.txt`, `/sitemap.xml`, `/og-image.svg` 접근 확인
- 로그인, 식단 저장, 냉장고 저장, 영수증 스캔, 레시피 추천 동작 확인

## 문서

- [API Spec](docs/api-spec.md)
- [Codex Workflow](docs/codex-workflow.md)
- [Release Checklist](docs/release-checklist.md)
- [Deploy ENV Checklist](docs/deploy-env-checklist.md)
- [Kakao Login Checklist](docs/kakao-login-checklist.md)
- [Performance Baseline](docs/performance-baseline.md)
