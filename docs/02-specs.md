# 02-specs — 기술 명세

> 기술 스택 결정의 상세 근거는 `03-design.md`를 참조한다.

---

## 기술 스택 요약

| 영역 | 선택 |
|------|------|
| 백엔드 | Python 3.11+ / FastAPI |
| 프론트엔드 | Vanilla JS (ES2022) + Tailwind CSS CDN |
| DB (로컬) | SQLite (`taskflow.db`) |
| DB (운영) | PostgreSQL 16 |
| ORM | SQLAlchemy 2.x + Alembic |
| 빌드 도구 | 없음 (CDN + 정적 파일 직접 서빙) |
| 실시간 | 폴링 3초 (`setInterval`) |
| 상태 관리 | 모듈 변수 + DOM 직접 갱신 |
| 테마 | Tailwind `dark:` variant + `localStorage('theme')` |

---

## 디렉토리 구조

```
taskflow-pro/
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점, CORS 설정
│   ├── database.py              # SQLAlchemy 엔진·세션 설정
│   ├── models.py                # Task ORM 모델
│   ├── schemas.py               # Pydantic 입출력 스키마
│   ├── router/
│   │   └── task.py              # /api/v1/tasks 라우터
│   ├── service/
│   │   └── task.py              # 비즈니스 로직
│   ├── alembic/                 # DB 마이그레이션
│   │   └── versions/
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── index.html               # 단일 페이지
│   ├── app.js                   # 진입점 (init, 이벤트 바인딩)
│   ├── state.js                 # 모듈 변수 + DOM 갱신 함수
│   ├── api.js                   # fetch 래퍼 (CRUD 5개)
│   ├── render.js                # 카드·모달·폼 렌더링
│   ├── theme.js                 # 라이트/다크 토글 + localStorage
│   └── utils.js                 # D-N 계산, 날짜 포맷
├── docs/
├── .env.example
└── CLAUDE.md
```

---

## 데이터 모델

### Task

| 필드 | 타입 | 제약 | 비고 |
|------|------|------|------|
| `id` | `VARCHAR` | PK, auto-generate (`uuid4`) | |
| `title` | `VARCHAR(200)` | NOT NULL | 1자 이상 200자 이하 |
| `description` | `TEXT` | NULL 허용 | |
| `status` | `ENUM` | NOT NULL, 기본값 `todo` | `todo` / `in_progress` / `done` |
| `due_at` | `DATETIME` | NULL 허용, UTC 저장 | ISO 8601 형식으로 입출력 |
| `created_at` | `DATETIME` | NOT NULL, 자동 설정 | 생성 시 서버가 기록 |
| `updated_at` | `DATETIME` | NOT NULL, 자동 갱신 | 수정 시 서버가 기록 |

### SQLAlchemy 모델 (`models.py`)

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Enum, DateTime
from sqlalchemy.orm import DeclarativeBase
import enum

class TaskStatus(str, enum.Enum):
    todo       = "todo"
    in_progress = "in_progress"
    done       = "done"

class Base(DeclarativeBase):
    pass

class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)
    due_at      = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))
```

### Pydantic 스키마 (`schemas.py`)

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from models import TaskStatus

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.todo
    due_at: Optional[datetime] = None

    @field_validator('due_at', mode='before')
    @classmethod
    def require_time_component(cls, v):
        # 날짜만 입력(문자열) 시 400 반환
        if isinstance(v, str) and len(v) <= 10:
            raise ValueError('due_at은 날짜+시간 형식이어야 합니다 (ISO 8601)')
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_at: Optional[datetime] = None

class TaskListItem(BaseModel):      # 목록: description 제외
    id: str
    title: str
    status: TaskStatus
    due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class TaskDetail(TaskListItem):     # 단건: description 포함
    description: Optional[str]
```

---

## 유효성 검사 & 에러 응답

