import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# 환경 변수 미설정 시 SQLite 파일 사용
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./taskflow.db")

# SQLite는 스레드 체크를 비활성화해야 FastAPI와 함께 동작
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    # FastAPI 의존성 주입용 DB 세션 생성기
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
