# AI Recipe Model A/B Comparison

냠픽 레시피 모델은 공개 벤치마크 점수 하나로 고르지 않는다. 실제 앱의 생성 경로와 20개 golden case를 그대로 사용해 품질, 안전, 지연 시간, 토큰 사용량을 분리해서 비교한다.

공식 모델 문서:

- [GPT-4.1 Mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Responses API usage 필드](https://developers.openai.com/api/reference/resources/responses/methods/create)

## 실행 전

`OPENAI_API_KEY`는 프로젝트 루트의 `.env.local` 또는 배포 서버 환경변수에만 둔다. 명령줄, `AI_QUALITY_RUN_LABEL`, 문서, 결과 JSON에는 키나 인증 토큰을 넣지 않는다.

## 빠른 smoke 비교

먼저 두 케이스만 실행해 모델 권한과 요청 호환성을 확인한다.

```bash
AI_QUALITY_CASES=R1,R5 AI_QUALITY_RUN_LABEL=smoke-4.1mini-vs-5.6luna npm run ai:quality:compare
npm run ai:quality
```

## 전체 20-case 비교

`AI_QUALITY_CASES`를 지정하지 않은 다중 모델 실행은 미측정 여부와 관계없이 전체 golden set을 사용한다. 모델 호출 순서는 case와 repeat마다 번갈아 배치해 먼저 호출된 모델에 생길 수 있는 시간대·순서 편향을 줄인다.

```bash
AI_QUALITY_REPEATS=3 AI_QUALITY_RUN_LABEL=full-4.1mini-vs-5.6luna npm run ai:quality:compare
npm run ai:quality
```

반복 수 기본값은 1이고 허용 범위는 1~10이다. 모델 목록을 직접 지정할 수도 있다.

```bash
AI_QUALITY_MODELS=gpt-4.1-mini,gpt-5.6-luna AI_QUALITY_REPEATS=3 npm run ai:quality:run
```

결과는 `docs/ai-recipe-quality-history.json`에 기록되고 `docs/ai-recipe-quality-report.md`의 최신 `Model A/B Comparison` 구역에 집계된다.

## 판단 지표

- Pass: 해당 case의 모든 평가 기준 통과율
- Quality: 기존 냠픽 품질 평가 구성요소의 평균. 모델 간 상대 비교용이며 절대적인 안전 점수가 아니다.
- Valid: 요청한 추천 개수 중 schema와 기본 형식 기준을 만족한 비율
- Ingredient: 입력 재료 활용률
- Safety: 정의된 부적절 조합, 금지 표현, 필요한 주의 문구 기준 통과율
- API failures / Fallbacks: 호출 실패와 fallback 사용 빈도
- Latency avg / p50 / p95: 응답 시간 분포
- Input / Output / Total tokens: Responses API가 반환한 실제 사용량 합계
- Paired case: 같은 case와 repeat에서 나온 두 모델 결과의 나란한 비교

하나의 임의 가중치로 "종합 우승 모델"을 만들지 않는다. 먼저 안전·유효성 기준을 충족하는지 확인하고, 그 안에서 품질, 지연 시간, 토큰 사용량의 제품상 우선순위를 적용한다.

## 공정 비교 규칙

- 같은 코드, prompt, schema, 품질 gate, case, 추천 개수를 사용한다.
- 모델별로 case를 골라내지 않는다.
- 1회 결과만으로 결론 내리지 않고 최종 결정 때는 3회 이상 반복한다.
- 실패도 제외하지 않고 pass/failure/latency 통계에 포함한다.
- prompt나 gate를 변경했다면 이전 run과 섞지 말고 새 run label을 사용한다.
