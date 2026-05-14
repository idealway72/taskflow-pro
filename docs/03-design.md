# 03-design — 설계 결정

> 이 파일은 아키텍처·기술 선택의 **의사결정 기록(ADR)**이다.
> 새 의존성은 이 파일에 사유가 기록되기 전까지 도입할 수 없다.

---

## 의존성 추가 정책

새 라이브러리·패키지·외부 서비스를 추가하기 전 반드시 아래 절차를 따른다.

1. 이 파일에 "선택 / 대안 / 근거 / 트레이드오프" 항목을 작성한다.
2. 검토 후 명시적 승인을 받는다.
3. 승인 후 설치한다.

**사유 없이 `pip install` / `npm install`을 먼저 실행하는 것은 절대 규칙 위반이다.**

---

## 설계 결정 8가지

| # | 결정 항목 | 선택 | 대안 | 근거 | 트레이드오프 |
|---|----------|------|------|------|-------------|
| 1 | 백엔드 | **FastAPI** | Django, Express | 자동 OpenAPI 문서, 타입 힌트 기반 유효성 검사, 비동기 지원. 설정 오버헤드 최소 | Django보다 생태계 좁음. Express보다 Python 환경 필요 |
| 2 | 프론트엔드 | **Vanilla JS + Tailwind CDN** | React, Vue | 빌드 도구 없음. CDN 한 줄로 즉시 시작. MVP 규모에서 프레임워크 오버헤드 없음 | 컴포넌트 재사용성 낮음. 확장 단계에서 React 전환 시 리라이트 필요 |
| 3 | DB | **SQLite → PostgreSQL** + SQLAlchemy | MySQL, MongoDB | 로컬 개발은 SQLite로 파일 하나. 운영 전환 시 PostgreSQL로 교체. SQLAlchemy ORM이 두 DB 모두 지원 | SQLite는 동시 쓰기 제한. 전환 시 마이그레이션 주의 필요 |
| 4 | CSS | **Tailwind CSS만** (CDN) | styled-components, CSS Modules | 클래스만으로 디자인 완결. JS 번들에 CSS 없음. styled-components는 빌드 도구 필요 | 긴 클래스 문자열. Tailwind 미숙 시 가독성 저하 |
| 5 | 실시간 | **폴링 3초** (MVP) → WebSocket (확장) | SSE, WebSocket(즉시) | Vanilla JS + 폴링으로 의존성 추가 없이 구현. WebSocket은 서버 아키텍처 변경 수반 | 3초 지연 존재. 유저가 많아질수록 폴링 부하 증가 |
| 6 | 상태 관리 | **모듈 변수 + DOM 직접 갱신** | Redux, Zustand, Pinia | 프레임워크 없는 Vanilla JS에서 가장 단순한 방법. 외부 의존성 없음 | 상태-DOM 동기화를 수동 관리. 규모 커지면 복잡도 급증 |
| 7 | 디자인 시스템 | **macOS UI 토큰** | Material Design, Ant Design | 라이브러리 의존성 없이 Tailwind 토큰만으로 구현 가능. 가볍고 일관된 톤 | 직접 유지보수 필요. Ant/Material 대비 컴포넌트 수 적음 |
| 8 | 테마 | **라이트/다크 토글** (`localStorage`) | 시스템 설정만 따름 | 사용자가 명시적으로 선택 가능. 새로고침 후에도 유지 | `localStorage` 접근 불가 환경(SSR 등)에서 깜빡임 발생 가능 |

---

## 결정 상세

### 1. 백엔드 — FastAPI

```
선택:  FastAPI (Python 3.11+)
버전:  fastapi >= 0.111, uvicorn[standard] >= 0.29
```

- Pydantic v2 기반 자동 입력 검증. `title`, `status`, `due_at` 검증이 스키마 선언만으로 처리된다.
- `/docs` (Swagger), `/redoc` 자동 생성. 02-specs.md API 문서와 항상 동기화된다.
- `async def`로 비동기 엔드포인트 작성 가능. 확장 단계 WebSocket 도입 시 교체 없이 추가 가능.

---

### 2. 프론트엔드 — Vanilla JS + Tailwind CDN

