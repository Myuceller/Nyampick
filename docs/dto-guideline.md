# DTO Guideline

## 목적
- API 응답/요청 구조를 화면 컴포넌트에서 분리한다.
- 서버 스키마 변경 영향 범위를 DTO/매퍼 계층으로 제한한다.
- 컴포넌트에서는 `ViewModel`만 다루도록 단순화한다.

## 기본 규칙
- DTO는 `src/lib/dto/*.ts`에 둔다.
- 네이밍은 `*Dto`, `*ResponseDto`를 사용한다.
- API 응답 파싱은 훅/서비스에서 DTO로 1회 캐스팅한다.
- 화면 모델 변환은 `map*DtoTo*` 매퍼 함수에서만 수행한다.
- 컴포넌트 내부에 `as { ... }` 인라인 타입 선언을 두지 않는다.

## 권장 폴더 구조
- `src/lib/dto/common.ts`
- `src/lib/dto/<domain>.ts`
- `src/components/features/<domain>/*-mappers.ts` 또는 `src/lib/mappers/<domain>.ts`

## 마이그레이션 순서
1. 기존 인라인 응답 타입을 DTO 파일로 이동
2. DTO -> ViewModel 매퍼 함수 도입
3. 훅/서비스에서 DTO + 매퍼 사용으로 교체
4. 컴포넌트에서 API 필드 의존 제거
5. 마지막에 중복 타입/로직 삭제

## 이번 적용 범위
- `recipe` 도메인: DTO + 매퍼 도입
- `mypage` 도메인: 프로필/아이 응답 DTO 분리
