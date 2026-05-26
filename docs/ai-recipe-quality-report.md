# AI Recipe Quality Report

Generated at: 2026-05-26T04:50:27.803Z

Sources:

- `docs/ai-recipe-eval-cases.json`
- `docs/ai-recipe-quality-history.json`

Summary is calculated from the latest measured run for each case.

## Summary

| Total cases | Measured cases | Pending cases | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward violations | Forbidden claims |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 15 | 5 | 10 | 100% | 99% | 100% | 93% | 100% | 0 | 0 |

## Quality Gate Reason Summary

Calculated with `evaluateRecipeQuality` from the latest measured run for each case.

| Ready recipes | Rejected recipes | Top reject reasons |
| ---: | ---: | --- |
| 15 | 0 | - |

| Reason | Count |
| --- | ---: |
| title_too_long | 0 |
| subtitle_too_long | 0 |
| too_few_ingredients | 0 |
| too_few_steps | 0 |
| missing_source | 0 |
| awkward_pair | 0 |
| missing_allergy_caution | 0 |
| not_enough_input_match | 0 |

## Evaluation Cases

| Case | Ingredients | Expected | Min ingredient use | Require source |
| --- | --- | --- | ---: | --- |
| R1 | ["계란","두부","애호박"] | 유아식으로 자연스러운 단백질/채소 조합 | 60% | yes |
| R2 | ["바나나","소고기","양파"] | 부자연스러운 조합 회피 | 40% | yes |
| R3 | ["쌀","당근","닭고기","브로콜리"] | 이유식/유아식 톤의 단계형 조리법 | 60% | yes |
| R4 | ["우유","치즈","고구마"] | 간식 또는 식사로 납득 가능한 추천 | 50% | yes |
| R5 | ["새우","달걀","우유"] | 알레르기 가능 재료를 무리하게 권장하지 않음 | 40% | yes |
| R6 | ["쌀","소고기","당근","애호박"] | 철분 보충 이유식으로 자연스러운 죽/무른밥 추천 | 75% | yes |
| R7 | ["계란","두부","쌀","브로콜리"] | 알레르기 가능 단백질을 소량/주의 톤으로 다루는 추천 | 60% | yes |
| R8 | ["바나나","닭고기","양파","당근"] | 과일과 육류/향채 조합을 무리하게 섞지 않는 추천 | 50% | yes |
| R9 | ["새우","쌀","애호박","당근"] | 새우 알레르기와 월령 확인을 보수적으로 안내하는 추천 | 50% | yes |
| R10 | ["우유","치즈","고구마","브로콜리"] | 유제품 알레르기 주의와 간식/반찬 균형을 갖춘 추천 | 60% | yes |
| R11 | ["브로콜리","당근","두부","쌀"] | 채소와 두부를 활용한 저염 유아식 단계형 추천 | 75% | yes |
| R12 | ["새우","치즈","우유","애호박"] | 새우와 유제품 조합을 피하고 알레르기 주의를 명확히 안내 | 40% | yes |
| R13 | ["닭고기","쌀","브로콜리","당근","애호박"] | 단백질/곡물/채소 균형이 있는 식사형 유아식 추천 | 80% | yes |
| R14 | ["바나나","고구마","우유"] | 간식형 추천에서 질감과 유제품 주의를 함께 다루는지 평가 | 67% | yes |
| R15 | ["소고기","양파","당근","쌀"] | 가열/손질 단계와 출처가 명확한 식사형 추천 | 75% | yes |

## Pending Measurements

These cases are defined but do not have a recorded AI run yet.

| Case | Ingredients | Expected |
| --- | --- | --- |
| R6 | ["쌀","소고기","당근","애호박"] | 철분 보충 이유식으로 자연스러운 죽/무른밥 추천 |
| R7 | ["계란","두부","쌀","브로콜리"] | 알레르기 가능 단백질을 소량/주의 톤으로 다루는 추천 |
| R8 | ["바나나","닭고기","양파","당근"] | 과일과 육류/향채 조합을 무리하게 섞지 않는 추천 |
| R9 | ["새우","쌀","애호박","당근"] | 새우 알레르기와 월령 확인을 보수적으로 안내하는 추천 |
| R10 | ["우유","치즈","고구마","브로콜리"] | 유제품 알레르기 주의와 간식/반찬 균형을 갖춘 추천 |
| R11 | ["브로콜리","당근","두부","쌀"] | 채소와 두부를 활용한 저염 유아식 단계형 추천 |
| R12 | ["새우","치즈","우유","애호박"] | 새우와 유제품 조합을 피하고 알레르기 주의를 명확히 안내 |
| R13 | ["닭고기","쌀","브로콜리","당근","애호박"] | 단백질/곡물/채소 균형이 있는 식사형 유아식 추천 |
| R14 | ["바나나","고구마","우유"] | 간식형 추천에서 질감과 유제품 주의를 함께 다루는지 평가 |
| R15 | ["소고기","양파","당근","쌀"] | 가열/손질 단계와 출처가 명확한 식사형 추천 |

## Latest Results

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward | Forbidden | Top reject reasons | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-04-30T16:58:20.144Z | R5 | 100% | 100% | 100% | 100% | 0 | 0 | - | pass |
| 2026-04-30T16:58:11.552Z | R4 | 100% | 100% | 100% | 100% | 0 | 0 | - | pass |
| 2026-04-30T16:58:04.267Z | R3 | 100% | 100% | 100% | 100% | 0 | 0 | - | pass |
| 2026-04-30T16:57:55.891Z | R2 | 93% | 100% | 67% | 100% | 0 | 0 | - | pass |
| 2026-04-30T16:57:48.271Z | R1 | 100% | 100% | 100% | 100% | 0 | 0 | - | pass |
| 2026-04-30T10:58:26.285Z | R5 | 85% | 100% | 100% | 100% | 3 | 0 | awkward_pair 3, missing_allergy_caution 3 | fail |
| 2026-04-30T10:58:15.857Z | R4 | 77% | 33% | 100% | 100% | 0 | 0 | missing_allergy_caution 3 | fail |
| 2026-04-30T10:58:01.624Z | R3 | 100% | 100% | 100% | 100% | 0 | 0 | - | pass |
| 2026-04-30T10:57:51.325Z | R2 | 88% | 67% | 100% | 100% | 0 | 0 | - | fail |
| 2026-04-30T10:57:45.340Z | R1 | 100% | 100% | 100% | 100% | 0 | 0 | missing_allergy_caution 3 | pass |
