# AI Recipe Quality Strategy

## 문제 정의

AI 레시피 추천은 같은 재료 입력에도 결과 형식과 품질이 흔들릴 수 있다.

주요 문제:

- 재료명이 매번 다르게 들어간다.
  - 예: `친환경 애호박 1개`, `애호박`, `국산 애호박`
- AI가 반환한 재료명도 일정하지 않다.
  - 예: `닭안심`, `닭가슴살`, `닭고기`
- 조리 단계 형식이 흔들린다.
  - 예: `1.`, `2)`, `-` 같은 목록 기호 포함
- 금지 조합이나 알레르기 주의 문구가 누락될 수 있다.
- 출처, 재료 수, 조리 단계 수가 부족할 수 있다.

## 목표

AI 추천을 바로 사용자에게 보여주지 않고, 아래 흐름을 통과한 결과만 제공한다.

```text
사용자 재료 선택
→ 입력 재료 정규화
→ AI 호출
→ 응답 파싱
→ Zod schema 검증
→ 추천 데이터 정규화
→ 품질 gate
→ 부족하면 fallback
→ 최종 추천 반환
```

## 1차 적용 범위

### 입력 재료 정규화

파일:

- `src/lib/ai/ingredient-normalize.ts`

하는 일:

- 수량 제거
- 가격/기호 제거
- 수식어 제거
- 대표 재료명으로 매핑
- 중복 제거

예:

| 입력 | 정규화 결과 |
| --- | --- |
| `친환경 애호박 1개` | `애호박` |
| `무항생제 닭안심 300g` | `닭고기` |
| `서울우유 1L` | `우유` |
| `국산 애호박 1개`, `애호박` | `애호박` 하나로 병합 |

### 추천 응답 정규화

파일:

- `src/lib/ai/recipe-normalize.ts`

하는 일:

- 제목/부제 공백 정리
- 재료명 표준화
- 조리 단계 번호/기호 제거
- 빈 단계 제거
- 중복 단계 제거
- 부족한 재료는 `쌀`, `물`, `육수` 같은 보조 재료로 최소 조건 보강

### AI 응답 schema 검증

파일:

- `src/lib/server/recipe-ai.ts`

하는 일:

- AI 응답이 `recipes` 배열을 갖는지 확인
- 각 recipe의 `title`, `subtitle`, `taste`, `ingredients`, `steps`, `source_name`, `source_url` 타입을 검증
- `ingredients`와 `steps`가 문자열 배열이 아니면 실패 처리
- `taste`가 허용값이 아니면 `보통이에요`로 보정
- schema 검증을 통과한 응답만 정규화와 quality gate로 넘김

### Quality Gate 연결

파일:

- `src/lib/server/recipe-ai.ts`

변경:

- `isProductionReadyRecipe`가 검사 전에 추천과 입력 재료를 정규화한다.
- `selectProductionReadyRecommendations`가 정규화된 추천만 반환한다.
- OpenAI 호출 전 입력 재료를 정규화해 프롬프트에 넣는다.
- `evaluateRecipeQuality`가 통과 여부와 탈락 사유를 함께 반환한다.

## 현재 품질 gate 기준

추천은 아래 기준을 통과해야 한다.

- 제목 18자 이하
- 부제 28자 이하
- 재료 3개 이상
- 조리 단계 3개 이상
- 출처명과 출처 URL 존재
- 금지 조합 없음
- 알레르기 재료가 있으면 주의 문구 존재
- 사용자가 선택한 재료와 충분히 관련 있음

## 실패 사유 reason code

AI 추천이 탈락하면 boolean만 남기지 않고 reason code를 남긴다.

현재 reason code:

| reason | 의미 |
| --- | --- |
| `title_too_long` | 제목이 18자를 초과함 |
| `subtitle_too_long` | 부제가 28자를 초과함 |
| `too_few_ingredients` | 재료가 3개 미만임 |
| `too_few_steps` | 조리 단계가 3개 미만임 |
| `missing_source` | 출처명 또는 출처 URL이 없음 |
| `awkward_pair` | 금지 조합이 포함됨 |
| `missing_allergy_caution` | 알레르기 재료가 있지만 주의 문구가 없음 |
| `not_enough_input_match` | 사용자 입력 재료와 충분히 관련 없음 |

