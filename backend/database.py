from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os
from pathlib import Path

# --- Configuración de la Base de Datos ---

env_url = os.getenv("DATABASE_URL")
if env_url:
    DATABASE_URL = env_url
else:
    # Construye una URL de sqlite basada en un archivo.
    # Asume que la base de datos está en el directorio 'database' a nivel de proyecto.
    project_root = Path(__file__).resolve().parent.parent
    db_path = project_root / "database" / "DatabaseCanchas.db"
    DATABASE_URL = f"sqlite:///{db_path.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Se puede poner en True para depurar queries SQL
    connect_args={"check_same_thread": False, "timeout": 30},
    poolclass=NullPool,
)

# Ensure WAL mode and a reasonable busy timeout to reduce "database is locked"
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout = 30000;")
        cursor.close()
    except Exception:
        # Best-effort; if it fails (e.g., not sqlite) we ignore
        pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
