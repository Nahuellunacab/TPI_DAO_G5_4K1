from sqlalchemy import (
    Date, DateTime, create_engine, ForeignKeyConstraint,
    Column, Integer, String, Float, ForeignKey, UniqueConstraint, event
)
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

import os
from pathlib import Path
from datetime import date, datetime

# --- Configuración de la Base de Datos ---

env_url = os.getenv("DATABASE_URL")
if env_url:
    DATABASE_URL = env_url
else:
    # Construye una URL de sqlite basada en un archivo.
    db_path = Path(__file__).resolve().parent / "DatabaseCanchas.db"
    DATABASE_URL = f"sqlite:///{db_path.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    echo=True,
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


class TipoDocumento(Base):
    __tablename__ = "TipoDocumento"
    idTipoDoc = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False, unique=True)
    
    clientes = relationship("Cliente", back_populates="tipo_documento")

    def __repr__(self):
        return f"<TipoDocumento(idTipoDoc={self.idTipoDoc}, nombre='{self.nombre}')>"


class EstadoCancha(Base):
    __tablename__ = "EstadoCancha"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)

    def __repr__(self):
        return f"<EstadoCancha(idEstado={self.idEstado}, nombre='{self.nombre}')>"


class EstadoReserva(Base):
    __tablename__ = "EstadoReserva"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)

    def __repr__(self):
        return f"<EstadoReserva(idEstado={self.idEstado}, nombre='{self.nombre}')>"


class EstadoTorneo(Base):
    __tablename__ = "EstadoTorneo"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)

    def __repr__(self):
        return f"<EstadoTorneo(idEstado={self.idEstado}, nombre='{self.nombre}')>"


class EstadoPago(Base):
    __tablename__ = "EstadoPago"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)

    def __repr__(self):
        return f"<EstadoPago(idEstado={self.idEstado}, nombre='{self.nombre}')>"


class Cliente(Base):
    __tablename__ = "Cliente"
    idCliente = Column(Integer, primary_key=True, autoincrement=True)
    idTipoDoc = Column(Integer, ForeignKey("TipoDocumento.idTipoDoc"), nullable=False)
    numeroDoc = Column(Integer, nullable=False)
    nombre = Column(String(50))
    apellido = Column(String(50))
    mail = Column(String(50), unique=True)
    telefono = Column(String(20))
    fechaRegistro = Column(DateTime)

    tipo_documento = relationship("TipoDocumento", back_populates="clientes")

    __table_args__ = (UniqueConstraint('idTipoDoc', 'numeroDoc', name='uq_cliente_tipoydoc'),)

    def __repr__(self):
        return f"<Cliente({self.idTipoDoc}-{self.numeroDoc}, {self.nombre} {self.apellido}, mail='{self.mail}', telefono='{self.telefono}', fechaRegistro={self.fechaRegistro})>"
    # Relaciones ORM
    reservas = relationship("Reserva", back_populates="cliente")
    equipos = relationship("EquipoxCliente", back_populates="cliente")


class Deporte(Base):
    __tablename__ = "Deporte"
    idDeporte = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)

    def __repr__(self):
        return f"<Deporte(idDeporte={self.idDeporte}, nombre='{self.nombre}')>"


class Cancha(Base):
    __tablename__ = "Cancha"
    idCancha = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    deporte = Column(Integer, ForeignKey("Deporte.idDeporte"), nullable=False)
    precioHora = Column(Float, nullable=False)
    estado = Column(Integer, ForeignKey("EstadoCancha.idEstado"), nullable=False)

    def __repr__(self):
        return f"<Cancha(idCancha={self.idCancha}, nombre='{self.nombre}', deporte='{self.deporte}', precioHora={self.precioHora}, estado='{self.estado}')>"
    # relaciones ORM
    servicios = relationship("CanchaxServicio", back_populates="cancha", cascade="all, delete-orphan")
    torneos = relationship("TorneoxCancha", back_populates="cancha")
    estados = relationship("EstadoCancha", back_populates="cancha")


