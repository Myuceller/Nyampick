# 2026-06-14 출시 전 개선 진행표

목표: GitHub Issue 없이도 repo 안에서 남은 작업을 추적하고, 하나씩 완료 처리한다.

## 진행 규칙

- 새 작업은 이 문서에 먼저 추가한다.
- 작업 시작 시 `Doing`으로 옮기고, 끝나면 `Done`으로 옮긴다.
- 사용자에게 확인이 필요한 항목은 `Blocked`에 둔다.
- 구현 완료 기준은 `2026-06-14-release-polish-backlog.md`와 `2026-06-14-github-issue-drafts.md`를 따른다.

## Doing

- 없음

## Todo

### P0

### P1

- [ ] 홈 화면 아기 카드 아래 이유식 준비 가이드 추가
- [ ] 홈 화면 상단 카피라이팅/디자인 일부 변경
- [ ] Kakao 소셜 인증 기준 정리
  - 목표: 이메일 동의항목, 본인인증 범위, Supabase provider scope 기준 문서화

### P2

- [ ] 랜딩페이지 손그림 이미지/보호자 이름/아기 이름 예시 정리
- [ ] 식단표 이미지/차트 구성 재설계

## Blocked

- [ ] 식단표 이미지/차트 구성 재설계
  - 사유: Notion 식단표 레퍼런스 확인 필요

## 릴리즈 개선 묶음 요약

### 인증/계정

- 소셜 로그인 첫 진입 실패를 줄이기 위해 OAuth 콜백 중복 처리와 redirect origin 흐름을 정리했다.
- 이메일 회원가입 인증번호 요청/확인/가입 흐름을 추가했다.
- 이미 가입된 이메일은 인증 요청과 가입 단계에서 차단하도록 정리했다.
- 비밀번호 재설정 메일 발송과 recovery 링크 기반 새 비밀번호 변경 흐름을 추가했다.
- 마이페이지 보호자 프로필에서 로그인된 이메일로 비밀번호 재설정 메일을 보낼 수 있게 연결했다.
- 회원탈퇴 확인 모달, 사용자 데이터 삭제, Supabase Auth 계정 삭제, 세션 정리 흐름을 구현했다.

### 주요 사용자 흐름

- 아기 관리에서 아기 카드 탭으로 대표 아기를 선택하고, 이름/개월 수/사진을 수정할 수 있게 했다.
- 이유식 시작 날짜와 D+ 표시를 홈 아기 카드에 연결했다.
- 알레르기 선택/직접 입력/삭제를 아기 수정 흐름에 넣고, 마이페이지 대표 아기 알레르기 표시와 연결했다.
- 영수증 스캔 UX를 촬영/선택 안내, 분석 중 문구, 실패/재시도, 결과 수정 후 추가 흐름으로 정리했다.
- 메뉴 추가 화면의 상단 컨트롤 고정, 선택 카드 전체 표시, 최근검색어 저장 기준을 개선했다.
- 식단표 이미지 저장 시 잘림을 줄이고, 오늘/주간 탭별 저장 이미지를 분리했다.

### UI/디자인/모바일 완성도

- 냉장고/레시피북/마이페이지 상단 sticky 영역을 정리하고 safe-area 겹침을 보정했다.
- 전역 스크롤바 숨김과 가로 overflow 방지를 적용했다.
- 로그인/회원가입 화면을 목업 기반으로 냠픽 디자인에 맞게 교체했다.
- 회원가입 화면에 이용약관/개인정보 필수 동의 UI와 약관 보기 모달을 추가했다.
- 온보딩 완료 후 유입 경로 설문을 추가하고 `user_metadata.referral_source`에 저장했다.
- 가족 역할 선택지를 `배우자/가족/친구/도우미`로 정리했다.
- PWA/TWA 앱 아이콘과 스플래시 리소스를 손그림 누끼 아이콘으로 통일했다.

### 배포/운영

- `release:check`, `release:pr` 명령어로 dev 검증 후 main PR을 만드는 배포 PR 자동화 스크립트를 추가했다.
- SEO에서 `냠픽`과 `Nyampick`을 같은 브랜드로 인식하도록 메타데이터/JSON-LD를 보강했다.

