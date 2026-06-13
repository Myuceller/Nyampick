---
name: nyampick-design
description: >-
  냠픽(Nyampick) 전용 디자인 시스템. 아이 식단·이유식 관리 모바일 웹앱의 UI를 만들거나 리뷰할 때 사용한다.
  냠픽 그린(#57bf8e) 단일 액센트, Apple HIG 기반 레이아웃·컴포넌트 규칙, Pretendard 한글 조판 체계를 통합 적용한다.
  발동 조건: "냠픽 스타일로", "냠픽 디자인 적용", "냠픽 UI 만들어줘", "냠픽 컴포넌트", "이 화면 냠픽답게",
  "냠픽 색상으로", "냠픽 디자인 리뷰해줘", 또는 냠픽 관련 화면/컴포넌트를 만드는 모든 상황.
  출력: interactive HTML/React 프리뷰, 디자인 토큰 + 코드 템플릿, 또는 항목별 리뷰 진단.
---

# 냠픽 디자인 시스템

냠픽은 **모바일 중심 PWA** — 아이 식단 기록, 냉장고 관리, AI 레시피 추천을 다루는 앱이다.
디자인 원칙: **따뜻하지만 정제된(warm but composed)** — 아기 앱의 따뜻함과 Apple HIG의 절제를 동시에 담는다.

---

## 0. CRITICAL — 한글 조판 규칙 (모든 작업 최우선)

**한국어 텍스트가 한 글자라도 있으면 아래를 먼저 체크한다. 생략 불가.**

### 0-1. 폰트 스택

```css
/* 전역 */
font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR",
             -apple-system, "Helvetica Neue", Arial, sans-serif;
```

- **Pretendard**: 냠픽의 기본 웹 폰트. Hangul + Latin 혼용 환경에서 균등한 리듬.  
  CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css`
- Apple SD Gothic Neo: iOS/macOS 내장 폴백 — 시스템 앱 느낌.
- SF Pro는 한글 글리프가 없으므로 단독 사용 금지.

### 0-2. 자간 (Letter-spacing) — 한글에 음수 자간 금지

| 라틴 HIG 스펙 | 냠픽 한글 보정 | 이유 |
|---|---|---|
| Display -0.28px | `0` | 한글 정방형 구조 — 음수 자간이 받침·모음 침범 |
| Body -0.374px | `0` | 자간 0이 한글 가독성 최적 |
| Caption -0.224px | `0` | 동일 |

한글+라틴 혼용 줄에서는 `letter-spacing: 0` 우선 적용.

### 0-3. 행간 (Line-height) — 받침을 위한 상하 공간 확보

| 역할 | 라틴 기준 | 냠픽 한글 보정 |
|---|---|---|
| Display (32px) | 1.10 | **1.25** |
| Section (24px) | 1.14 | **1.28** |
| Card Title (20px) | 1.19 | **1.32** |
| Body (16px) | 1.47 | **1.65** |
| Caption (13px) | 1.29 | **1.55** |
| Micro (11px) | 1.33 | **1.55** |

행간 1.1 이하 → 받침이 윗줄 기준선과 충돌하여 글자가 뭉침. 절대 금지.

### 0-4. 줄바꿈 — 어절 단위 유지 (전역 필수)

```css
word-break: keep-all;        /* 어절 중간에서 꺾지 않는다 */
overflow-wrap: break-word;   /* 컨테이너 초과 시에만 강제 허용 */
```

**어절 중간에서 꺾이는 줄은 버그다. 예외 없음.**

### 0-5. 헤드라인 의미 단위 분할 (2줄 이상 시 필수 검산)

자동 줄바꿈에 맡기지 않는다. 구/절 경계에서 `<br>` 직접 삽입.

**분할 우선순위:** 쉼표 뒤 → 주어부/서술부 경계 → 조사 뒤

```
좋음: "아이 식단과 냉장고를 / 한 번에 관리해요"   ← 조사+목적어 경계
나쁨: "아이 식단과 냉장고를 한 번에 / 관리해요"  ← 서술어 고립
```

**외톨이 방지:** 마지막 줄에 1~2어절(2~4글자)만 남으면 분할점을 옮긴다.  
줄 길이 균형: 각 줄이 ±30% 이내. `text-wrap: balance` 병행 권장.

### 0-6. 줄당 적정 글자 수

| 역할 | 적정 범위 | 초과 시 조치 |
|---|---|---|
| 헤드라인 | 8~14자/줄 | `max-width` 좁히거나 폰트 축소 |
| 본문 | 18~26자/줄 | 컨테이너 폭 조정 |
| 캡션 | 20~30자/줄 | 동일 |

모바일 375px에서 본문 16px = 줄당 약 22~25자 → 적정.  
웹 폭이 넓어지면 본문 컨테이너 `max-width: 600px` 이하로 제한.

### 0-7. 단락 리듬

- 단락당 2~3문장. 5줄 초과 단락은 분할 검토.
- 단락 간격: 행간보다 확실히 크게 — 본문 16px 기준 `margin-bottom: 24px` 이상.
- 앱 UI의 짧은 설명 문구: 1~2문장, 마침표로 끝내는 것을 원칙으로 한다.
- 음식명·식재료명은 볼드(`font-weight: 600`) 강조 가능 — 스캔 편의성 우선.

### 0-8. 앱 Safe Area (모바일 PWA 필수)

```css
/* 상단 */
padding-top: env(safe-area-inset-top);
/* 하단 — 탭 바 + 홈 인디케이터 */
padding-bottom: calc(60px + env(safe-area-inset-bottom));
/* 좌우 */
padding-left:  env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

Safe Area 무시 → 홈 인디케이터가 하단 버튼을 가림. 절대 생략 금지.

---

## 1. 핵심 토큰

### 색상 — 냠픽 그린 단일 액센트 원칙

| 역할 | 값 | 규칙 |
|---|---|---|
| **Nyampick Green (Interactive)** | `#57bf8e` | 버튼·포커스·선택·뱃지 배경 전용. 장식 목적 단독 사용 금지. |
| Green Deep | `#3fa876` | 프레스 상태, hover, 강조 테두리 |
| Green Tint | `#e8f5ef` | 배지 배경, 섹션 틴트, 선택된 카드 배경 |
| Green Subtle | `#f0faf5` | 입력 포커스 배경, 인라인 강조 |
| **Canvas** | `#f7f8f9` | 전체 배경. 순백 아님 — 부드러운 쿨그레이 |
| Surface | `#ffffff` | 카드, 바텀시트, 모달 배경 |
| Surface Alt | `#f2f4f6` | 두 번째 레이어 카드, 비활성 섹션 |
| Foreground | `#1a1d1f` | 기본 텍스트. 순흑보다 따뜻한 오프블랙 |
| Text Secondary | `#6b7280` | 보조 텍스트, 라벨, 날짜 |
| Text Tertiary | `#9ca3af` | 비활성, 플레이스홀더 |
| Border | `#e5e8ec` | 카드 테두리, 구분선 |
| Divider | `rgba(0,0,0,0.08)` | 리스트 구분선 |
| **Error** | `#ef4444` | 에러 상태 전용 — 다른 목적 금지 |
| Warning | `#f59e0b` | 알레르기·주의 경고 |
| Info | `#3b82f6` | 정보성 뱃지, 연령 안내 |
| On-Green | `#ffffff` | 그린 버튼 위 텍스트 |

**냠픽 그린(`#57bf8e`) 이외의 유채색은 역할 색(에러/경고/정보/AI)으로만 사용한다. 동시에 2개 이상 유채색 사용 금지.**

#### AI 전용 퍼플 — 아이콘·일러스트에만 허용

| 역할 | 값 | 규칙 |
|---|---|---|
| AI Icon | `#7c3aed` | AI 기능 아이콘·일러스트 전용. 버튼·CTA·배경 사용 금지. |
| AI Icon Bg | `#ede9fe` | AI 아이콘 컨테이너 배경(원형 배경 등) 전용. |

**AI 레시피 추천받기, 저장, 재료 칩 등 인터랙티브 요소는 반드시 그린 시스템으로 처리한다.**  
퍼플 버튼·CTA·그라데이션 버튼은 냠픽 디자인에 존재하지 않는다.

#### CSS 변수 선언 (항상 `:root`에 명시)

```css
:root {
  --nyp-green:        #57bf8e;
  --nyp-green-deep:   #3fa876;
  --nyp-green-tint:   #e8f5ef;
  --nyp-green-subtle: #f0faf5;
  --nyp-canvas:       #f7f8f9;
  --nyp-surface:      #ffffff;
  --nyp-surface-alt:  #f2f4f6;
  --nyp-fg:           #1a1d1f;
  --nyp-fg2:          #6b7280;
  --nyp-fg3:          #9ca3af;
  --nyp-border:       #e5e8ec;
  --nyp-divider:      rgba(0,0,0,0.08);
  --nyp-error:        #ef4444;
  --nyp-warning:      #f59e0b;
  --nyp-info:         #3b82f6;
  /* AI 전용 — 아이콘·일러스트에만 허용 */
  --nyp-ai-icon:      #7c3aed;
  --nyp-ai-icon-bg:   #ede9fe;
}
```

### 타이포그래피 — Pretendard 기반 위계

| 역할 | 크기 | 굵기 | 행간(한글) | 용도 |
|---|---|---|---|---|
| Display | 32px | 700 | 1.25 | 히어로·온보딩 타이틀 |
| Section | 24px | 700 | 1.28 | 섹션 헤더, 페이지 타이틀 |
| Card Title | 20px | 600 | 1.32 | 카드 헤딩, 모달 타이틀 |
| Body | 16px | 400 | 1.65 | 기본 본문, 리스트 항목 |
| Body Emphasis | 16px | 600 | 1.65 | 식품명 강조, 라벨 |
| Caption | 13px | 400 | 1.55 | 부가 정보, 날짜, 설명 |
| Micro | 11px | 500 | 1.55 | 뱃지, 태그, 메타 |
| Nav Label | 10px | 500 | 1.40 | 탭 바 라벨 |

굵기는 400 / 500 / 600 / (헤딩 한정) 700만 사용. 300은 사용하지 않는다.

### 스페이싱 (4px 그리드)

```
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
```

임의 값 금지. 모든 여백·패딩·갭은 4의 배수.

### 라운드 (Radius)

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-sm` | 8px | 뱃지, 칩, 태그 |
| `radius-md` | 12px | 버튼, 입력, 인라인 카드 |
| `radius-lg` | 16px | 리스트 섹션 카드, 알림 |
| `radius-xl` | 20px | 메인 카드, 식단 카드 |
| `radius-sheet` | 24px | 바텀 시트 상단 |
| `radius-pill` | 9999px | 뱃지, 소형 상태 칩 |

### 그림자

| 용도 | 값 |
|---|---|
| 카드 | `rgba(0,0,0,0.06) 0px 2px 12px 0px` |
| 바텀 시트 | `rgba(0,0,0,0.12) 0px -4px 24px 0px` |
| 탭 바 | `rgba(0,0,0,0.08) 0px -1px 0px 0px` (얇은 선 대용) |

---

## 2. 버튼

### 앱 내부 버튼 (radius 12px 고정 — HIG 준수)

| 유형 | 배경 | 텍스트 | 반경 | 높이 | 용도 |
|---|---|---|---|---|---|
| **Primary** | `#57bf8e` | `#ffffff` | **12px** | 52px | 주요 CTA — 저장, 추가, 추천받기 |
| **Secondary** | `#ffffff` | `#1a1d1f` | **12px** | 52px | 보조 액션, `1px solid var(--nyp-border)` |
| **Ghost** | `transparent` | `#57bf8e` | **12px** | 44px | 텍스트형 보조 액션 |
| **Destructive** | `#ef4444` | `#ffffff` | **12px** | 52px | 삭제 확인 |
| **Disabled** | `#e5e8ec` | `#9ca3af` | **12px** | 52px | 모든 유형의 비활성 |

### 랜딩 페이지 버튼 (`/landing` 전용)

| 유형 | 배경 | 텍스트 | 반경 | 높이 | 용도 |
|---|---|---|---|---|---|
| **Primary Pill** | `#57bf8e` | `#ffffff` | **9999px** | 56px | 히어로 CTA "무료로 시작하기" |
| **Secondary Pill** | `#ffffff` | `#1a1d1f` | **9999px** | 56px | 보조 히어로 CTA |

**pill 버튼(`border-radius: 9999px`)은 `/landing`과 온보딩 진입부에서만 허용한다. 앱 내부(식단·냉장고·레시피·마이페이지)에서 pill 버튼 사용 금지.**

### 공통 규칙
- **터치 타깃 최소 44×44px** — 시각 크기가 작아도 padding으로 확보
- 라벨(한글): 2~6자 동사형. `저장` / `추가` / `확인` / `추천받기` 패턴
- 그라데이션 버튼 금지. 단색만 허용.
- 로딩 중: 라벨 유지 + 인라인 스피너. 배경색 유지. 레이아웃 이동 없음.
- 프레스 상태: `var(--nyp-green-deep)` (`#3fa876`). 스케일 변형 금지.
- AI 기능 CTA("레시피 추천받기", "AI 추천")도 반드시 **그린 Primary** 버튼으로 처리.

---

## 3. 컴포넌트

### 내비게이션 바 (앱 상단)

- 높이 52px (compact) + `env(safe-area-inset-top)`
- 배경: `backdrop-filter: saturate(180%) blur(20px)` + `rgba(247,248,249,0.88)`
- 페이지 타이틀: 17px 600, `var(--nyp-fg)`
- 뒤로가기/닫기 버튼: 터치 영역 44×44px 확보

### 탭 바 (앱 하단)

- 높이 60px + `env(safe-area-inset-bottom)`
- 아이콘 24px, 라벨 10px 500
- 활성: `var(--nyp-green)` / 비활성: `var(--nyp-fg3)`
- 배경: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(20px)`
- 탭 수: 4~5개 이내. `홈 / 식단 / 냉장고 / 레시피 / 마이` 패턴.

### 카드 (식단·재료·레시피)

```css
.card {
  background:    var(--nyp-surface);
  border-radius: var(--radius-xl);    /* 20px */
  border:        1px solid var(--nyp-border);
  box-shadow:    rgba(0,0,0,0.06) 0px 2px 12px 0px;
  padding:       16px;
}
```

- 캔버스(`#f7f8f9`)와 카드(`#ffffff`)의 색 대비가 기본 분리 수단.
- 보더 + 섀도 **동시 사용 가능** (Apple과 달리, 냠픽은 콘텐츠 밀도가 높아 분리 명확성 필요).
- 선택된 카드: `border-color: var(--nyp-green)` + `background: var(--nyp-green-tint)`.

### 식단 카드 (끼니 단위)

- 상단: 끼니 라벨(아침/점심/저녁/간식) — `Micro` 볼드, 녹색 뱃지
- 중단: 음식명 목록 — `Body Emphasis` (16px 600), 줄당 1가지 음식
- 하단: 날짜·메모 — `Caption` (13px), `var(--nyp-fg2)`

### 바텀 시트

- 상단 radius 24px / 배경 `#ffffff`
- 핸들: 4×36px, `var(--nyp-border)`, 상단 8px 마진
- 그림자: `rgba(0,0,0,0.12) 0px -4px 24px 0px`
- 아래로 드래그 → dismiss. 임계점 30% 이상 → 스프링 dismiss.
- 딤 스크림: `rgba(0,0,0,0.35)`

### 입력 필드

```css
.input {
  background:    var(--nyp-surface-alt);   /* #f2f4f6 */
  border:        1.5px solid transparent;
  border-radius: 12px;
  padding:       14px 16px;
  font-size:     16px;
  min-height:    52px;
}
.input:focus {
  background:    var(--nyp-green-subtle);  /* #f0faf5 */
  border-color:  var(--nyp-green);
  outline:       none;
}
```

플레이스홀더: `var(--nyp-fg3)` / 입력 중 텍스트: `var(--nyp-fg)`

### 뱃지 / 칩

| 유형 | 배경 | 텍스트 | 반경 | 용도 |
|---|---|---|---|---|
| 끼니 라벨 | `var(--nyp-green-tint)` | `var(--nyp-green-deep)` | pill | 아침/점심/저녁/간식 |
| 알레르기 경고 | `#fef3c7` | `#d97706` | pill | 알레르기 식재료 표시 |
| 신규 재료 | `#dbeafe` | `#1d4ed8` | pill | 영수증 스캔 신규 항목 |
| 큐브 분류 | `var(--nyp-surface-alt)` | `var(--nyp-fg2)` | 8px | 이유식 큐브 카테고리 |

### 리스트 항목

- 최소 높이 52px (터치 타깃 44px 확보 + 상하 여백)
- 구분선: `var(--nyp-divider)` 1px, 좌측 16px 들여쓰기부터 시작
- 스와이프 액션: 우→좌 = 삭제(에러 레드) / 좌→우 = 편집 또는 완료(그린)

---

## 4. 상태 처리

| 상태 | 처리 방식 |
|---|---|
| **빈 화면 (첫 등록 전)** | 중앙 정렬 일러스트(선택) + `Section` 타이틀 1줄 + 그린 CTA 1개 |
| **빈 검색 결과** | "찾으시는 재료가 없어요." — 17px, 직접 추가 링크 1개 |
| **로딩 (스켈레톤)** | `var(--nyp-surface-alt)` 블록, 최종 레이아웃과 동일 치수·radius. shimmer 가능 |
| **에러 (네트워크)** | 헤드라인 + 1문장 원인 + 재시도 CTA. "오류가 발생했습니다" 단독 금지 |
| **에러 (폼)** | 입력 보더 → `var(--nyp-error)`. 13px 캡션으로 구체적 원인 표시 |
| **저장 성공** | 체크마크 애니메이션(~400ms) + 조용한 확인. 토스트 남발 금지 |
| **알레르기 감지** | 경고 뱃지 + Warning 색 인라인 강조. 별도 팝업 없이 인라인 처리 |
| **비활성** | 투명도 0.4로 감소. 지오메트리 유지. 그린 버튼은 `var(--nyp-surface-alt)` + 텍스트 Tertiary |

---

## 5. 레이아웃

### 모바일 앱 (기본 컨텍스트)

```
상단 내비게이션 바:   52px + safe-area-inset-top
콘텐츠 좌우 패딩:     16px
카드 사이 갭:         12px
섹션 간격:            32px
하단 탭 바:           60px + safe-area-inset-bottom
```

- 4px 그리드 필수. 임의 픽셀 값 금지.
- 카드 그리드: 기본 1열. 재료 목록은 2열 허용 (카드 내 텍스트 2줄 이하일 때).
- 스크롤 방향은 세로 단방향. 가로 스크롤은 캐러셀(`overflow-x: auto`)로만 허용.

### 웹 랜딩 (`/landing`)

- 풀와이드 섹션 + 중앙 정렬 콘텐츠
- 배경 리듬: `var(--nyp-canvas)` ↔ `var(--nyp-surface)` 섹션 교차
- 섹션 상하 패딩: 64px(모바일) ~ 100px(데스크톱)
- 텍스트 컨테이너 최대 폭: 600px
- 화면당 CTA 1개 원칙

---

## 6. 모션

| 토큰 | 시간 | 용도 |
|---|---|---|
| `motion-fast` | 120ms | 탭 피드백, 뱃지 등장 |
| `motion-standard` | 250ms | 카드 호버, 드롭다운, 캐러셀 |
| `motion-enter` | 320ms | 바텀 시트·모달 진입 |
| `motion-spring` | 물리 기반 | 드래그·스와이프·dismiss |

```css
--ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1);
--ease-enter:    cubic-bezier(0.2,  0.6, 0.25, 1);
--ease-exit:     cubic-bezier(0.4,  0.0, 1,    1);
```

**`prefers-reduced-motion: reduce` — 모든 트랜지션을 즉시 전환 또는 fade로 강등. 필수 대응.**

---

## 7. Do's and Don'ts

**Do**
- 유채색이 필요하면 `var(--nyp-green)` 계열만 사용하고, 역할색(에러/경고/정보)은 해당 상황에만 제한
- 한글 헤드라인은 의미 단위로 끊고 외톨이 어절을 검산한다
- `word-break: keep-all`을 전역 적용한다
- 한글 행간을 §0-3 보정값으로 올린다
- 터치 타깃 44×44px 이상 — 시각 크기가 작아도 패딩으로 확보
- Safe Area inset을 항상 명시한다
- 식품명·재료명은 `Body Emphasis`(600 굵기)로 가독성 우선
- 에러 메시지는 원인 + 복구 행동을 구체적으로 안내한다

**Don't**
- 냠픽 그린을 장식 목적으로만 사용 (아이콘 배경, 구분선 등 남발)
- 같은 화면에 유채색 2종 이상 동시 사용
- 한글에 라틴 음수 자간 그대로 적용
- 한글 헤드라인 행간 1.1 이하
- `word-break: keep-all` 없이 한글 텍스트 배치
- Safe Area 무시 (하단 버튼이 홈 인디케이터에 가림)
- 이모지를 UI 요소로 사용 (아이콘 라이브러리로 대체)
- 400 미만 굵기 사용 (가독성 저하)
- 보더 없이 카드를 흰 배경 위에 배치 (분리 안 됨)
- **앱 내부에서 pill 버튼 사용** (`/landing` 외 모든 화면에서 금지)
- **그라데이션 버튼 사용** (보라→핑크 등 — 냠픽 디자인에 존재하지 않음)
- **AI 기능 버튼에 퍼플 적용** (CTA는 항상 그린, 퍼플은 아이콘에만)

---

## 8. 반응형

| 브레이크포인트 | 폭 | 주요 변경 |
|---|---|---|
| Mobile | ~767px | 기본 레이아웃. 카드 1열. 탭 바 표시. |
| Tablet | 768~1023px | 카드 2열 가능. 탭 바 → 사이드 내비 전환 고려. |
| Desktop | 1024px~ | 최대 콘텐츠 폭 960px 중앙 정렬. 사이드 내비. |

모바일이 기본 컨텍스트. 웹은 보조.

---

## 9. 아이콘

- 단일 라이브러리: **Lucide React** 권장
- `currentColor` / stroke 1.5~2px
- 크기: 16px(인라인) / 20px(버튼) / 24px(standalone) / 32px(빈 상태·히어로)
- 이모지를 아이콘 대체재로 사용 금지

---

## 10. 자기 검증 체크리스트

작업 완료 전 확인:

- [ ] 유채색이 `var(--nyp-green)` 계열 하나뿐인가? (역할색 제외)
- [ ] AI 아이콘 퍼플(`#7c3aed`)이 아이콘 외 요소(버튼·CTA·칩)에 쓰이지 않았는가?
- [ ] 앱 내부 버튼이 radius 12px인가? (pill이면 위반)
- [ ] 그라데이션 버튼이 없는가?
- [ ] `word-break: keep-all`이 전역 적용됐는가?
- [ ] 한글 행간을 §0-3 보정값으로 올렸는가?
- [ ] 헤드라인 분할점이 의미 단위인가? 외톨이 어절이 없는가?
- [ ] Safe Area inset이 명시됐는가?
- [ ] 터치 타깃이 44×44px 이상인가?
- [ ] 이모지가 없는가?
- [ ] `prefers-reduced-motion` 폴백이 있는가?
- [ ] 빈 상태가 적절히 처리됐는가?
- [ ] 카드 배경(`#ffffff`)과 캔버스(`#f7f8f9`) 대비가 명확한가?

---

## 11. 워크플로

### A. UI 생성

1. **컨텍스트 판정** — 앱 화면인가 / 웹 랜딩인가.
   - 앱: §3(컴포넌트) → §5(앱 레이아웃) → §4(상태) 순으로 참조.
   - 웹: §5(웹 레이아웃) → §2(버튼) → §1(토큰) 순.
2. **한글 포함 여부 확인** — 있으면 §0을 체크리스트로 먼저 적용.
3. `:root`에 CSS 변수 선언 후 작업.
4. §10 체크리스트로 자기 검증.

### B. 리뷰 (냠픽 디자인 감사)

입력(코드/스크린샷)을 받아 아래 축으로 진단:

1. **색** — 그린 단일성, 역할색 오용, 장식적 남발
2. **타이포** — Pretendard 적용, 위계(크기+굵기+행간), 300 사용 금지
3. **한글 조판** — `keep-all`, 행간 보정, 음수 자간 오적용, 헤드라인 외톨이
4. **컴포넌트** — 버튼 일관성, 카드 분리 방식, 터치 타깃
5. **앱 규칙** — Safe Area, 터치 타깃 44px, 바텀 시트 물리감
6. **레이아웃** — 4px 그리드, 여백 체계, 콘텐츠 폭 제한
7. **상태** — 빈 화면, 에러, 로딩 처리 존재 여부

출력: `현재 상태 → 위반 항목 → 수정 코드(토큰 값 명시)` 3단 구조.
우선순위: 치명적(한글 깨짐/Safe Area 누락) → 개선 권장 → 취향 차이.
