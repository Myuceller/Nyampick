# mammanote

맘마노트를 만듭니다. 맘마노트는 가정에서 어떤 음식을 만들어야할지 막막할때, 오늘은 아이에게 어떤 이유식을 먹여야할지 고민할 때 도움을 줄 수 있습니다.

## 기술 스택

- **Frontend**: React + TypeScript
- **Backend**: Next.js (API Routes)
- **Architecture**: MVC (Model-View-Controller)

## 프로젝트 구조

```
mammanote/
├── src/
│   ├── app/                    # Next.js App Router (Views)
│   │   ├── api/                # API Routes (Controllers 연결)
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 홈 페이지
│   │   └── globals.css         # 전역 스타일
│   ├── models/                 # Model: 도메인 모델 및 타입 정의
│   ├── dto/                    # DTO: 요청/응답 데이터 전송 객체
│   ├── controllers/            # Controller: API 요청 처리
│   ├── services/               # Service: 비즈니스 로직
│   ├── repositories/           # Repository: 데이터베이스 접근
│   ├── validators/             # Validator: 요청 데이터 검증
│   ├── common/                 # Common: 공통 로직 (에러 처리, 로깅 등)
│   ├── components/             # React 컴포넌트
│   └── lib/                    # 유틸리티 함수
├── public/                     # 정적 파일
├── package.json
├── tsconfig.json
└── next.config.js
```

## MVC 아키텍처

- **Model** (`src/models/`): 도메인 모델 및 타입 정의
- **View** (`src/app/`, `src/components/`): React 컴포넌트 및 페이지
- **Controller** (`src/controllers/`): API 요청 처리 및 응답 반환
- **Service** (`src/services/`): 비즈니스 로직 처리
- **Repository** (`src/repositories/`): 데이터베이스 접근 로직
- **DTO** (`src/dto/`): 요청/응답 데이터 구조 정의
- **Validator** (`src/validators/`): 요청 데이터 검증
- **Common** (`src/common/`): 공통 로직 (에러 처리, 로깅 등)

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```
