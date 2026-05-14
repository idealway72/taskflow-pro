# 05-conventions — 팀 규약

---

## 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 백엔드 변수·함수·파일 | `snake_case` | `task_service.py`, `get_task_by_id()`, `due_at` |
| 프론트엔드 변수·함수 | `camelCase` | `fetchTasks()`, `dueAt`, `renderTaskList()` |
| 프론트엔드 컴포넌트 함수 | `PascalCase` | `TaskCard()`, `ConfirmDialog()` |
| 상수 (불변 원시값) | `UPPER_SNAKE_CASE` | `MAX_TITLE_LENGTH = 200`, `POLL_INTERVAL = 3000` |
| 코드 식별자 | **영어** | 변수명·함수명·파일명·클래스명 전부 영어 |
| 주석 | **한국어** | `# 삭제 전 확인 다이얼로그 표시` |

**식별자에 한국어 사용 금지.** 주석으로만 의도를 한국어로 설명한다.

```python
# ✅ 올바른 예
def get_overdue_tasks(db: Session) -> list[Task]:
    # 현재 시각 기준 기한이 지난 태스크만 반환
    now = datetime.now(timezone.utc)
    return db.query(Task).filter(Task.due_at < now).all()

# ❌ 잘못된 예
def 기한초과_태스크_가져오기(db):
    ...
```

---

## 금지 목록

| 금지 | 이유 | 대안 |
|------|------|------|
| `print()` 디버깅 | 운영 로그에 노이즈 유입. 제거 누락 시 민감 정보 노출 가능 | `import logging` 후 `logger.debug()` / `logger.info()` 사용 |
| `bare except:` | 모든 예외를 무조건 삼켜 버그를 숨김. `KeyboardInterrupt`·`SystemExit`까지 잡음 | `except ValueError:`, `except HTTPException:` 등 구체적 예외 명시 |
| 비밀번호·시크릿 하드코딩 | 코드 저장소에 노출 시 보안 사고 직결 | `.env` 파일에 저장 + `os.getenv("SECRET_KEY")` 로 주입. `.env`는 `.gitignore`에 등록 |
| TypeScript `any` 타입 | 타입 검사를 우회해 런타입 오류를 컴파일 시점에 잡지 못함. 타입 시스템 의미 상실 | 명시적 타입 선언 또는 `unknown` + 타입 가드 사용 |
| CSS `!important` | 우선순위 계산이 꼬여 유지보수 불능 상태 초래 | CSS 셀렉터 구체성 높이기. Tailwind에서는 클래스 순서 조정 또는 `@layer` 활용 |

### 위반 예시

```python
# ❌ print 디버깅
print("task id:", task.id)

# ✅ 대안
import logging
logger = logging.getLogger(__name__)
logger.debug("task id: %s", task.id)
```

```python
# ❌ bare except
try:
    result = db.query(Task).filter(Task.id == id).first()
except:
    return None

# ✅ 대안
try:
    result = db.query(Task).filter(Task.id == id).first()
except SQLAlchemyError as e:
    logger.error("DB 조회 실패: %s", e)
    raise
```

```python
# ❌ 하드코딩
SECRET_KEY = "mysecretkey123"

# ✅ 대안
import os
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("환경 변수 SECRET_KEY가 설정되지 않았습니다")
```

---

## 테스트 규칙

### 도구

| 항목 | 선택 |
|------|------|
| 프레임워크 | `pytest` |
| HTTP 테스트 | `httpx` + FastAPI `TestClient` |
| 위치 | `backend/tests/test_task.py` |

### 필수 테스트 케이스

각 엔드포인트마다 아래 케이스를 **모두** 작성한다.

| 엔드포인트 | 정상 케이스 | 에러 케이스 |
|-----------|------------|------------|
| `POST /tasks` | `201` + 반환 객체 필드 확인 | 빈 title → `400` / 날짜만 due_at → `400` |
| `GET /tasks` | `200` + 배열 반환 + description 키 없음 | status 열거값 외 값 → `400` |
| `GET /tasks/{id}` | `200` + description 포함 | 없는 id → `404` |
| `PUT /tasks/{id}` | `200` + 수정 필드 반영 + updated_at 변경 | 없는 id → `404` / 빈 title → `400` |
| `DELETE /tasks/{id}` | `204` + 본문 없음 | 없는 id → `404` |

### 테스트 명명 규칙

```python
# 형식: test_<엔드포인트>_<시나리오>
def test_create_task_success():          ...
def test_create_task_empty_title():      ...
def test_create_task_date_only_due_at(): ...
def test_get_task_not_found():           ...
```

### 실행 명령

```bash
# backend/ 디렉토리에서
pytest tests/ -v

# 커버리지 포함
pytest tests/ -v --cov=. --cov-report=term-missing
```

---

## Git 커밋 규칙

### 형식

```
<type>: <한국어 요약>
```

- type은 영어 소문자
- 요약은 한국어, 50자 이내
- 마침표 없음

### type 목록

| type | 사용 시점 | 예시 |
|------|----------|------|
| `feat` | 새 기능 추가 | `feat: 태스크 생성 API 구현` |
| `fix` | 버그 수정 | `fix: due_at 날짜만 입력 시 400 미반환 수정` |
| `docs` | 문서 변경 | `docs: 02-specs FastAPI 기준으로 업데이트` |
| `refactor` | 동작 변경 없는 코드 개선 | `refactor: task 서비스 레이어 분리` |
| `test` | 테스트 추가·수정 | `test: PUT 엔드포인트 404 케이스 추가` |
| `chore` | 빌드·설정·의존성 변경 | `chore: requirements.txt 초기 작성` |

### 규칙

- **하나의 커밋 = 하나의 논리적 변경.** 무관한 수정을 묶지 않는다.
- `feat`와 `test`는 같은 커밋에 넣지 않는다. 기능 커밋 후 테스트 커밋을 별도로 만든다.
- 커밋 전 `git diff --staged` 로 의도하지 않은 파일이 포함되지 않았는지 확인한다.

### 브랜치 전략 (MVP)

```
main          ← 항상 동작하는 상태 유지
└── phase2/backend-api
└── phase3/frontend-crud
```

- `main`에 직접 커밋하지 않는다 (Phase 1 초기 설정 제외).
- 각 Phase 브랜치에서 작업 후 완료 시 `main`으로 머지한다.
