# 2026-06-14 출시 전 개선 진행표

목표: GitHub Issue 없이도 repo 안에서 남은 작업을 추적하고, 하나씩 완료 처리한다.

## 진행 규칙

- 새 작업은 이 문서에 먼저 추가한다.
- 작업 시작 시 `Doing`으로 옮기고, 끝나면 `Done`으로 옮긴다.
- 사용자에게 확인이 필요한 항목은 `Blocked`에 둔다.
- 구현 완료 기준은 `2026-06-14-release-polish-backlog.md`와 `2026-06-14-github-issue-drafts.md`를 따른다.

## Doing

- [ ] 랜딩/온보딩 이미지 정리
  - 현재 브랜치: `feat/landing-cutout-animation`
  - 내용: 흰 배경 GIF 대신 누끼 PNG 기반 이미지로 교체
  - 확인 필요: 헤더/앱 아이콘까지 최종 이미지로 통일할지 별도 브랜치에서 처리

## Todo

### P0

- [ ] 식단표 다운로드/저장 이미지 잘림 수정
- [ ] 영수증 스캔 UX 개선

### P1

- [ ] 홈 화면 아기 카드 아래 이유식 준비 가이드 추가
- [ ] 홈 화면 상단 카피라이팅/디자인 일부 변경
- [ ] 식단표 이미지/차트 구성 재설계
- [ ] Kakao 소셜 인증 기준 정리

### P2

- [ ] 알레르기 관리 기능 구현
- [ ] 유입 경로 질문 추가: `어느 경로로 이 앱을 알게됐나요?`
- [ ] 랜딩페이지 손그림 이미지/보호자 이름/아기 이름 예시 정리
- [ ] 메인 아이콘/앱 아이콘 최종 이미지로 통일

## Blocked

- [ ] 식단표 이미지/차트 구성 재설계
  - 사유: Notion 식단표 레퍼런스 확인 필요

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
- [x] 가족구성원 역할명 변경
  - 위치: `src/features/family/hooks/use-family-page.ts`, `src/lib/server/family-access.ts`
  - 범위: 선택지를 `배우자/가족/친구/도우미`로 변경하고 기존 할머니/할아버지/가족 구성원 라벨은 `가족`으로 표시
- [x] 이메일 회원가입 인증 흐름 추가
  - 위치: `src/app/api/auth/email-verification/*`, `src/app/api/auth/email-signup/route.ts`, `src/features/auth/ui/auth-form-view.tsx`
  - 범위: 인증번호 요청/확인, 인증 토큰 검증 후 서버 회원가입, Resend 발송 env, Supabase 저장 SQL 문서 추가
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

## 다음 작업 후보

1. 식단표 이미지 저장 잘림 재현 및 수정
2. 영수증 스캔 UX 개선
3. 홈 화면 아기 카드 아래 이유식 준비 가이드 추가
4. 유입 경로 질문 추가
5. 알레르기 관리 기능 구현