이 구조를 두면 추천 실패가 단순 실패로 끝나지 않고, 어떤 기준에서 자주 실패하는지 집계할 수 있다.

## Reason code 리포트

파일:

- `scripts/ai-recipe-quality-run.mjs`
- `scripts/ai-recipe-quality-report.mjs`
- `docs/ai-recipe-quality-report.md`

하는 일:

- `npm run ai:quality:run`으로 미측정 eval case를 실제 OpenAI 추천으로 실행한다.
- 기본 실행은 아직 측정되지 않은 케이스 5개만 실행한다.
- 특정 케이스만 실행하려면 `AI_QUALITY_CASES=R16,R20 npm run ai:quality:run`을 사용한다.
- `docs/ai-recipe-quality-history.json`의 추천 히스토리를 읽는다.
- 각 추천을 `evaluateRecipeQuality`로 다시 평가한다.
- 통과 추천 수와 탈락 추천 수를 집계한다.
- `missing_source`, `awkward_pair`, `missing_allergy_caution` 같은 reason code별 빈도를 표로 만든다.
- production quality gate는 통과했지만 eval case의 추가 기대 조건을 못 맞춘 경우는 eval gap으로 따로 집계한다.
- `requiredAnyTerms`로 의미가 같은 표현 묶음 중 하나만 포함돼도 통과하도록 평가한다.
  - 예: `["익혀", "익힌", "끓여", "삶"]`

이 리포트는 AI 추천 개선 우선순위를 정하는 기준으로 사용한다.

## Eval case 확장 기준

파일:

- `docs/ai-recipe-eval-cases.json`

현재 golden set은 20개 케이스로 관리한다.

추가한 회귀/품질 케이스:

- 영수증/OCR 잡음이 섞인 재료명 정규화
- 재료가 1개뿐인 low-context fallback
- 초기/중기 이유식 질감과 단계형 조리법
- 냉장고 잔여 재료 기반 현실적인 한 끼 추천
- 새우+우유 조합과 알레르기 안전 문구 회귀 방지

새 케이스는 바로 성공률에 포함되지 않고, 실제 AI 실행 기록이 `docs/ai-recipe-quality-history.json`에 쌓이면 리포트에서 측정 케이스로 전환된다.

## 테스트

파일:

- `tests/recipe-ai-quality-gate.test.ts`

추가된 테스트:

- noisy 재료명을 대표 재료명으로 정규화
- 같은 재료의 중복 입력 제거
- AI 응답의 제목/재료/조리 단계 정규화
- AI 응답 schema 검증
- 정규화된 alias 기준으로 quality gate 평가

## 한계

현재 정규화는 규칙 기반이다.

장점:

- 빠르다.
- 비용이 없다.
- 테스트하기 쉽다.
- 결과가 예측 가능하다.

한계:

- 사전에 없는 재료명은 완벽하게 표준화하지 못한다.
- 모든 부적절한 조합을 찾을 수 없다.
- 도메인 기준은 계속 보강해야 한다.

따라서 현재 구조는 "완벽한 안전 보장"이 아니라, known risk를 줄이는 1차 품질 방어선이다.

## 다음 단계

1. 추가 eval case를 실제 AI 실행으로 측정한다.
2. 재료 정규화 사전을 확장한다.
3. 추천 결과 캐싱 key에 정규화된 재료 목록을 사용한다.
4. 사용자 피드백을 가볍게 수집한다.
   - 예: `마음에 들어요`, `재료가 이상해요`, `아이에게 안 맞아요`, `너무 복잡해요`
   - 피드백은 바로 AI를 자동 수정하는 데 쓰지 않고, reason code와 함께 개선 후보를 찾는 근거로 쌓는다.

## 이력서 문장 후보

> AI 레시피 추천의 입력/출력 정규화 레이어를 추가해 영수증 OCR과 사용자 선택 재료의 표기 차이를 대표 재료명으로 통일하고, 정규화된 결과만 quality gate를 통과하도록 개선했습니다.

> OpenAI 추천 결과를 바로 노출하지 않고 재료명 표준화, 조리 단계 정리, 금지 조합/알레르기/출처 검증을 거쳐 production-ready 추천만 사용자에게 제공하는 AI 오케스트레이션 구조를 구현했습니다.
