# Development Workflow

목표: `main` 브랜치를 배포 가능한 상태로 유지하고, 모든 변경은 PR과 CI를 거쳐 반영한다.

## 브랜치 흐름

```text
feature branch
→ pull request
→ CI 통과
→ main merge
→ Vercel production deploy
```

## 작업 순서

1. 최신 `main`에서 작업 브랜치를 만든다.

```bash
git switch main
git pull origin main
git switch -c feat/example-change
```

2. 코드를 수정하고 로컬에서 기본 검증을 실행한다.

```bash
npm run lint
npm run test:unit
npm run build
```

3. 커밋 후 원격 브랜치로 push한다.

```bash
git add -A
git commit -m "Describe change"
git push origin feat/example-change
```

4. GitHub에서 PR을 만든다.

5. PR의 `CI / Lint, Test, Build` 체크가 통과하는지 확인한다.

6. CI가 통과한 PR만 `main`에 merge한다.

7. `main`에 merge되면 Vercel이 production 배포를 수행한다.

## GitHub Actions 역할

GitHub Actions는 품질 검증을 담당한다.

```text
npm ci
→ npm run lint
→ npm run test:unit
→ npm run build
```

## Vercel 역할

Vercel은 배포를 담당한다.

```text
main 업데이트
→ Vercel GitHub 연동이 변경 감지
→ production build/deploy
→ https://www.nyampick.kr 반영
```

## 브랜치 보호 규칙

`main` 브랜치는 아래 조건을 만족해야 merge할 수 있다.

- PR 기반 변경
- `CI / Lint, Test, Build` 통과
- 최신 `main` 기준으로 CI 재검증
- force push 금지
- branch 삭제 금지

## 면접 설명

> 냠픽은 `main` 브랜치를 Vercel production 배포 기준으로 사용하기 때문에, 직접 push보다 PR 기반 흐름으로 관리하는 것이 안전하다고 판단했습니다. GitHub Actions에서 lint, unit test, production build를 자동 검증하고, 통과한 변경만 main에 merge되도록 branch protection을 설정했습니다. 배포는 Vercel GitHub 연동이 담당하고, GitHub Actions는 품질 검증을 담당하도록 역할을 분리했습니다.