### 현재 브랜치에서 추가 정리

- OS 다크모드 때문에 앱 바깥/배경이 검게 보이는 문제를 막기 위해 웹 전역을 라이트 모드로 고정했다.
- Android TWA의 dark status/navigation 색상을 검정에서 냠픽 라이트 팔레트로 바꿨다.
- `main_app_icon1.png` 투명 원본을 기준으로 웹 아이콘, Android launcher icon, maskable icon, splash 이미지를 다시 생성했다.
- Android adaptive icon XML을 투명 배경 + foreground 아이콘 구조로 단순화했다.
- 다크모드 토글은 시도했지만 내부 화면의 고정 색상 대응 범위가 커서 이번 브랜치에서는 롤백했다.

## Done

- [x] 출시 전 개선 항목을 문서화함
  - `docs/issues/2026-06-14-release-polish-backlog.md`
  - `docs/issues/2026-06-14-github-issue-drafts.md`
- [x] GitHub Issue 자동 생성 대신 로컬 문서 기반 진행 방식으로 전환함
  - 사유: Connector 이슈 생성 결과가 정상 확인되지 않음
- [x] 알레르기 관리 페이지 준비중 처리 확인
  - 위치: `src/components/features/mypage/my-page.tsx`
  - 동작: 알레르기 영역 클릭 시 `알레르기 관리 화면은 준비 중입니다.` toast 표시
- [x] 마이페이지 비밀번호 변경 준비중 처리 확인
  - 위치: `src/app/mypage/profile/page.tsx`
  - 동작: 비밀번호 변경 클릭 시 `비밀번호 변경은 준비 중입니다.` toast 표시
- [x] 냉장고 페이지 검색창+카테고리 sticky 처리
  - 위치: `src/components/features/fridge/fridge-main-content.tsx`
  - 범위: 페이지 타이틀, 재료 검색, 카테고리 필터 영역 고정
- [x] 레시피북 페이지 검색+탭 네비게이션 sticky 처리
  - 위치: `src/components/features/recipe/recipe-page.tsx`
  - 범위: 페이지 타이틀, 레시피 검색, 전체/AI/즐겨찾기 탭 영역 고정
- [x] 마이페이지 `<- 마이페이지` 헤더 sticky 처리
  - 위치: `src/components/features/mypage/my-page.tsx`
  - 범위: 뒤로가기 버튼과 마이페이지 타이틀 고정
- [x] 로그인/회원가입 화면 디자인 개선
  - 위치: `src/features/auth/ui/auth-form-view.tsx`
  - 범위: 브랜드 헤더, 카피라이팅, 입력 폼, 소셜 로그인 버튼, 오류/안내 메시지 디자인 정리
  - 기준: 기존 auth 동작은 유지하고 냠픽 그린/카드/한글 행간 기준으로 통일
- [x] 회원가입 화면에 이용약관/개인정보 동의 UI 추가
  - 위치: `src/features/auth/ui/auth-form-view.tsx`
  - 범위: 필수/선택 약관 체크, 약관 보기 바텀 모달, 가입 전 필수 약관 검증
- [x] 앱 재진입 시 로그인 유지 중 auth 화면 노출 최소화
  - 위치: `src/lib/auth-session-cache.ts`, `src/app/auth/page.tsx`
  - 범위: 세션 캐시를 localStorage에 유지하고, 캐시가 있으면 auth 화면 대신 간단한 스피너 표시
- [x] 화면 옆에 보이는 스크롤바 제거 확인
  - 위치: `src/app/globals.css`
  - 범위: 전역 `scrollbar-width: none`, `::-webkit-scrollbar { display: none }`, `overflow-x: hidden`
- [x] 회원탈퇴 준비중 처리 확인
  - 위치: `src/components/features/mypage/my-page.tsx`
  - 동작: 회원탈퇴 클릭 시 `회원탈퇴는 준비 중입니다.` toast 표시