class Horario(Base):
    __tablename__ = "Horario"
    idHorario = Column(Integer, primary_key=True, autoincrement=True)
    horaInicio = Column(DateTime, nullable=False)
    horaFin = Column(DateTime, nullable=False)

    def __repr__(self):
        return f"<Horario(idHorario={self.idHorario}, horaInicio={self.horaInicio}, horaFin={self.horaFin})>"
    # relaciones ORM
    torneos = relationship("TorneoxCancha", back_populates="horario")
    detalles = relationship("DetalleReserva", back_populates="horario")
    

class Servicio(Base):
    __tablename__ = "Servicio"
    idServicio = Column(Integer, primary_key=True, autoincrement=True)
    descripcion = Column(String(200), nullable=False)
    
    def __repr__(self):
        return f"<Servicio(idServicio={self.idServicio}, descripcion='{self.descripcion}')>"
    # relaciones ORM
    canchas = relationship("CanchaxServicio", back_populates="servicio", cascade="all, delete-orphan")
    

class CanchaxServicio(Base):
    __tablename__ = "CanchaxServicio"
    idCxS= Column(Integer, primary_key=True, autoincrement=True)
    idCancha = Column(Integer, ForeignKey("Cancha.idCancha"))
    idServicio = Column(Integer, ForeignKey("Servicio.idServicio"))
    precioAdicional = Column(Float, nullable=False)

    cancha = relationship("Cancha", back_populates="servicios")
    servicio = relationship("Servicio", back_populates="canchas")


class DetalleReserva(Base):
    __tablename__ = "DetalleReserva"
    idDetalle = Column(Integer, primary_key=True, autoincrement=True)
    idCxS = Column(Integer, ForeignKey("CanchaxServicio.idCxS"), nullable=False)
    idHorario = Column(Integer, ForeignKey("Horario.idHorario"))
    idReserva = Column(Integer, ForeignKey("Reserva.idReserva"), nullable=False)
   


    def __repr__(self):
        return f"<DetalleReserva(idDetalle={self.idDetalle}, idCxS={self.idCxS}, idHorario={self.idHorario}, idReserva={self.idReserva})>"
    # Relaciones ORM auxiliares
    horario = relationship("Horario", back_populates="detalles")
    reserva = relationship("Reserva", back_populates="detalles")


class Reserva(Base):
    __tablename__ = "Reserva"
    idReserva = Column(Integer, primary_key=True, autoincrement=True)
    idCliente = Column(Integer, ForeignKey("Cliente.idCliente"), nullable=False)
    fechaReservada = Column(Date, nullable=False)
    estado = Column(Integer, ForeignKey("EstadoReserva.idEstado"), nullable=False)
    monto = Column(Float, nullable=False)
    fechaCreacion = Column(DateTime, nullable=False)

    def __repr__(self):
        return f"<Reserva(idReserva={self.idReserva}, idCliente={self.idCliente}, fechaReservada={self.fechaReservada}, estado='{self.estado}', monto={self.monto}, fechaCreacion={self.fechaCreacion})>"
    # Relaciones ORM
    detalles = relationship("DetalleReserva", back_populates="reserva", cascade="all, delete-orphan")
    cliente = relationship("Cliente", back_populates="reservas")
    estados = relationship("EstadoReserva", back_populates="reserva")


class MetodoPago(Base):
    __tablename__ = "MetodoPago"
    idMetodoPago = Column(Integer, primary_key=True, autoincrement=True)
    descripcion = Column(String(50), nullable=False, unique=True)  # 'tarjeta', 'efectivo', etc.

    def __repr__(self):
        return f"<MetodoPago(idMetodoPago={self.idMetodoPago}, descripcion='{self.descripcion}')>"


class Pago(Base):
    __tablename__ = "Pago"
    idPago = Column(Integer, primary_key=True, autoincrement=True)
    idReserva = Column(Integer, ForeignKey("Reserva.idReserva"), nullable=False)
    metodoPago = Column(Integer, ForeignKey("MetodoPago.idMetodoPago"), nullable=False)
    monto = Column(Float, nullable=False)
    fechaPago = Column(DateTime, nullable=False)
    estado = Column(Integer, ForeignKey("EstadoPago.idEstado"), nullable=False)

    def __repr__(self):
        return f"<Pago(idPago={self.idPago}, idReserva={self.idReserva}, monto={self.monto}, fechaPago={self.fechaPago}, estado='{self.estado}')>"
    estados = relationship("EstadoPago", back_populates="pago")
    reserva = relationship("Reserva", back_populates="pago")


