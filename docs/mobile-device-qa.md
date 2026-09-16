# Nyampick 모바일 기기 QA

이 문서는 Expo 네이티브 앱의 외부 검증 기록이다. 번들 성공만으로 인증 공급자와 운영 API가 정상이라고 판단하지 않는다.

## 현재 외부 검증 상태

- 2026-09-07: iOS 기기는 개발 환경에서 감지됐지만 `Offline` 상태여서 Google·Kakao callback과 Apple 네이티브 로그인은 실행하지 못했다.
- Android 기기 연결과 실제 provider callback도 아직 기록되지 않았다.
- 2026-09-07: iPhone 17 Pro 시뮬레이터에는 development client를 설치해 로그인 화면 렌더링과 `nyampick://` OS 확인창 도달을 확인했다. macOS 보조 접근 권한이 없어 확인창 이후 callback 오류 UI 자동 검증은 하지 못했다.
- 따라서 이 문서의 기기별 OAuth, DB round-trip 항목은 통과로 간주하지 않는다.

## 시작 전

1. Node 22 또는 24 LTS를 사용한다.
2. `apps/mobile/.env`에 Supabase 공개 URL·anon key·운영 API URL을 넣는다. 서비스 역할 키는 절대 넣지 않는다.
3. `app.json`의 다음 식별자를 배포 대상과 일치시킨다.
   - scheme: `nyampick`
   - iOS bundle identifier: `kr.nyampick.app`
   - Android package: `kr.nyampick.app`
4. `docs/supabase-registration-consent.sql` migration을 Supabase SQL Editor에 적용한다. 적용 전에는 신규 가입을 운영에 열지 않는다.
5. `docs/supabase-meals.sql` migration을 Supabase SQL Editor에 적용한다. 특히 `saved_recipes.recipe_data`, `receipt_scan_sessions`, `confirm_receipt_scan_session`이 있어야 AI 레시피 저장과 영수증 확정이 안전하게 동작한다.
6. Supabase Auth Redirect URL Allow List에 `nyampick://auth/callback*`을 등록한다. 첫 소셜 가입의 일회성 callback query를 위해 필요한 경로 한정 wildcard이며, 도메인 전체 wildcard를 쓰지 않는다.
7. Google OAuth와 Kakao Developers 콘솔의 Redirect URI에는 Supabase Auth > Providers 화면에 표시되는 `https://<project-ref>.supabase.co/auth/v1/callback`을 정확히 등록한다. `nyampick://auth/callback`은 Supabase의 allow list에만 등록한다. 각 플랫폼 앱 식별자도 해당 콘솔에서 등록한다.
8. EAS에 Expo 프로젝트와 iOS/Android 서명 자격 증명을 연결하고, `apps/mobile/eas.json`의 `development` 프로필로 각 플랫폼 개발 빌드를 만든다.
9. `docs/apple-login-setup.md`에 따라 Apple App ID capability, Supabase Apple Client IDs, Apple provider를 설정하고 development client를 다시 빌드한다.

## iOS와 Android에서 각각 수행