- [x] 회원탈퇴 실제 기능 구현
  - 위치: `src/app/api/account/route.ts`, `src/lib/server/account-deletion.ts`, `src/components/features/mypage/my-page.tsx`
  - 범위: `회원탈퇴` 확인 문구 입력 모달, 사용자 데이터 삭제, Supabase Auth 계정 삭제, 세션 정리 후 로그인 화면 이동
- [x] 가족구성원 역할명 변경
  - 위치: `src/features/family/hooks/use-family-page.ts`, `src/lib/server/family-access.ts`
  - 범위: 선택지를 `배우자/가족/친구/도우미`로 변경하고 기존 할머니/할아버지/가족 구성원 라벨은 `가족`으로 표시
- [x] 이메일 회원가입 인증 흐름 추가
  - 위치: `src/app/api/auth/email-verification/*`, `src/app/api/auth/email-signup/route.ts`, `src/features/auth/ui/auth-form-view.tsx`
  - 범위: 인증번호 요청/확인, 인증 토큰 검증 후 서버 회원가입, Resend 발송 env, Supabase 저장 SQL 문서 추가
- [x] 회원가입 중복 이메일 차단
  - 위치: `src/lib/server/auth-users.ts`, `src/app/api/auth/email-verification/request/route.ts`, `src/app/api/auth/email-signup/route.ts`
  - 범위: 이미 가입된 이메일은 인증 메일 요청/회원가입 단계에서 `이미 가입된 이메일입니다.`로 차단
- [x] 비밀번호 재설정 메일/변경 흐름 추가
  - 위치: `src/app/api/auth/password-reset/request/route.ts`, `src/features/auth/hooks/use-auth-page.ts`, `src/features/auth/ui/auth-password-reset-view.tsx`
  - 범위: 로그인 화면 비밀번호 찾기, Supabase reset 메일 발송, recovery 링크 진입 후 새 비밀번호 변경
  - 남은 일: 마이페이지 `비밀번호 변경` 버튼과 같은 흐름을 연결할지 별도 결정
- [x] 아기 수정하기 기능 추가
  - 위치: `src/app/children/page.tsx`, `src/features/children/hooks/use-children-page.ts`
  - 범위: 아기 카드 탭으로 메인 아기 선택, 이름/개월 수 수정 바텀시트, 사진 변경 흐름 정리
- [x] 첫 Google/Kakao 소셜 로그인 세션 확인 실패 수정
  - 위치: `src/features/auth/hooks/use-auth-page.ts`, `src/features/auth/lib/auth-utils.ts`, `src/app/auth/page.tsx`
  - 범위: OAuth 콜백 중복 교환 방지, 같은 브라우저 재로그인 오류 완화, auth 화면 hydration 보완
- [x] 상단 고정 헤더 safe-area/겹침 보정
  - 위치: `src/components/features/fridge/fridge-main-content.tsx`, `src/components/features/recipe/recipe-page.tsx`, `src/components/features/mypage/my-page.tsx`
  - 범위: 냉장고/레시피북/마이페이지 상단 고정 영역과 본문 겹침 방지, 한글 제목 줄높이 보정
- [x] 메뉴 추가 화면 상단 고정 및 선택 상태 개선
  - 위치: `src/app/meal/edit/page.tsx`
  - 범위: 메뉴 추가 헤더/검색/탭/필터 영역 고정, 목록만 스크롤, 선택 카드 전체 초록 배경 표시
- [x] 메뉴 추가 최근검색어 로직 개선
  - 위치: `src/features/meal/hooks/use-meal-edit-page.ts`, `src/app/meal/edit/page.tsx`
  - 범위: Enter 의존 제거, 2글자 이상 검색어 자동 저장, 메뉴 기록 시 검색어 저장, 빈 최근검색어 영역 숨김
- [x] 식단표 다운로드/저장 이미지 잘림 수정
  - 위치: `src/app/meal/overview/page.tsx`
  - 범위: 저장용 SVG 크기 산출 안정화, 셀 내부 긴 메뉴명 줄바꿈/말줄임, 오늘/일주일 탭별 이미지 저장
- [x] 유입 경로 질문 추가
  - 위치: `src/features/auth/ui/referral-survey-view.tsx`, `src/features/auth/hooks/use-auth-page.ts`
  - 범위: 온보딩 완료 후 `어느 경로로 이 앱을 알게됐나요?` 카드형 설문 표시, 선택값을 `user_metadata.referral_source`에 저장
