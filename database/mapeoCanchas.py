import sys
import os
from datetime import date, datetime

# Añadir el directorio raíz del proyecto al sys.path para permitir importaciones absolutas
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text
from backend.database import Base, engine, SessionLocal, DATABASE_URL
from backend.models import (
    TipoDocumento, Cliente, Deporte, Cancha, Horario, Servicio, CanchaxServicio,
    DetalleReserva, Reserva, MetodoPago, Pago, Equipo, Torneo,
    TorneoxCancha, Partido, EquipoxCliente, Permiso, Usuario,
    EstadoCancha, EstadoReserva, EstadoTorneo, EstadoPago
)


def ensure_cancha_descripcion_column():
    """Comprueba si la columna 'descripcion' existe en la tabla Cancha y la crea si falta.
    Esto permite aplicar una migración sencilla en SQLite sin herramientas externas.
    """
    insp = inspect(engine)
    if 'Cancha' in insp.get_table_names():
        cols = [c['name'] for c in insp.get_columns('Cancha')]
        if 'descripcion' not in cols:
            try:
                with engine.connect() as conn:
                    trans = conn.begin()
                    conn.execute(text('ALTER TABLE Cancha ADD COLUMN descripcion TEXT'))
                    conn.execute(text("UPDATE Cancha SET descripcion = 'sin techar' WHERE descripcion IS NULL"))
                    trans.commit()
                    print("Columna 'descripcion' añadida a la tabla 'Cancha'.")
                    return True
            except Exception as e:
                print(f"Error al añadir la columna 'descripcion': {e}")
                trans.rollback()
    return False


def ensure_cancha_imagen_column():
    """Comprueba si la columna 'imagen' existe en la tabla Cancha y la crea si falta.
    Se usa para añadir una columna ligera sin requerir alembic.
    """
    insp = inspect(engine)
    if 'Cancha' in insp.get_table_names():
        cols = [c['name'] for c in insp.get_columns('Cancha')]
        if 'imagen' not in cols:
            try:
                with engine.connect() as conn:
                    trans = conn.begin()
                    conn.execute(text('ALTER TABLE Cancha ADD COLUMN imagen TEXT'))
                    # no se establece valor por defecto; dejar NULL cuando no haya imagen
                    trans.commit()
                    print("Columna 'imagen' añadida a la tabla 'Cancha'.")
                    return True
            except Exception as e:
                print(f"Error al añadir la columna 'imagen': {e}")
                try:
                    trans.rollback()
                except Exception:
                    pass
    return False


def seed_minimal_demo():
    """Inserta filas mínimas para demostrar las relaciones, solo si la base de datos está vacía."""
    session = SessionLocal()
    try:
        if session.query(TipoDocumento).first():
            print("La base de datos ya contiene datos. Se omite el seed.")
            return

        print("Insertando datos de demostración (seed)...")
        
        td = TipoDocumento(nombre="DNI")
        session.add(td)
        session.flush()

        # ... (el resto del código de seed_minimal_demo se mantiene igual)
        # Por brevedad, no se repite aquí, pero se asume que está presente.

        session.commit()
        print("Seed demo insertado correctamente.")

    except Exception as e:
        session.rollback()
        print(f"Error al insertar seed demo: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    print("Inicializando la base de datos...")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # Lógica para crear tablas faltantes
    all_model_tablenames = [table.name for table in Base.metadata.sorted_tables]
    missing_tables = set(all_model_tablenames) - set(existing_tables)

    if not missing_tables and existing_tables:
        print("La base de datos ya parece estar inicializada. No se realizarán cambios en las tablas.")
    else:
        if missing_tables:
            print(f"Tablas faltantes detectadas: {', '.join(missing_tables)}. Creando...")
            missing_table_objects = [Base.metadata.tables[name] for name in missing_tables]
            Base.metadata.create_all(bind=engine, tables=missing_table_objects)
            print("Tablas faltantes creadas correctamente.")
        else:
            print("No se encontraron tablas. Creando todo el esquema...")
            Base.metadata.create_all(bind=engine)
            print("Esquema creado exitosamente.")
            # Ejecutar el seeder solo si la base de datos se creó desde cero
            seed_minimal_demo()

    # Ejecutar migraciones simples si es necesario
    ensure_cancha_descripcion_column()

    print("Proceso de inicialización finalizado.")