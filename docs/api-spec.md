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
    "familyMemberCount": 2
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

### GET `/api/recipes/recommendations?limit=5`
- Query
  - `limit`: `1 ~ 20` (기본 5)
- Output `200`
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "닭안심 채소죽",
      "description": "부드러운 단백질과 채소를 함께 넣은 균형식",
      "ingredients": ["닭안심", "당근", "감자", "쌀"],
      "mealType": "dinner",
      "reasons": ["냉장고 재료 3개를 활용할 수 있어요.", "최근 식단 기준 protein 보강에 맞춘 추천이에요."],
      "nutrition": { "carbs": 48, "protein": 30, "fat": 22, "calories": 360 },
      "fridgeMatchCount": 3
    }
  ],
  "strategy": {
    "basedOn": ["fridge-items", "recent-meals", "nutrition-balance"],
    "description": "냉장고 재료 우선 + 최근 식단 중복 완화 + 부족 영양소 보완 기준으로 정렬"
  }
}
```
- Error
  - `400`: `{ "message": "limit must be between 1 and 20" }`

## 7) Profile (My Page)

### GET `/api/profile`
- Output `200`
```json
{ "profile": { "id": "me", "name": "하율맘", "babyName": "하율", "babyMonthsOld": 11, "email": "nyampick@example.com" } }
```

### PATCH `/api/profile`
- Input
```json
{ "name": "새 이름", "babyName": "하율", "babyMonthsOld": 12, "email": "a@b.com" }
```
- Output `200`
```json
{ "profile": { "id": "me", "name": "새 이름", "babyName": "하율", "babyMonthsOld": 12, "email": "a@b.com" } }
```
- Error
  - `400`: `{ "message": "babyMonthsOld must be a non-negative integer" }`

## 8) Family

### GET `/api/family`
- Output `200`
```json
{
  "ownerUserId": "...",
  "viewerRole": "owner",
  "linkedMode": false,
  "members": [
    {
      "id": "...",
      "name": "구글동구",
      "email": "parent@example.com",
      "role": "owner",
      "roleLabel": "주 양육자"
    }
  ],
  "childCount": 2
}
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
