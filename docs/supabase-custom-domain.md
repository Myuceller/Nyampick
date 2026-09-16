# Supabase Custom Domain 설정

목적: iOS·Android 소셜 로그인 안내에서 임의의 Supabase 프로젝트 주소 대신 냠픽 도메인을 표시한다.

권장 주소: `api.nyampick.kr`

> Supabase custom domain은 Auth 전용 주소가 아니라 프로젝트의 Auth·REST API·Storage 등에 함께 적용된다. 프로젝트당 하나만 연결할 수 있으므로 `auth.nyampick.kr`보다 범용적인 `api.nyampick.kr`을 사용한다.

## 사전 조건

- Supabase 유료 플랜과 Custom Domain add-on 활성화
- Supabase 프로젝트 Owner 또는 Admin 권한
- `nyampick.kr` DNS 레코드 수정 권한
- Google Cloud Console과 Kakao Developers의 OAuth 설정 수정 권한

키·토큰·프로젝트 식별자의 실제 값은 이 문서에 기록하지 않는다.

## Dashboard 설정

1. Supabase Dashboard에서 프로젝트를 선택한다.
2. `Settings → General → Custom Domains`로 이동한다.
3. `api.nyampick.kr`을 등록한다.
4. Dashboard가 제시하는 CNAME과 소유권 확인용 TXT 값을 DNS에 추가한다.
   - CNAME host 예시: `api`
   - CNAME target: Dashboard가 표시한 프로젝트 기본 도메인
   - TXT host 예시: `_acme-challenge.api`
   - TXT value: Dashboard가 표시한 인증값
5. DNS 전파 후 Dashboard에서 Verify를 완료한다.

## 활성화 전 OAuth 콜백 추가

Custom Domain을 먼저 활성화하면 기존 Google/Kakao 로그인이 중단될 수 있다. 두 provider 콘솔에 기존 callback과 신규 callback을 모두 등록한 뒤 활성화한다.

```text
기존: https://<project-ref>.supabase.co/auth/v1/callback
신규: https://api.nyampick.kr/auth/v1/callback
```

- Google Cloud Console: OAuth Client의 `Authorized redirect URIs`
- Kakao Developers: 앱의 Kakao Login `Redirect URI`

Provider 설정을 저장한 뒤 Supabase Dashboard로 돌아가 Custom Domain을 Activate한다.

## 앱 설정 전환

활성화와 provider callback 검증이 끝난 뒤 아래 URL 변수의 host를 `api.nyampick.kr`로 바꾼다.

- Web: `NEXT_PUBLIC_SUPABASE_URL`
- Expo: `EXPO_PUBLIC_SUPABASE_URL`

Anon/publishable key는 URL 변경만으로 새 값을 발급할 필요가 없다. 실제 값은 로컬·배포 환경변수에만 저장하고 문서, 로그, 커밋에 남기지 않는다.

## 검증

- iOS OAuth 시스템 안내에 `api.nyampick.kr`이 표시된다.
- Google 로그인 성공·취소·재시도가 앱으로 복귀한다.
- Kakao 로그인 성공·취소·재시도가 앱으로 복귀한다.
- 웹과 모바일에서 로그인 후 프로필·식단·냉장고 데이터가 정상 조회된다.
- 기존 Supabase 주소를 사용하는 사용자 세션의 전환 영향을 확인한다.
- 문제가 있으면 신규 URL 환경변수를 되돌리고 Custom Domain 활성 상태와 provider callback을 다시 점검한다.

공식 문서: [Supabase Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)
