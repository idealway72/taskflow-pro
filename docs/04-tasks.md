# 04-tasks — 개발 태스크

> 이 파일은 MVP 개발 체크리스트다.
> 확장 단계(JWT, 팀, Kanban 등)는 별도 문서에서 다룬다.
> 마지막 업데이트: 2026-05-14

---

## 진행 규칙

| 규칙 | 내용 |
|------|------|
| **순서 준수** | 단계는 번호 순서대로만 진행한다. 이전 단계 검증이 통과되지 않으면 다음 단계로 넘어갈 수 없다 |
| **병렬 금지** | 두 단계를 동시에 진행하지 않는다 |
| **검증 필수** | 각 단계 완료 후 '검증 방법' 열의 조건을 반드시 확인한다 |
| **완료 선언** | 검증 통과 후 해당 행의 상태를 `완료`로 표시한다 |

---

## Phase 1 — 설계 `완료`

**목표**: 구현 전 모든 결정을 문서화한다. 코드 한 줄 없이 무엇을·어떻게 만들지 합의한 상태.

| # | 단계 | 상태 | 검증 방법 |
|---|------|------|----------|
| 1-01 | `CLAUDE.md` 작성 — 역할·절대규칙 5개·모호한 요청 처리 방침 | ✅ 완료 | 파일 존재 + 절대규칙 5개 항목 확인 |
| 1-02 | `docs/00-overview.md` 작성 — 문서 맵·읽는 순서·관심사 분리 | ✅ 완료 | 6개 파일 매핑표 존재 확인 |
| 1-03 | `docs/01-product.md` 초안 — 타겟·MVP 기능·범위 밖 초안 | ✅ 완료 | 파일 존재 확인 |
| 1-04 | `docs/02-specs.md` 초안 — Task 모델·API 5개·화면 명세 초안 | ✅ 완료 | 파일 존재 확인 |
| 1-05 | `docs/03-design.md` 초안 — 기술 결정 8개 초안 | ✅ 완료 | 파일 존재 확인 |
| 1-06 | `docs/04-tasks.md` 작성 — Phase별 체크리스트 | ✅ 완료 | 파일 존재 확인 |
| 1-07 | `docs/05-conventions.md` 작성 — 네이밍·커밋·브랜치 규약 | ✅ 완료 | 파일 존재 확인 |
| 1-08 | `docs/01-product.md` 확정 — MVP 목표·페르소나·성공 기준 확정 | ✅ 완료 | 성공 기준 5개 항목 존재 확인 |
| 1-09 | `docs/02-specs.md` 확정 — FastAPI + Vanilla JS 기준으로 업데이트 | ✅ 완료 | SQLAlchemy 모델·Pydantic 스키마 코드 블록 존재 확인 |
| 1-10 | `docs/03-design.md` 확정 — 8개 기술 결정 표 + 의존성 추가 정책 | ✅ 완료 | 결정 8행 표 + 정책 섹션 존재 확인 |

---

## Phase 2 — 백엔드 `완료`

**목표**: `uvicorn main:app --reload` 실행 후 Swagger(`/docs`)에서 CRUD 5개 엔드포인트가 모두 동작하는 상태.

