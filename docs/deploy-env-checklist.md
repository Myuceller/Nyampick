# Deployment ENV Checklist (Vercel/Supabase)

## 1) Required variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (배포 도메인)

## 2) Optional (AI 기능 쓸 때 사실상 필수)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (기본값: `gpt-4.1-mini`)
- `OPENAI_VISION_MODEL` (기본값: `gpt-4.1-mini`)

## 3) Vercel 설정
- Vercel > Project > Settings > Environment Variables에 위 값 등록
- `NEXT_PUBLIC_APP_URL`은 실제 배포 URL로 설정
  - 예: `https://your-app.vercel.app`
- Preview/Production 환경 각각 필요한 값 넣기

## 4) Supabase 설정
- Supabase > Project Settings > API에서 URL/Keys 확인
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이므로 절대 클라이언트 코드에 노출 금지
- Auth Redirect URL에 다음 등록
  - `http://localhost:3000/auth`
  - `https://YOUR_DEPLOYED_DOMAIN/auth`

## 5) 소셜 로그인(카카오/구글) 점검
- Provider 콘솔에 Redirect URI 정확히 등록
- Supabase Auth Provider 설정과 동일한 Redirect URI 사용
- 카카오 추가 동의항목(이메일 등) 사용 시 콘솔에서 해당 항목 활성화/심사 상태 확인

## 6) 배포 전 최종 점검
- `npm run lint`
- `npm run build`
- 로그인/로그아웃, `/api/profile`, `/api/fridge/items`, `/api/recipes/*` 호출 확인
- 영수증 스캔/AI 추천 기능 사용 시 OpenAI 키 동작 확인

## 7) 보안 체크
- `.env.local`/실키는 Git에 절대 커밋하지 않기
- 키 유출 의심 시 즉시 재발급(rotate)