- [x] 메인 아이콘/앱 아이콘 최종 이미지로 통일
  - 위치: `public/icons/*`, `android/twa/app/src/main/res/mipmap-*`, `android/twa/app/src/main/res/drawable-*`, `android/twa/store_icon.png`
  - 범위: `public/main_app_icon.png`에서 체크무늬 배경을 제거한 `main_app_icon1.png` 생성 후 PWA/TWA 아이콘 리소스 재생성
- [x] 배포 PR 자동화
  - 위치: `package.json`, `scripts/create-release-pr.mjs`
  - 사용: `npm run release:check`로 lint/test/build 검증, `npm run release:pr`로 `dev -> main` PR 생성
  - 범위: `dev` 브랜치에서만 실행, 작업트리가 깨끗해야 진행, 이미 열린 릴리즈 PR이 있으면 재사용 안내
- [x] 마이페이지 비밀번호 재설정 메일 발송 연결
  - 위치: `src/app/mypage/profile/page.tsx`
  - 범위: 로그인된 보호자 이메일로 Supabase 비밀번호 재설정 메일 발송, 요청 중 중복 클릭 방지, 성공/실패 toast 표시
- [x] 영수증 스캔 UX 개선
  - 위치: `src/components/features/fridge/receipt-scan-modal.tsx`, `src/features/fridge/hooks/use-fridge-page.ts`, `src/app/api/fridge/receipt-confirm/route.ts`
  - 범위: 촬영/선택 안내 보강, 분석 중 단계 문구 개선, 실패 화면/재시도 추가, 인식 결과 재료명/종류 수정 후 추가
- [x] 알레르기 관리 기능 구현
  - 위치: `src/app/children/page.tsx`, `src/features/children/hooks/use-children-page.ts`, `src/app/api/children/route.ts`, `src/lib/server/supabase-children.ts`, `src/components/features/mypage/my-page.tsx`, `docs/supabase-meals.sql`
  - 범위: 아기 수정 바텀시트에서 알레르기 선택/직접 입력/삭제, 대표 아기 알레르기 마이페이지 표시, `child_profiles.allergies` 저장
  - 배포 전 확인: Supabase SQL에서 `alter table public.child_profiles add column if not exists allergies text[] not null default '{}';` 적용 필요
- [x] 라이트 모드 고정 및 Android TWA 아이콘/색상 정리
  - 위치: `src/app/globals.css`, `android/twa/twa-manifest.json`, `android/twa/app/build.gradle`, `android/twa/app/src/main/res/*`
  - 범위: OS 다크모드 자동 반전 방지, TWA dark status/navigation 색상 라이트 팔레트 적용, `main_app_icon1.png` 기반 launcher/maskable/splash 리소스 재생성
  - 검증: `npm run lint`, `npm run build`, `./gradlew assembleDebug`, 에뮬레이터 APK 재설치
- [x] 인증/가입/온보딩 잔여 기준 정리
  - 위치: `src/constants/terms.ts`, `src/constants/referral.ts`, `src/features/auth/lib/auth-terms.ts`, `src/features/auth/lib/social-profile.ts`, `src/features/auth/ui/auth-form-view.tsx`, `src/features/auth/ui/referral-survey-view.tsx`, `src/app/api/profile/route.ts`, `docs/kakao-social-auth-scope.md`, `tests/auth-polish.test.ts`
  - 범위: 약관 본문 상수 분리, 필수 약관 검증 유틸화, 유입 경로 선택지 정리, 카카오 이메일 누락 안내, 카카오 소셜 로그인 수신 정보와 본인인증 한계 문서화
  - DB 변경: 없음. 유입 경로는 Supabase Auth `user_metadata.referral_source`에 저장

## 다음 작업 후보

1. 홈 화면 아기 카드 아래 이유식 준비 가이드 추가
2. 랜딩페이지 손그림 이미지/보호자 이름/아기 이름 예시 정리
3. 식단표 이미지/차트 구성 재설계
