# 웹·네이티브 기능 패리티 매트릭스

이 문서는 웹 구현을 React Native UI로 다시 만든 범위와 검증 근거를 기록한다.
웹 DOM, Tailwind 컴포넌트, Next.js 클라이언트 코드는 네이티브에서 가져오지 않는다.

| 웹 기능/경로 | 네이티브 구현 | 데이터·인증 계약 | 코드 검증 | 외부 검증 |
| --- | --- | --- | --- | --- |
| `/auth` | 이메일 가입·인증·로그인, Google/Kakao, 비밀번호 재설정, 3단계 온보딩 | Supabase PKCE, `nyampick://auth/callback`, SecureStore | 타입·하네스·번들 | iOS/Android 공급자 로그인 필요 |
| 식단, `/meal`, `/meal/overview` | 주 이동, 끼니 CRUD·반응, 오늘/주간 식단표 기본 공유 시트 | `/api/meals` bearer token | 타입·하네스·번들 | 기기 공유 대상 확인 필요 |
| 냉장고, `/fridge`, `/fridge/edit` | 검색·분류·큐브 이유식·소비기한 CRUD, 영수증 촬영/후보 선택 | `/api/fridge/*` bearer token | 타입·하네스·번들 | 카메라 권한·OCR·Android 활동 복구 필요 |
| `/recipe` | 선택 재료 AI 추천, 저장 레시피 CRUD, 반응·즐겨찾기·외부 링크 | `/api/recipes/*` bearer token | 타입·하네스·번들 | 운영 AI 응답 확인 필요 |
| `/mypage`, `/children`, `/family` | 보호자/아이 사진, 아이·가족 관리, 초대 코드 복사, 지원·정책 링크, 확인 문구형 회원탈퇴 | `/api/profile`, `/api/children`, `/api/family`, `/api/account` bearer token | 타입·하네스·번들 | 사진 권한·클립보드·테스트 계정 탈퇴 확인 필요 |
| 공개 정책 페이지 | 네이티브에서 공개 웹 `privacy`·`terms`를 외부로 연다 | 공개 URL만 사용 | 모바일 하네스·웹 SEO 하네스 | 기기 브라우저 열기 확인 필요 |

## 공통 품질 경계

- `apps/mobile`은 `next/*`, 웹 DOM API, 서버 모듈을 import하지 않는다.
- API에는 공개 `EXPO_PUBLIC_*` 값과 사용자 bearer token만 사용한다. 서비스 역할 키는 서버에만 둔다.
- 사용자 수에 따라 늘어나는 냉장고·레시피 목록은 `FlatList`로 렌더링한다.
- 앱 내 공유·클립보드·사진 선택은 웹 API가 아닌 React Native/Expo 기능을 사용한다.
- 공개 웹의 robots, sitemap, metadata, JSON-LD는 SEO 하네스가 관리하며, 인증된 앱 데이터는 SEO 대상이 아니다.

## 반복 검증 명령

```bash
npm run platform:check
npm run test:unit
npm run build

cd apps/mobile
npx expo export --platform ios --output-dir /tmp/nyampick-ios
npx expo export --platform android --output-dir /tmp/nyampick-android
```

실기기 확인 순서는 [모바일 기기 QA](./mobile-device-qa.md)를 따른다. 번들 및 하네스 통과는 공급자 콘솔, 카메라, 공유 시트, 운영 API의 실제 성공을 대체하지 않는다.
