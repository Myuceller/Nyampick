# AI Recipe Quality Report

Generated at: 2026-04-30T14:46:10.090Z

Sources:

- `docs/ai-recipe-eval-cases.json`
- `docs/ai-recipe-quality-history.json`

## Summary

| Runs | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward pair violations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 40% | 89% | 80% | 100% | 100% | 3 |

## Evaluation Cases

| Case | Ingredients | Expected | Min ingredient use | Require source |
| --- | --- | --- | ---: | --- |
| R1 | ["계란","두부","애호박"] | 유아식으로 자연스러운 단백질/채소 조합 | 60% | yes |
| R2 | ["바나나","소고기","양파"] | 부자연스러운 조합 회피 | 40% | yes |
| R3 | ["쌀","당근","닭고기","브로콜리"] | 이유식/유아식 톤의 단계형 조리법 | 60% | yes |
| R4 | ["우유","치즈","고구마"] | 간식 또는 식사로 납득 가능한 추천 | 50% | yes |
| R5 | ["새우","달걀","우유"] | 알레르기 가능 재료를 무리하게 권장하지 않음 | 40% | yes |

## Latest Results

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward violations | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-04-30T10:58:26.285Z | R5 | 85% | 100% | 100% | 100% | 3 | fail |
| 2026-04-30T10:58:15.857Z | R4 | 73% | 33% | 100% | 100% | 0 | fail |
| 2026-04-30T10:58:01.624Z | R3 | 100% | 100% | 100% | 100% | 0 | pass |
| 2026-04-30T10:57:51.325Z | R2 | 87% | 67% | 100% | 100% | 0 | fail |
| 2026-04-30T10:57:45.340Z | R1 | 100% | 100% | 100% | 100% | 0 | pass |

## History Entry Format

```json
{
  "createdAt": "2026-04-30T00:00:00.000Z",
  "caseId": "R1",
  "model": "OPENAI_MODEL",
  "limit": 3,
  "recommendations": [],
  "latencyMs": 2140,
  "totalTokens": 1030,
  "fallbackUsed": false
}
```
