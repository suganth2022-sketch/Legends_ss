"""Database engine, session factory, and the declarative Base every model
inherits from. Use `get_db` as a FastAPI dependency — don't create sessions
any other way.

Services call `db.commit()` explicitly once a unit of work is complete, so
everything inside one request (e.g. payment + audit row + commission ledger
rows) commits or rolls back together. An uncommitted session is rolled back
when `get_db` closes it.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings


def _engine_url(raw_url: str) -> str:
    """Strip query params meaningful only to Prisma (e.g. `pgbouncer=true`) that
    libpq/psycopg2 rejects as invalid connection options."""
    url = make_url(raw_url)
    if url.query:
        url = url.set(query={k: v for k, v in url.query.items() if k != "pgbouncer"})
    return url.render_as_string(hide_password=False)


def make_engine(raw_url: str) -> Engine:
    url = make_url(raw_url)
    if url.get_backend_name() == "sqlite":  # used only by the automated tests
        return create_engine(
            raw_url, connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    return create_engine(_engine_url(raw_url), pool_pre_ping=True, pool_size=5, max_overflow=5)


engine = make_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
