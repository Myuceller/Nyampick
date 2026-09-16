# Nyampick API Spec

Base URL: `/api`

공통
- 요청/응답: `application/json`
- 앱 데이터는 Supabase에 영속 저장한다. 서버 route는 service-role 경로로만 데이터에 접근하며, 클라이언트가 service-role key를 사용하면 안 된다.
- 인증이 필요한 endpoint는 `Authorization: Bearer <Supabase access token>`이 필요하다. 인증 실패는 `401 { "message": "unauthorized" }`로 응답한다.
- 가족으로 연결된 사용자는 주 양육자 데이터 범위에서 조회·저장된다. 연결된 구성원은 새 초대 코드를 만들 수 없다.

## 0) Authentication & Registration

### POST `/api/auth/email-verification/request`
- Input: `{ "email": "parent@example.com" }`
- Output `200`: `{ "sent": true, "message": "인증 안내를 보냈어요." }`
- Development에서만 명시적 로컬 플래그에 따라 `devCode`가 포함될 수 있다. production 응답에는 포함되지 않는다.
- Error: `400` 잘못된 이메일, `429` IP·이메일 요청 한도 초과, `503` rate-limit migration/저장소 미준비

### POST `/api/auth/email-verification/verify`
- Input: `{ "email": "parent@example.com", "code": "123456" }`
- Output `200`: `{ "message": "이메일 인증이 완료됐어요.", "verificationToken": "..." }`
- `verificationToken`은 같은 이메일의 회원가입 요청에만 사용한다.

### POST `/api/auth/email-signup`
- Input: `{ "email": "parent@example.com", "password": "8자 이상", "verificationToken": "...", "consent": { "...": "필수 약관 동의" } }`
- Output `200`: `{ "message": "회원가입이 완료되었습니다." }`
- Error: `400` 인증·비밀번호·필수 약관 동의 오류, `409` 이미 가입된 이메일, `503` 약관 기록 저장소 미준비
- 이메일 가입은 검증된 이메일과 필수 약관 동의가 모두 있어야 한다. 공개 endpoint는 기존 Auth 사용자 목록을 조회하지 않는다.

### POST `/api/auth/registration-attempt`
- 소셜 회원가입 OAuth redirect 직전에 필수 약관 동의와 provider를 서버의 짧은 수명·일회성 attempt로 기록한다.
- Input: `{ "provider": "google" | "kakao" | "apple", "consent": { "...": "필수 약관 동의" } }`
- Output `200`: `{ "attemptId": "opaque-id" }`
- `attemptId`만 callback 이후 `/api/auth/registration-consent`에 전달한다. 약관 동의값이나 사용자 ID를 URL query에 싣지 않는다.

### POST `/api/auth/registration-consent`
- 인증 필요. OAuth callback 또는 iOS 네이티브 Apple ID token 로그인 뒤 서버가 bearer token의 사용자·provider와 attempt를 원자적으로 연결해 동의 기록을 저장한다.
- Input: `{ "attemptId": "opaque-id" }`
- Error: `400` 잘못되었거나 이미 소진된 attempt, `401` 인증 없음, `503` 동의 저장소 미준비

### POST `/api/auth/password-reset/request`
- Input: `{ "email": "parent@example.com" }`
- Output `200`: `{ "message": "비밀번호 재설정 메일을 보냈어요." }`
- 재설정 redirect origin은 local 개발 환경을 제외하고 `NEXT_PUBLIC_APP_URL`의 origin을 사용한다. 해당 URL은 Supabase redirect allow list와 일치해야 한다.

## 1) Home Summary

### GET `/api/home/summary`
- Input: 없음
- Output `200`
```json
{
  "summary": {
    "date": "2026-03-22",
    "todayMeals": {
      "date": "2026-03-22",
      "breakfast": [],
      "lunch": [],
      "dinner": [],
      "snack": []
    },
    "fridgeItemCount": 3,
    "familyMemberCount": 0
  }
}
```

## 2) Meals (Home)