class Equipo(Base):
    __tablename__ = "Equipo"
    idEquipo = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    
    def __repr__(self):
        return f"<Equipo(idEquipo={self.idEquipo}, nombre='{self.nombre}')>"
    clientes = relationship("EquipoxCliente", back_populates="equipo")
    

class Torneo(Base):
    __tablename__ = "Torneo"
    idTorneo = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    deporte = Column(Integer, ForeignKey("Deporte.idDeporte"), nullable=False)
    fechaInicio = Column(Date, nullable=False)
    fechaFin = Column(Date, nullable=False)
    estado = Column(Integer, ForeignKey("EstadoTorneo.idEstado"), nullable=False)
    
    def __repr__(self):
        return f"<Torneo(idTorneo={self.idTorneo}, nombre='{self.nombre}', deporte='{self.deporte}', fechaInicio={self.fechaInicio}, fechaFin={self.fechaFin}, estado='{self.estado}')>"
    equipos = relationship("EquipoxCliente", back_populates="torneo")
    cancha = relationship("TorneoxCancha", back_populates="torneo")
    estados = relationship("EstadoTorneo", back_populates="torneo")


class Partido(Base):
    __tablename__ = "Partido"
    idPartido = Column(Integer, primary_key=True, autoincrement=True)
    idTorneo = Column(Integer, ForeignKey("Torneo.idTorneo"), nullable=False)
    idCancha = Column(Integer, ForeignKey("Cancha.idCancha"), nullable=False)
    fecha = Column(Date, nullable=False)
    idHorario = Column(Integer, ForeignKey("Horario.idHorario"), nullable=False)
    idEquipoLocal = Column(Integer, ForeignKey("Equipo.idEquipo"), nullable=False)
    idEquipoVisitante = Column(Integer, ForeignKey("Equipo.idEquipo"), nullable=False)
    resultado = Column(String(20))  # '2-1', '0-0', etc.
    

class EquipoxCliente(Base):
    __tablename__ = "EquipoxCliente"
    idExC = Column(Integer, primary_key=True, autoincrement=True)
    idEquipo = Column(Integer, ForeignKey("Equipo.idEquipo"), nullable=False)
    idCliente = Column(Integer, ForeignKey("Cliente.idCliente"), nullable=False)
    idTorneo = Column(Integer, ForeignKey("Torneo.idTorneo"), nullable=False)

    equipo = relationship("Equipo", back_populates="clientes")
    cliente = relationship("Cliente", back_populates="equipos")
    torneo = relationship("Torneo", back_populates="equipos")

    def __repr__(self):
        return f"<EquipoxCliente(idEquipo={self.idEquipo}, idCliente={self.idCliente}, idTorneo={self.idTorneo})>"


class Permiso(Base):
    __tablename__ = "Permiso"
    idPermiso = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False, unique=True)  # e.g. 'admin', 'staff', 'user'

    def __repr__(self):
        return f"<Permiso(idPermiso={self.idPermiso}, nombre='{self.nombre}')>"


class Usuario(Base):
    __tablename__ = "Usuario"
    idUsuario = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(100), nullable=False, unique=True)
    contrasena = Column(String(200), nullable=False)  # almacenar hash en producción
    permiso = Column(Integer, ForeignKey("Permiso.idPermiso"))

    def __repr__(self):
        return f"<Usuario(idUsuario={self.idUsuario}, usuario='{self.usuario}', permisos='{self.permisos}')>"
    permisos = relationship("Permiso", secondary="usuario_permiso", back_populates="usuarios")