### 에러 형식

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title은 필수입니다.",
    "fields": { "title": "필수 항목입니다." }
  }
}
```

`fields`는 검증 에러일 때만 포함한다.

### 규칙별 상태 코드

| 규칙 | 위반 시 |
|------|--------|
| `title` 누락 또는 빈 문자열 | `400 Bad Request` |
| `title` 200자 초과 | `400 Bad Request` |
| `status`가 열거값 외 값 | `400 Bad Request` |
| `due_at`이 ISO 8601 형식 아님 | `400 Bad Request` |
| 존재하지 않는 `:id` 조회·수정·삭제 | `404 Not Found` |
| 서버 내부 오류 | `500 Internal Server Error` |

### ISO 8601 허용 형식

```
2026-05-20T18:00:00.000Z      ← UTC (권장)
2026-05-20T18:00:00+09:00     ← 오프셋 포함 (서버가 UTC로 변환 저장)
```

날짜만 (`2026-05-20`) 입력 시 → `400` 반환. 시간까지 반드시 포함해야 한다.

---

## REST API

- **Base URL**: `/api/v1`
- **응답 형식**: `Content-Type: application/json`
- **목록 응답**: `description` 필드 **제외**
- **단건 응답**: `description` 필드 **포함**

---

### POST `/tasks` — 태스크 생성

**Request**

```json
{
  "title": "API 명세 작성",
  "description": "swagger 포함",
  "status": "todo",
  "due_at": "2026-05-20T18:00:00.000Z"
}
```

| 필드 | 필수 | 비고 |
|------|------|------|
| `title` | ✓ | |
| `description` | ✗ | |
| `status` | ✗ | 생략 시 `todo` |
| `due_at` | ✗ | |

**Response `201 Created`**

```json
{
  "id": "clx1abc123",
  "title": "API 명세 작성",
  "description": "swagger 포함",
  "status": "todo",
  "due_at": "2026-05-20T18:00:00.000Z",
  "created_at": "2026-05-14T09:00:00.000Z",
  "updated_at": "2026-05-14T09:00:00.000Z"
}
```

---

### GET `/tasks` — 태스크 목록

**Query Parameters** (선택)

| 파라미터 | 타입 | 예시 |
|---------|------|------|
| `status` | `todo` \| `in_progress` \| `done` | `?status=todo` |

**Response `200 OK`** — `description` 미포함

```json
[
  {
    "id": "clx1abc123",
    "title": "API 명세 작성",
    "status": "todo",
    "due_at": "2026-05-20T18:00:00.000Z",
    "created_at": "2026-05-14T09:00:00.000Z",
    "updated_at": "2026-05-14T09:00:00.000Z"
  }
]
```

---

### GET `/tasks/:id` — 태스크 단건

**Response `200 OK`** — `description` 포함

```json
{
  "id": "clx1abc123",
  "title": "API 명세 작성",
  "description": "swagger 포함",
  "status": "todo",
  "due_at": "2026-05-20T18:00:00.000Z",
  "created_at": "2026-05-14T09:00:00.000Z",
  "updated_at": "2026-05-14T09:00:00.000Z"
}
```

---

### PUT `/tasks/:id` — 태스크 수정 (부분 수정)

변경할 필드만 전송한다. 전송하지 않은 필드는 기존 값을 유지한다.

**Request**

```json
{ "status": "in_progress" }
```

**Response `200 OK`** — `description` 포함, 전체 객체 반환

```json
{
  "id": "clx1abc123",
  "title": "API 명세 작성",
  "description": "swagger 포함",
  "status": "in_progress",
  "due_at": "2026-05-20T18:00:00.000Z",
  "created_at": "2026-05-14T09:00:00.000Z",
  "updated_at": "2026-05-14T10:30:00.000Z"
}
```

---

### DELETE `/tasks/:id` — 태스크 삭제

**Response `204 No Content`** — 본문 없음

---

## 프론트엔드 핵심 동작

### 폴링 (`app.js`)

```javascript
// 3초마다 목록 자동 갱신
function startPolling() {
  fetchAndRender();
  setInterval(fetchAndRender, 3000);
}
```

### 상태 관리 (`state.js`)

```javascript
// 전역 window 변수 금지. ES 모듈 스코프로 제한
let tasks = [];
let activeModal = null;

export function setTasks(data) {
  tasks = data;
  renderTaskList(tasks);       // 상태 변경 → DOM 직접 갱신
}

