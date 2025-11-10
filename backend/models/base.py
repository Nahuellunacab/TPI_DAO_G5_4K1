from sqlalchemy import create_engine, event
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

# --- Configuración de la Base de Datos ---

env_url = os.getenv("DATABASE_URL")
if env_url:
    DATABASE_URL = env_url
else:
    # Construye una URL de sqlite basada en un archivo.
    # La ruta es relativa a este archivo: backend/models/base.py
    # Sube tres niveles (models -> backend -> root) y luego entra a 'database'
    db_path = Path(__file__).resolve().parent.parent.parent / "database" / "DatabaseCanchas.db"
    DATABASE_URL = f"sqlite:///{db_path.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    echo=False, # Se recomienda desactivar 'echo' para no llenar los logs en producción
    connect_args={"check_same_thread": False, "timeout": 30},
    poolclass=NullPool,
)

# Asegura el modo WAL y un timeout para reducir bloqueos de la base de datos
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout = 30000;")
        cursor.close()
    except Exception:
        # Ignorar si falla (por si no es sqlite)
        pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa que todos los modelos usarán
Base = declarative_base()