def seed_minimal_demo():
    """Inserta filas mínimas para demostrar las relaciones y consulta una fila.

    Inserta sólo si no hay datos en TipoDocumento (para evitar duplicados).
    """
    from sqlalchemy.orm import Session
    session = SessionLocal()
    try:
        # Verificar que las columnas esperadas existen en las tablas (evita errores si la DB ya tiene otro esquema)
        from sqlalchemy import inspect
        inspector = inspect(session.bind)
        cliente_cols = [c['name'] for c in inspector.get_columns('Cliente')] if 'Cliente' in inspector.get_table_names() else []
        if 'idTipoDoc' not in cliente_cols:
            print("La tabla 'Cliente' no tiene la columna 'idTipoDoc'. Se omite el seed para evitar errores de esquema.")
            return

        existing = session.query(TipoDocumento).first()
        if existing:
            print("Datos demo ya presentes — se omite seed.")
            return

        td = TipoDocumento(nombre="DNI")
        session.add(td)
        session.flush()

        cliente = Cliente(idTipoDoc=td.idTipoDoc, numeroDoc=12345678, nombre="Juan", apellido="Perez", mail="juan@example.com", telefono="123456789", fechaRegistro=datetime.now())
        session.add(cliente)

        deporte = Deporte(nombre="Futbol")
        session.add(deporte)
        session.flush()

        cancha = Cancha(nombre="Cancha 1", deporte=deporte.idDeporte, precioHora=500.0, estado="disponible")
        session.add(cancha)
        session.flush()

        servicio = Servicio(descripcion="Alquiler de cancha")
        session.add(servicio)
        session.flush()

        cvs = CanchaxServicio(idCancha=cancha.idCancha, idServicio=servicio.idServicio, precioAdicional=0.0)
        session.add(cvs)

        horario = Horario(horaInicio=datetime.now(), horaFin=datetime.now())
        session.add(horario)
        session.flush()

        reserva = Reserva(idCliente=cliente.idCliente, fechaReservada=date.today(), estado="confirmada", monto=500.0, fechaCreacion=datetime.now())
        session.add(reserva)
        session.flush()

        detalle = DetalleReserva(idCancha=cancha.idCancha, idServicio=servicio.idServicio, idHorario=horario.idHorario, idReserva=reserva.idReserva)
        session.add(detalle)

        metodo = MetodoPago(descripcion="efectivo")
        session.add(metodo)
        session.flush()

        pago = Pago(idReserva=reserva.idReserva, metodoPago=metodo.idMetodoPago, monto=reserva.monto, fechaPago=datetime.now(), estado="completado")
        session.add(pago)

        session.commit()
        print("Seed demo insertado correctamente.")
        # Mostrar una consulta simple
        filas = session.query(DetalleReserva).all()
        for f in filas:
            print(f)
    except Exception as e:
        session.rollback()
        print("Error al insertar seed demo:", e)
    finally:
        session.close()


if __name__ == "__main__":
    # Si ya existen tablas en la base, no hacemos create_all ni seed a menos que
    # se requiera explícitamente (evita tocar bases de datos con datos en prod).
    from sqlalchemy import inspect

    inspector = inspect(engine)
    existing_tables = [t for t in inspector.get_table_names() if not t.startswith('sqlite_')]
    if existing_tables:
        print("La base de datos ya contiene tablas. No se ejecutará create_all ni seed.")
        print("Tablas detectadas:")
        for t in existing_tables:
            print(f" - {t}")
        print("Si deseas forzar la creación/seed borra la base o ejecuta el script en un entorno limpio.")
    else:
        print("No se encontraron tablas — creando todas las tablas en la base de datos...")
        Base.metadata.create_all(bind=engine)
        print("Tablas creadas exitosamente.")
        # Ejecutar seed demo opcional
        seed_minimal_demo()
    # Si el resto de las tablas existen pero falta la tabla Usuario, crearla explícitamente
    # (esto permite añadir la tabla a una base existente sin recrear todo)
    missing_tables = [t for t in ['Usuario'] if t not in existing_tables]
    if missing_tables:
        print(f"Tablas faltantes detectadas: {missing_tables}. Creando sólo esas tablas...")
        Base.metadata.create_all(bind=engine, tables=[Usuario.__table__])
        print("Tabla Usuario creada correctamente.")