| # | 단계 | 상태 | 검증 방법 |
|---|------|------|----------|
| 2-01 | `backend/` 폴더 생성 + Python 가상 환경(`venv`) 설정 + `requirements.txt` 작성 | ✅ 완료 | `pip install -r requirements.txt` 오류 없음 |
| 2-02 | `database.py` — SQLAlchemy 엔진·세션 설정, SQLite 연결 확인 | ✅ 완료 | `python -c "from database import engine; print(engine)"` 오류 없음 |
| 2-03 | `models.py` — `Task` ORM 모델 + `TaskStatus` enum 정의 | ✅ 완료 | `python -c "from models import Task; print(Task.__table__.columns.keys())"` 7개 필드 출력 |
| 2-04 | Alembic 초기화 + 첫 마이그레이션 생성 및 적용 | ✅ 완료 | `taskflow.db` 파일 생성 + `tasks` 테이블 존재 확인 (`sqlite3 taskflow.db ".tables"`) |
| 2-05 | `schemas.py` — `TaskCreate`, `TaskUpdate`, `TaskListItem`, `TaskDetail` Pydantic 스키마 | ✅ 완료 | `python -c "from schemas import TaskCreate; TaskCreate(title='test')"` 오류 없음 |
| 2-06 | `POST /api/v1/tasks` 구현 + 검증 (title 필수·200자 제한·due_at ISO 8601) | ✅ 완료 | Swagger에서 정상 title → `201`, 빈 title → `400`, 날짜만 due_at → `400` 확인 |
| 2-07 | `GET /api/v1/tasks` 구현 — 목록 반환, description 제외, `?status` 필터 | ✅ 완료 | Swagger에서 `200` 응답 + 응답 객체에 `description` 키 없음 확인 |
| 2-08 | `GET /api/v1/tasks/{id}` 구현 — 단건 반환, description 포함, 없는 id → 404 | ✅ 완료 | 존재 id → `200` + `description` 존재 / 없는 id → `404` 확인 |
| 2-09 | `PUT /api/v1/tasks/{id}` 구현 — 부분 수정, 변경 필드만 반영, updated_at 자동 갱신 | ✅ 완료 | `{"status": "done"}` 전송 후 `title` 유지 + `updated_at` 변경 확인 |
| 2-10 | `DELETE /api/v1/tasks/{id}` 구현 — `204` 반환, 없는 id → `404` | ✅ 완료 | 삭제 후 GET → `404` / Swagger `/docs` 에서 5개 엔드포인트 전부 표시 확인 |

---

## Phase 3 — 프론트엔드 `구현완료 / 브라우저검증 대기`

**목표**: 브라우저에서 CRUD 4종이 모두 동작하고, 360px에서 레이아웃이 깨지지 않으며, 테마 토글이 새로고침 후에도 유지되고, git push까지 완료된 상태.

| # | 단계 | 상태 | 검증 방법 |
|---|------|------|----------|
| 3-01 | `frontend/` 폴더 생성 — `index.html`, `app.js`, `state.js`, `api.js`, `render.js`, `theme.js`, `utils.js` 빈 파일 생성 | ✅ 완료 | 7개 파일 존재 확인 |
| 3-02 | `index.html` — Tailwind CDN, `darkMode: 'class'` 설정, 시스템 폰트, 기본 레이아웃 HTML 골격 | ✅ 완료 | 브라우저에서 `index.html` 열림 + 콘솔 에러 없음 |
| 3-03 | `theme.js` — 라이트/다크 토글, `localStorage('theme')`, `prefers-color-scheme` 초기값 | ✅ 완료 | 토글 클릭 후 새로고침 → 이전 테마 유지 확인 |
| 3-04 | `api.js` — `fetch` 래퍼 5개 함수 (`createTask`, `listTasks`, `getTask`, `updateTask`, `deleteTask`) + 에러 처리 | ✅ 완료 | `listTasks()` 호출 시 `[]` 또는 배열 반환 (백엔드 실행 상태에서) |
| 3-05 | `render.js` + `state.js` — 태스크 목록 카드 렌더링 + `utils.js` D-N 계산·날짜 포맷 + 폴링 3초 | ✅ 완료 | 백엔드에 태스크 추가 후 3초 내 화면 자동 반영 확인 |
| 3-06 | 태스크 추가 폼 — 제목·상태·due_at 입력, 유효성 에러 인라인 표시, 추가 후 목록 즉시 반영 | ✅ 완료 | 빈 제목 제출 → 에러 표시 / 정상 입력 → 목록에 카드 추가 확인 |
| 3-07 | 태스크 수정 모달 — 카드 클릭 시 모달 오픈, `GET /tasks/:id`로 데이터 로드, 저장 후 목록 반영 | ✅ 완료 | 카드 클릭 → 모달에 기존 값 표시 / 수정 저장 → 카드 내용 변경 확인 |
| 3-08 | 태스크 삭제 — 🗑 클릭 → 확인 다이얼로그 → `DELETE` 호출 → 카드 제거 + 360px 반응형 검증 + `git push` | ⏳ 브라우저 검증 대기 | Chrome DevTools 360px에서 가로 스크롤 없음 / 삭제 후 카드 사라짐 / GitHub 원격 저장소 push 확인 |

---

## 진행 현황 요약

| Phase | 단계 수 | 완료 | 남은 단계 |
|-------|--------|------|----------|
| Phase 1 — 설계 | 10 | 10 | 0 |
| Phase 2 — 백엔드 | 10 | 10 | 0 |
| Phase 3 — 프론트엔드 | 8 | 7 | 1 |
| **전체** | **28** | **27** | **1** |
