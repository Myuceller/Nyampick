# Codex Workflow

이 문서는 Claude Code HOWTO의 접근법을 Codex에 맞춘 프로젝트 운영 가이드다. 목표는 기능 설명이 아니라, 반복 가능한 작업 흐름과 측정 가능한 결과를 남기는 것이다.

참고한 방식:

- Source: <https://github.com/luongnv89/claude-howto#the-problem>
- 핵심 아이디어: 단일 프롬프트가 아니라 project memory, reusable commands, specialized workflows, verification checkpoints를 조합한다.

## Codex Mapping

| Claude Code 개념 | Codex에서의 대응 | 이 프로젝트 적용 |
| --- | --- | --- |
| `CLAUDE.md` memory | `AGENTS.md` | 프로젝트 규칙, 검증 명령, 성능 목표 |
| Slash commands | 재사용 요청 템플릿 | 아래 Codex request templates |
| Skills | 작업별 workflow 문서 | 성능, AI 최적화, 리뷰, 리팩터링 |
| Subagents | 명시 요청 시 병렬 agent | 큰 분석/검증 작업에만 사용 |
| Hooks | 수동/스크립트 체크포인트 | lint, typecheck, build, Lighthouse |
| Checkpoints | git diff와 측정 문서 | 변경 전후 수치 기록 |

## Default Loop

모든 보수 작업은 아래 순서로 진행한다.

1. Baseline 확인
2. 작은 변경 적용
3. 검증 실행
4. 수치 기록
5. 변경 결과와 남은 리스크 정리

## Request Templates

### Performance Optimization

```text
현재 브랜치에서 성능 개선해줘.
대상은 [route]이고, 목표는 First Load JS/LCP/Lighthouse 점수 개선이야.
먼저 docs/performance-baseline.md의 현재 수치를 확인하고,
변경 후 npm run build, npm run lint, npx tsc --noEmit을 실행한 뒤
개선 전후 수치를 문서에 기록해줘.
```

### Lighthouse Baseline

```text
Lighthouse baseline 채워줘.
npm run build 후 production 서버 기준으로 [landing/home/fridge/recipe] 모바일 점수를 측정하고,
docs/performance-baseline.md의 Lighthouse/Web Vitals 표를 업데이트해줘.
```

### API Latency

```text
API 응답 시간 baseline 잡아줘.
대상 endpoint는 [endpoint list]야.
인증 필요 여부를 확인하고, 측정 가능한 항목은 평균/p95를 docs/performance-baseline.md에 기록해줘.
측정이 막히는 항목은 이유와 필요한 준비를 적어줘.
```

### AI Optimization

```text
AI 최적화 작업 해줘.
대상은 [레시피 추천/영수증 OCR]이야.
latency, token usage, parse success rate, fallback rate를 측정할 수 있게 만들고,
docs/performance-baseline.md의 AI 평가 표에 baseline을 기록해줘.
이후 prompt/schema 개선 후보를 작은 단위로 적용해줘.
```

### Code Review

```text
현재 변경사항 리뷰해줘.
버그, 회귀 가능성, 누락된 검증, 타입 안정성 문제를 우선순위로 봐줘.
파일/라인 기준으로 findings 먼저 말하고, 필요한 경우 바로 수정해줘.
```

### Refactor

```text
[feature] 코드를 유지보수하기 쉽게 리팩터링해줘.
동작 변경은 최소화하고, feature 경계에 맞게 hook/store/lib/ui를 나눠줘.
검증은 lint/typecheck/build 중 필요한 것을 실행해줘.
```

### Change Summary

```text
이번 변경을 정량 지표 중심으로 정리해줘.
Before/After 수치, 측정 방법, 남은 리스크, 다음 개선 후보를 만들어줘.
```

## Workflow Recipes

### 1. Bundle Reduction

대상:

- `/recipe`
- `/fridge`
- `/`
- shared JS

절차:

1. `npm run build`로 현재 route size 확인
2. 큰 client component, heavy dependency, shared import 확인
3. dynamic import 또는 component boundary 조정
4. 다시 `npm run build`
5. `docs/performance-baseline.md`에 before/after 기록

성공 지표:

- First Load JS 감소
- shared JS 감소
- Lighthouse Performance 유지 또는 개선

### 2. API Latency Reduction

대상:

- `/api/home/summary`
- `/api/fridge/items`
- `/api/meals`
- `/api/recipes/saved`

절차:

1. endpoint별 인증/입력 조건 확인
2. 5회 이상 요청 시간 측정
3. 중복 fetch, 불필요한 select, 순차 호출 확인
4. 변경 후 평균/p95 비교

성공 지표:

- 평균 latency 감소
- p95 latency 감소
- 네트워크 요청 수 감소

### 3. AI Quality and Cost

대상:

- `src/lib/server/recipe-ai.ts`
- `src/lib/server/receipt-ocr.ts`
- `src/app/api/recipes/recommendations/route.ts`
- `src/app/api/fridge/receipt-scan/route.ts`

절차:

1. 고정 평가 case를 사용
2. latency, token usage, parse success, fallback 여부 기록
3. prompt/schema를 한 번에 하나씩 변경
4. 같은 case로 재측정
5. 비용/품질/실패율 tradeoff 기록

성공 지표:

- 평균 token 사용량 감소
- parse success rate 증가
- fallback rate 감소
- failure rate 감소

### 4. State Management Cleanup

Zustand 적용 기준:

- 여러 컴포넌트가 공유하는 client draft 상태
- 저장 전 임시 편집 상태
- 탭/시트/모달/리스트가 같이 쓰는 선택값

피할 것:

- 서버 API 응답 자체
- 한 컴포넌트 안에서 끝나는 input/open 상태
- URL query로 표현하는 것이 더 자연스러운 상태

위치:

- feature 전용: `src/features/{feature}/stores`
- 전역 공용: `src/lib/stores`

### 5. Verification Checkpoint

변경별 최소 검증:

| 변경 유형 | 필수 검증 |
| --- | --- |
| 문서만 변경 | 없음 또는 링크 확인 |
| 타입/스토어/hook 변경 | `npx tsc --noEmit`, `npm run lint` |
| route/page 변경 | `npm run build`, 관련 화면 수동 확인 |
| 성능 변경 | `npm run build`, Lighthouse 또는 baseline 문서 업데이트 |
| AI 변경 | 고정 평가 case 실행, usage/latency 기록 |

## Output Format

작업 완료 시 Codex는 다음을 남긴다.

- 변경 파일
- 실행한 검증 명령
- 측정된 before/after 수치
- 아직 측정하지 못한 항목과 이유
- 다음 개선 후보가 있으면 1~3개
