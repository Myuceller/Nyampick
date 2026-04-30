# MammaNote API Spec

Base URL: `/api`

공통
- 요청/응답: `application/json`
- 현재 저장소: 인메모리(서버 재시작 시 초기화)

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
- Output `200`
```json
{
  "recommendations": [
    {
      "title": "두부 애호박찜",
      "subtitle": "부드럽게 먹기 좋은 단백질 반찬",
      "taste": "좋아해요",
      "ingredients": ["두부", "애호박", "계란"],
      "steps": ["재료를 작게 썬다", "부드럽게 익힌다", "한 김 식혀 담는다"],
      "source_name": "공개 레시피 출처",
      "source_url": "https://example.com/recipe"
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
    "recommendationCount": 3
  }
}
```
- Error
  - `400`: `{ "message": "ingredients must be an array" }`
  - `401`: `{ "message": "unauthorized" }`
  - `429`: `{ "message": "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요." }`

## 6-1) Recipe Evaluation

### GET `/api/recipe-eval?count=10&seed=baseline`
- 재료 메타데이터 기반으로 평가 케이스를 자동 생성합니다.
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
        "requireSource": true,
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
- 가족 단위 초대코드를 생성합니다.
- Input
```json
{ "expiresInDays": 7 }
```
- Output `201`
```json
{ "code": "3LTQR7", "expiresAt": "2026-05-07T00:00:00.000Z" }
```

### POST `/api/children/join-code`
- 가족 단위 초대코드로 참여합니다. 참여 후 해당 가족의 모든 아이를 볼 수 있습니다.
- Input
```json
{ "code": "3LTQR7", "relationshipLabel": "배우자" }
```
- Output `200`
```json
{ "linked": { "ownerUserId": "..." } }
```
