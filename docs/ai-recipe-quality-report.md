# AI Recipe Quality Report

Generated at: 2026-05-26T05:51:38.257Z

Sources:

- `docs/ai-recipe-eval-cases.json`
- `docs/ai-recipe-quality-history.json`

Summary is calculated from the latest measured run for each case.

## Summary

| Total cases | Measured cases | Pending cases | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward violations | Forbidden claims |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 20 | 0 | 95% | 99% | 100% | 97% | 100% | 0 | 0 |

## Quality Gate Reason Summary

Calculated with `evaluateRecipeQuality` from the latest measured run for each case.

| Ready recipes | Rejected recipes | Top reject reasons |
| ---: | ---: | --- |
| 60 | 0 | - |

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

## Eval Gap Summary

These gaps are stricter eval-case expectations. A recipe can pass the production quality gate but still fail an eval case.

| Gap | Count |
| --- | ---: |
| missing_required_terms | 1 |

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
| R16 | ["친환경 애호박 1개","무항생제 닭안심 300g","쌀 100g"] | 영수증/OCR 잡음이 섞인 재료명을 애호박, 닭고기, 쌀로 정규화해 추천 | 75% | yes |
| R17 | ["감자"] | 재료가 적어도 과도한 창작 없이 보수적인 추천 또는 보조 재료 활용 | 30% | yes |
| R18 | ["쌀","단호박","두부"] | 초기/중기 이유식에 가까운 부드러운 질감과 단계형 조리법 | 60% | yes |
| R19 | ["애호박","양파","닭고기","당근"] | 냉장고 잔여 재료를 현실적인 한 끼 메뉴로 연결 | 75% | yes |
| R20 | ["새우","우유","감자"] | 갑각류+유제품 조합과 알레르기 안전 단정을 회피 | 40% | yes |

## Pending Measurements

These cases are defined but do not have a recorded AI run yet.

| Case | Ingredients | Expected |
| --- | --- | --- |
| - | - | - |

## Latest Results

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward | Forbidden | Top reject reasons | Eval gaps | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 2026-05-26T05:14:39.435Z | R15 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:14:31.683Z | R14 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:14:22.555Z | R13 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:14:06.744Z | R12 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:13:56.774Z | R11 | 90% | 100% | 100% | 100% | 0 | 0 | - | missing_required_terms | fail |
| 2026-05-26T05:10:19.987Z | R10 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:10:13.227Z | R9 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:10:06.568Z | R8 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:09:57.019Z | R7 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:09:40.679Z | R6 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:06:12.867Z | R20 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:06:03.064Z | R19 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:05:30.704Z | R18 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:05:18.732Z | R17 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-05-26T05:05:05.136Z | R16 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-04-30T16:58:20.144Z | R5 | 93% | 100% | 67% | 100% | 0 | 0 | - | - | pass |
| 2026-04-30T16:58:11.552Z | R4 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-04-30T16:58:04.267Z | R3 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
| 2026-04-30T16:57:55.891Z | R2 | 93% | 100% | 67% | 100% | 0 | 0 | - | - | pass |
| 2026-04-30T16:57:48.271Z | R1 | 100% | 100% | 100% | 100% | 0 | 0 | - | - | pass |