### GET `/api/meals`
- Input: 없음
- Output `200`
```json
{ "meals": { "2026-03-22": { "date": "2026-03-22", "breakfast": [], "lunch": [], "dinner": [], "snack": [] } } }
```

### GET `/api/meals?date=YYYY-MM-DD`
- Query
  - `date`: `YYYY-MM-DD`
- Output `200`
```json
{ "meals": { "date": "2026-03-22", "breakfast": [], "lunch": [], "dinner": [], "snack": [] } }
```
- Error
  - `400`: `{ "message": "date must be YYYY-MM-DD format" }`
  - `404`: `{ "message": "meal data not found" }`

### POST `/api/meals`
- Input
```json
{ "date": "2026-03-22", "mealType": "breakfast", "items": ["사과", "요거트"] }
```
- Output `201`
```json
{ "meals": { "date": "2026-03-22", "breakfast": [{ "id": "...", "menuName": "사과" }], "lunch": [], "dinner": [], "snack": [] } }
```
- Error
  - `400`: `invalid mealType`, `items must be ...`

### PATCH `/api/meals`
- Input
```json
{
  "date": "2026-03-22",
  "mealType": "breakfast",
  "entryId": "...",
  "menuName": "사과 요거트볼",
  "quantity": "1인분",
  "memo": "잘 먹음",
  "reaction": "loved"
}
```
- Output `200`
```json
{ "meals": { "date": "2026-03-22", "breakfast": [{ "id": "...", "menuName": "사과 요거트볼", "reaction": "loved" }], "lunch": [], "dinner": [], "snack": [] } }
```
- Note
  - 수정 가능: `menuName`, `quantity`, `memo`, `reaction`
  - `reaction`: `"loved" | "okay" | "disliked" | null`
- Error
  - `400`: `entryId is required`, `invalid reaction`, `at least one field ...`
  - `404`: `meal data not found`

### DELETE `/api/meals`
- Input
```json
{ "date": "2026-03-22", "mealType": "breakfast", "entryId": "..." }
```
- Output `200`
```json
{ "meals": { "date": "2026-03-22", "breakfast": [], "lunch": [], "dinner": [], "snack": [] } }
```
- Error
  - `404`: `meal data not found`

## 3) Menus

### GET `/api/menus`
- Query (optional)
  - `category`: `rice | soup | side | snack | vitamin | other`
  - `favoritesOnly`: `true | false`
- Output `200`
```json
{ "menus": [{ "id": "1", "name": "닭안심 채소죽", "category": "rice", "isFavorite": true }] }
```
- Error
  - `400`: `{ "message": "invalid category" }`

## 4) Fridge

### GET `/api/fridge/items`
- Query (optional)
  - `category`: `fruit | vegetable | protein | dairy | grain | sauce | snack | other`
  - `keyword`: 문자열 포함 검색
- Output `200`
```json
{ "items": [{ "id": "...", "name": "사과", "category": "fruit", "quantity": "3개", "addedAt": "...", "source": "manual" }] }
```

### POST `/api/fridge/items`
- Input
```json
{ "name": "사과", "category": "fruit", "quantity": "3개", "expiresAt": "2026-03-29" }
```
- Output `201`
```json
{ "item": { "id": "...", "name": "사과", "category": "fruit", "quantity": "3개", "addedAt": "...", "source": "manual" } }
```
- Note
  - `category` 생략 시 서버 자동 분류

### PATCH `/api/fridge/items`
- Input
```json
{ "id": "...", "name": "청사과", "category": "fruit", "quantity": "2개", "expiresAt": "2026-03-30" }
```
- Output `200`
```json
{ "item": { "id": "...", "name": "청사과", "category": "fruit", "quantity": "2개", "addedAt": "...", "source": "manual" } }
```
- Error
  - `404`: `{ "message": "item not found" }`

### DELETE `/api/fridge/items`
- Input
```json
{ "id": "..." }
```
- Output `200`
```json
{ "ok": true }
```

## 5) Receipt Scan (Fridge)