```
선택:  Vanilla JS (ES2022+)
       Tailwind CSS CDN (Play CDN — 개발/MVP)
빌드:  없음. index.html + script.js 직접 서빙
```

- `<script src="https://cdn.tailwindcss.com"></script>` 한 줄로 시작.
- Node.js, npm, 번들러 설치 없이 바로 개발 가능.
- 확장 단계에서 React 도입 시 이 파일에 결정을 추가한 후 진행한다.

**금지 사항**
- `styled-components`, `emotion`, CSS-in-JS 계열 전부 금지.
- 이유: Vanilla JS 환경에서 빌드 도구 없이 동작하지 않음.

---

### 3. DB — SQLite → PostgreSQL + SQLAlchemy

```
로컬 개발:  SQLite  (파일: taskflow.db)
운영:       PostgreSQL 16
ORM:        SQLAlchemy 2.x + Alembic (마이그레이션)
```

**전환 기준**: 동시 접속 유저 5명 이상 또는 운영 배포 시 PostgreSQL로 전환한다.

```python
# 환경 변수로 DB URL 분기
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./taskflow.db")
```

SQLAlchemy 2.x는 SQLite·PostgreSQL 모두 지원하므로 코드 변경 없이 URL만 바꾼다.

---

### 4. CSS — Tailwind만

**허용**
```html
<div class="rounded-xl shadow-lg backdrop-blur-sm bg-white/80 p-4">
```

**금지**
```js
// ❌ styled-components
const Card = styled.div`border-radius: 12px;`

// ❌ 인라인 style 속성 (디자인 토큰 우회)
<div style="border-radius: 12px">
```

인라인 `style` 속성은 긴급 수정 외 사용하지 않는다. Tailwind 클래스로 표현할 수 없는 경우에만 예외를 인정하며 이 파일에 사유를 기록한다.

---

### 5. 실시간 — 폴링 3초 (MVP)

```javascript
// MVP 구현
setInterval(() => fetchTasks(), 3000);

// 확장 단계 (이 파일에 결정 추가 후 도입 가능)
// const ws = new WebSocket('ws://...')
```

WebSocket 도입 조건:
- 팀원 10명 이상 동시 사용 시 폴링 부하가 측정되는 경우
- 또는 실시간 필요성이 사용자 피드백으로 확인된 경우

---

### 6. 상태 관리 — 모듈 변수 + DOM 직접 갱신

```javascript
// state.js — 단일 상태 모듈
let tasks = [];

export function setTasks(data) {
  tasks = data;
  renderTaskList(tasks);  // 상태 변경 시 직접 DOM 갱신
}

export function getTasks() {
  return tasks;
}
```

전역 `window` 변수 사용 금지. ES 모듈(`import`/`export`)로 스코프를 제한한다.

---

### 7. 디자인 시스템 — macOS UI 토큰

**Tailwind 토큰 기준값**

| 토큰 | 클래스 | 의미 |
|------|--------|------|
| 모서리 | `rounded-xl` (12px) | 카드·버튼 기본 |
| 그림자 | `shadow-lg` | 카드 elevation |
| 반투명 | `backdrop-blur-sm` + `bg-white/80` | 라이트 카드 |
| 폰트 | `font-sans` (시스템 폰트 스택) | `-apple-system` 계열 |
| 터치 타깃 | `min-h-[44px] min-w-[44px]` | 모든 버튼·아이콘 버튼 |

**시스템 폰트 스택** (`tailwind.config` 커스텀 또는 CDN 기본값 활용)

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

**금지**: Material Design 아이콘, Ant Design 컴포넌트. 이유: 의존성 추가 금지 정책 위반.

---

### 8. 테마 — 라이트 / 다크 토글

**저장소**: `localStorage` 키 `'theme'`, 값 `'light'` | `'dark'`

**초기화 순서**

```javascript
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) return applyTheme(saved);

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}
```

Tailwind `dark:` variant 방식 사용. `tailwind.config`에서 `darkMode: 'class'` 설정.

```html
<!-- 라이트: bg-white  다크: bg-neutral-900 -->
<body class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
```
