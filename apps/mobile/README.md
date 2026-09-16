# 냠픽 모바일

Expo 기반 iOS·Android 네이티브 앱입니다. 웹과 같은 API 계약을 사용하되 DOM/Tailwind 코드를 가져오지 않고 React Native UI로 구현합니다.

- 홈 요약, 날짜별 식단 기록·메뉴/수량/메모/반응 수정·삭제, 오늘·주간 식단표 공유
- 냉장고 분류·큐브 이유식·추가·수정·소비기한·삭제와 영수증 스캔
- 냉장고 재료 선택형 AI 레시피 추천, 저장 레시피 CRUD, 아이 반응·외부 링크
- 계정별 3단계 온보딩, 보호자·아이 사진, 이유식 시작일, 가족 코드 복사·연결 관리, 지원·정책 링크, 확인 문구형 회원탈퇴

## 실행

```bash
# 저장소 루트에서
npm run mobile:start
npm run mobile:ios
npm run mobile:android
```

`apps/mobile` 폴더에서는 `npm run start`, `npm run ios`, `npm run android`를 사용합니다. iOS 시뮬레이터는 macOS와 Xcode가 필요하며, Android는 Android Studio 에뮬레이터 또는 Expo Go를 사용할 수 있습니다.

소셜 로그인처럼 `nyampick://` 딥링크를 확인할 때는 Expo Go 대신 개발 빌드를 사용합니다.

```bash
npx eas-cli@latest build --platform all --profile development
npm run dev-client
```

내부 테스트는 `preview`, 앱 스토어 제출은 `production` 프로필을 사용합니다. 빌드 프로필은 [eas.json](./eas.json)에 있습니다.

## 인증 환경 설정

`apps/mobile/.env`에 아래 공개 값만 넣습니다. `SUPABASE_SERVICE_ROLE_KEY`처럼 서버 비밀값은 절대 앱에 넣지 않습니다.

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL=https://www.nyampick.kr
```

소셜 로그인과 비밀번호 재설정의 콜백은 다음처럼 구분해 설정합니다.

- Supabase Auth의 **Redirect URL Allow List**에는 `nyampick://auth/callback*`을 등록합니다. 첫 소셜 가입은 이 콜백에 짧은 일회성 식별자를 붙여 약관 동의를 해당 로그인 시도에만 연결합니다. `*`는 이 경로 뒤의 query만 허용하도록 쓰며, 다른 도메인이나 경로를 허용하지 않습니다.
- Google Cloud와 Kakao Developers의 **Redirect URI**에는 Supabase Auth > Providers 화면에 표시되는 `https://<project-ref>.supabase.co/auth/v1/callback`을 정확히 등록합니다. 네이티브 딥링크를 공급자 콘솔에 등록하지 않습니다.
- 개발용 Expo Go 주소는 기기마다 달라질 수 있으므로, 소셜 로그인 QA는 Expo 개발 빌드 또는 실제 앱 식별자로 진행합니다.

## 검증

```bash
# 저장소 루트에서
npm run platform:check

# Expo 번들 컴파일 확인
cd apps/mobile
npx expo export --platform ios --output-dir /tmp/nyampick-ios
npx expo export --platform android --output-dir /tmp/nyampick-android
```

실제 기기 검증 순서는 [모바일 기기 QA 체크리스트](../../docs/mobile-device-qa.md)를 따릅니다.
웹·네이티브 대응 범위와 검증 근거는 [기능 패리티 매트릭스](../../docs/mobile-parity-matrix.md)에 정리했습니다.

Node 22 또는 24 LTS를 사용하세요. React Native 0.86은 현재 사용 중인 Node 23을 지원하지 않습니다.