export function getTasks() { return tasks; }
export function setModal(el) { activeModal = el; }
export function getModal()  { return activeModal; }
```

### 테마 초기화 (`theme.js`)

```javascript
export function initTheme() {
  const saved = localStorage.getItem('theme');
  applyTheme(saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}
```

### 환경 변수 (`.env.example`)

```dotenv
# 백엔드
DATABASE_URL=sqlite:///./taskflow.db   # 로컬
# DATABASE_URL=postgresql://user:password@localhost:5432/taskflow  # 운영

PORT=8000

# 프론트엔드 (정적 파일 서빙 시)
VITE_API_BASE_URL=http://localhost:8000/api/v1  # 빌드 도구 도입 시 사용
```

---

## 화면 명세 (CRUD 4종)

### 추가 — 태스크 생성 폼

```
┌─────────────────────────────────────────┐
│  새 태스크                          [✕] │
├─────────────────────────────────────────┤
│  제목 *                                 │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  0 / 200                               │
│                                        │
│  상태                  마감 시각        │
│  [TODO      ▼]         [YYYY-MM-DD HH:MM] │
│                                        │
│  설명 (선택)                           │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                        │
│              [취소]  [추가]            │
└─────────────────────────────────────────┘
```

- `title` 미입력 상태에서 추가 클릭 시 인라인 에러 표시
- `due_at` 입력: datetime-local input. 시간 생략 불가 (브라우저 기본 UI 활용)
- 추가 성공 시 폼 초기화 + 목록 즉시 반영 (낙관적 업데이트)

---

### 목록 — 태스크 카드 리스트

```
┌──────────────────────────────────────────────────────┐
│  TaskFlow Pro                    [🌙 다크]  [+ 추가] │
├──────────────────────────────────────────────────────┤
│  [전체 ▼]  [상태 ▼]                                 │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  ● TODO       API 명세 작성          [🗑]     │  │
│  │               D-6 18:00                        │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  ● IN PROGRESS  디자인 시스템        [🗑]     │  │
│  │                 D-1 09:00                       │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  ✓ DONE       환경 설정 완료          [🗑]    │  │
│  │               완료됨                           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**status 배지 색상**

| 값 | 배지 색 | 아이콘 |
|----|--------|--------|
| `todo` | neutral (회색) | ● |
| `in_progress` | blue | ● |
| `done` | green | ✓ |

**D-N 표시 규칙**

| 조건 | 표시 |
|------|------|
| `due_at` 없음 | 표시 안 함 |
| 오늘 자정 이전 (기한 초과) | `기한 초과` (red) |
| D-0 (오늘) | `오늘 HH:MM` (orange) |
| D-1 ~ D-6 | `D-N HH:MM` (yellow) |
| D-7 이상 | `D-N HH:MM` (neutral) |

`description`은 목록 카드에 표시하지 않는다.

---

### 수정 — 카드 클릭 → 모달

카드의 휴지통 아이콘 외 영역 클릭 시 수정 모달이 열린다.

```
┌─────────────────────────────────────────┐
│  태스크 수정                        [✕] │
├─────────────────────────────────────────┤
│  제목 *                                 │
│  ┌─────────────────────────────────┐   │
│  │  API 명세 작성                  │   │
│  └─────────────────────────────────┘   │
│                                        │
│  상태                  마감 시각        │
│  [IN_PROGRESS ▼]       [2026-05-20 18:00] │
│                                        │
│  설명                                  │
│  ┌─────────────────────────────────┐   │
│  │  swagger 포함                   │   │
│  └─────────────────────────────────┘   │
│                                        │
│              [취소]  [저장]            │
└─────────────────────────────────────────┘
```

- 모달 오픈 시 `GET /tasks/:id` 호출하여 `description` 포함 전체 데이터 로드
- 저장: `PUT /tasks/:id` 호출, 변경된 필드만 전송
- 저장 성공 시 모달 닫힘 + 목록 즉시 반영

---

### 삭제 — 휴지통 → 확인 → DELETE

```
┌───────────────────────────────┐
│  태스크를 삭제할까요?          │
│                               │
│  'API 명세 작성'을            │
│  삭제하면 되돌릴 수 없습니다. │
│                               │
│        [취소]  [삭제]         │
└───────────────────────────────┘
```

- 카드 우측 🗑 아이콘 클릭 → 확인 다이얼로그 표시
- 확인 클릭 → `DELETE /tasks/:id` 호출 → `204` 응답 후 목록에서 제거
- 취소 클릭 → 다이얼로그 닫힘, 변경 없음