- 앱을 새로 설치하고 이메일 가입, 이메일 로그인, 로그아웃을 확인한다.
- 이메일·Google·Kakao·Apple 첫 가입은 필수 약관 동의 전에는 시작할 수 없고, 동의 후에는 프로필 초기화 전에 동의 이력이 저장되는지 확인한다.
- 새 계정으로 첫 로그인 시 3단계 온보딩을 완료하고, 앱을 재시작해 다시 표시되지 않는지 확인한다.
- Google과 Kakao 로그인을 각각 시작해 앱의 `nyampick://auth/callback`으로 돌아오는지 확인한다.
- iPhone에서 Apple 공식 버튼으로 신규 가입·복귀 로그인·취소를 확인하고, 최초 1회 제공되는 이름과 이메일 가리기 relay 주소가 안전하게 유지되는지 확인한다.
- 비밀번호 재설정 메일 링크를 열고 새 비밀번호 저장 후 재로그인한다.
- 앱을 백그라운드로 보냈다가 복귀해 세션이 유지되는지 확인한다.
- 보호자와 아이 프로필 사진을 선택·저장하고, 앱을 재시작해 사진과 이유식 시작일이 유지되는지 확인한다. 아이 삭제는 마지막 아이를 삭제할 수 없다는 안내도 확인한다.
- 만료되거나 취소된 인증에서 오류 문구와 재시도 동작을 확인한다.
- 식단에서 이전·다음 주로 이동해 과거·미래 날짜의 기록을 조회하고, 메뉴명·수량·메모·반응을 수정하거나 삭제한 뒤 앱을 재시작해 저장 상태를 확인한다.
- 선택한 날과 일주일 식단표를 기기 공유 시트로 열어 메신저·메일에 올바른 날짜와 메뉴가 전달되는지 확인한다.
- 냉장고 재료를 분류·이름 검색으로 찾고 추가·수정·삭제한다. `큐브 이유식`으로 추가한 재료가 이름에 큐브를 포함해 해당 필터에 나타나는지, 소비기한을 비웠다가 다시 저장할 수 있는지, AI 추천에 해당 재료가 반영되는지 확인한다.
- 카메라 권한을 허용한 뒤 영수증을 촬영하고, 인식 후보를 선택해 냉장고에 저장되는지 확인한다. 권한 거절과 OCR 실패에서도 재시도 안내가 표시되는지 확인한다.
- Android 개발자 옵션의 `활동 유지 안 함`을 켠 상태에서 영수증 촬영을 마쳐도 앱으로 복귀한 사진이 분석되는지 확인한다.
- 레시피를 직접 추가·수정·즐겨찾기·삭제하고, 아이 반응·외부 링크 저장 및 링크 열기를 확인한다. AI 추천에서는 냉장고 재료를 선택·해제한 뒤 선택한 재료만으로 추천을 받고 저장할 수 있는지 확인한다.
- AI 추천을 저장한 뒤 앱을 완전히 종료·재시작해, 같은 레시피의 재료·조리 단계가 API 응답과 화면에서 유지되는지 확인한다. 다른 추천 카드를 저장해도 선택하지 않은 카드로 바뀌지 않아야 하며, 별도로 검증된 출처가 없는 생성 결과에는 임의의 출처 링크가 표시되면 안 된다.
- 영수증은 같은 `scanId` 확정 요청을 네트워크 재시도로 두 번 보내도 재료가 한 번만 추가되는지 확인한다. 다른 계정에서 해당 scanId를 확인하거나 확정하면 404여야 하며, 15분이 지난 scanId는 410이어야 한다.
- 아이 선택·추가와 가족 코드 생성·복사·참여·해제를 서로 다른 두 계정으로 확인한다. 소유자 계정에서는 구성원별 연결 해제 확인 대화상자와 권한 제한도 확인한다.
- 테스트 계정에서 `회원탈퇴` 확인 문구를 입력해 식단·냉장고·레시피·가족 데이터가 삭제되고 로그인 화면으로 돌아오는지 확인한다. 운영 계정으로는 실행하지 않는다.
- 개발팀 문의, 개인정보 처리방침, 이용약관을 열어 메일 앱 또는 공개 웹 페이지가 정상적으로 열리는지 확인한다.
- 작은 기기와 큰 기기에서 Safe Area, 키보드, 하단 탭, 바텀 시트가 가려지지 않는지 확인한다.

## 기록할 결과

기기마다 OS 버전, 앱 빌드 식별자, Supabase 프로젝트, 검증 일시를 기록한다. 실패하면 화면·네트워크 응답·OAuth 공급자 오류를 함께 남기되 access token, 이메일, 아이 정보, 가족 코드는 포함하지 않는다.

## 개발 빌드 만들기

`apps/mobile`에서 Expo 계정으로 로그인한 뒤 다음을 실행한다. 처음 실행하면 EAS가 프로젝트와 서명 자격 증명을 안내한다.

```bash
npx eas-cli@latest build --platform all --profile development
npm run dev-client
```

사내 배포용 검증은 `preview`, 스토어 배포는 자동 빌드 번호 증가가 설정된 `production` 프로필을 사용한다. iOS 시뮬레이터 전용 빌드는 `development-simulator` 프로필을 사용한다.