### POST `/api/fridge/receipt-scan`
- Input
```json
{ "rawText": "사과\n삼겹살\n두부" }
```
- Output `201`
```json
{
  "scanId": "...",
  "createdAt": "...",
  "candidates": [
    { "tempId": "...-0", "name": "사과", "category": "fruit", "confidence": 0.96 },
    { "tempId": "...-1", "name": "삼겹살", "category": "protein", "confidence": 0.92 }
  ],
  "message": "영수증 스캔 후보를 반환했습니다. 선택한 항목만 /api/fridge/receipt-confirm 로 확정하세요."
}
```

### GET `/api/fridge/receipt-scan?scanId=...`
- Output `200`
```json
{ "id": "...", "createdAt": "...", "candidates": [] }
```
- Error
  - `404`: `{ "message": "scan session not found" }`

### POST `/api/fridge/receipt-confirm`
- Input
```json
{
  "scanId": "...",
  "selected": [
    { "tempId": "...-0", "category": "fruit", "quantity": "3개" },
    { "tempId": "...-1", "category": "protein", "quantity": "600g" }
  ]
}
```
- Output `200`
```json
{ "addedCount": 2, "items": [{ "id": "...", "name": "사과", "category": "fruit", "source": "receipt", "addedAt": "..." }] }
```
- Error
  - `404`: `{ "message": "scan session not found" }`

## 6) Recipe Recommendations

### POST `/api/recipes/recommendations`
- Input
```json
{ "ingredients": ["계란", "두부", "애호박"], "limit": 3 }
```
- `ingredients`: 공백이 아닌 문자열 1~20개, 각 80자 이하
- `limit`: 생략 시 3, 입력 시 1~10 사이의 정수
- Output `200`
```json
{
  "recommendations": [
    {
      "id": "stable-recommendation-id",
      "title": "두부 애호박찜",
      "subtitle": "부드럽게 먹기 좋은 단백질 반찬",
      "taste": "좋아해요",
      "ingredients": ["두부", "애호박", "계란"],
      "steps": ["재료를 작게 썬다", "부드럽게 익힌다", "한 김 식혀 담는다"]
    }
  ],
  "usage": {
    "inputTokens": 420,
    "outputTokens": 610,
    "totalTokens": 1030
  },
  "metrics": {
    "latencyMs": 2140,
    "fallbackUsed": false,
    "parseSuccess": true,
    "recommendationCount": 1
  },
  "correlationId": "request-correlation-id"
}
```
- 품질 검사를 통과한 결과가 요청 개수보다 적으면 1개 이상을 부분 성공으로 반환할 수 있다.
- 모델이 생성한 출처명·URL은 검증할 수 없으므로 만들거나 응답하지 않는다. 검증된 출처가 별도 연동되는 경우에만 optional `sourceName`·`sourceUrl`을 사용한다.
- 모든 응답은 `X-Correlation-ID`와 `Cache-Control: no-store` 헤더를 포함한다.
- Error
  - `400`: `INVALID_JSON`, `INVALID_INGREDIENTS`, `INVALID_LIMIT`
  - `401`: `UNAUTHORIZED`
  - `429`: `AI_RATE_LIMITED`, `AI_TOKEN_BUDGET_EXCEEDED` (`Retry-After` 포함 가능)
  - `503`: `AUTH_SERVICE_UNAVAILABLE`, `AI_RECOMMENDATION_UNAVAILABLE`

```json
{
  "code": "AI_RECOMMENDATION_UNAVAILABLE",
  "message": "레시피 추천을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
  "correlationId": "request-correlation-id"
}
```

## 6-1) Recipe Evaluation

### GET `/api/recipe-eval?count=10&seed=baseline`
- 재료 메타데이터 기반으로 평가 케이스를 자동 생성합니다.
- 생성형 추천은 검증되지 않은 출처를 만들지 않으므로 `requireSource` 기본값은 `false`입니다. 사용자 제공 또는 별도 검증된 출처를 평가할 때만 `true`로 설정합니다.
- Output `200`
```json
{
  "cases": [
    {
      "caseId": "generated_01",
      "ingredients": ["계란", "두부", "애호박"],
      "allergyIngredients": ["계란", "두부"],
      "unsafeIngredients": [],
      "expected": "알레르기 가능 재료를 안전하게 다루는지 평가",
      "checks": {
        "minIngredientUtilization": 0.6,
        "requireSource": false,
        "awkwardPairs": [],
        "requireBabyFriendlyTone": true,
        "requireCookingSteps": true,
        "avoidAllergyPush": true
      }
    }
  ]
}
```

### POST `/api/recipe-eval`
- Input
```json
{ "testCase": { "...": "GET 응답의 case" }, "recipeText": "AI가 생성한 레시피 본문" }
```
- Output `200`
```json
{
  "result": {
    "passed": true,
    "score": 85,
    "details": {
      "ingredientUtilization": 0.67,
      "usedIngredients": ["계란", "두부"],
      "missingIngredients": ["애호박"],
      "awkwardPairs": [],
      "hasSource": true,
      "hasAllergyCaution": true,
      "hasBabyFriendlyTone": true,
      "hasCookingSteps": true
    },
    "reasons": []
  }
}
```
- Error
  - `400`: `{ "message": "testCase is required" }`
  - `400`: `{ "message": "recipeText is required" }`

## 7) Profile (My Page)

### GET `/api/profile`
- Output `200`
```json
{ "profile": { "id": "me", "name": "하율맘", "babyName": "하율", "babyMonthsOld": 11, "email": "nyampick@example.com", "profileImageUrl": "data:image/jpeg;base64,..." } }
```

### PATCH `/api/profile`
- Input
```json
{ "name": "새 이름", "babyName": "하율", "babyMonthsOld": 12, "email": "a@b.com", "profileImageUrl": "data:image/jpeg;base64,..." }
```
- Output `200`
```json
{ "profile": { "id": "me", "name": "새 이름", "babyName": "하율", "babyMonthsOld": 12, "email": "a@b.com", "profileImageUrl": "data:image/jpeg;base64,..." } }
```
- Error
  - `400`: `{ "message": "babyMonthsOld must be a non-negative integer" }`
  - `400`: `{ "message": "invalid profileImageUrl" }`

## 8) Family

### GET `/api/family`
- Output `200`
```json
{
  "ownerUserId": "...",
  "viewerRole": "owner",
  "linkedMode": false,
  "members": [],
  "childCount": 2
}
```
- Note
  - `members`는 현재 로그인한 사용자를 제외한 실제 연동 가족만 포함합니다.
  - 주 양육자는 초대한 구성원만 보고, 참여자는 주 양육자와 다른 참여자를 봅니다.

### DELETE `/api/family`
- 주 양육자가 가족 구성원의 연결을 끊습니다.
- Input
```json
{ "guestUserId": "..." }
```
- Output `200`
```json
{ "ok": true }
```

### POST `/api/children/invite-code`
- 가족 단위 초대코드를 생성합니다. 새 code 생성은 기본적으로 기존 활성 코드를 유지하며, `rotate: true`이면 이전 코드를 즉시 무효화합니다.
- Input
```json
{ "expiresInDays": 7, "rotate": true }
```
- Output `201`
```json
{ "code": "high-entropy-invite-code", "expiresAt": "2026-05-07T00:00:00.000Z" }
```

### POST `/api/children/join-code`
- 가족 단위 초대코드로 참여합니다. 참여 후 해당 가족의 모든 아이를 볼 수 있습니다.
- Input
```json
{ "code": "high-entropy-invite-code", "relationshipLabel": "배우자" }
```
- Output `200`
```json
{ "linked": { "ownerUserId": "..." } }
```
- Error
  - `400`: 만료·없는 code 또는 자기 자신의 code
  - `429`: 계정·IP 기준 가입 시도 한도 초과
  - `503`: 가입 시도 제한 migration/저장소 미준비
