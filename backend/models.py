from sqlalchemy import (
    Date, DateTime,
    Column, Integer, String, Float, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base
from datetime import date


class TipoDocumento(Base):
    # The actual DB table name is 'TipoDoc' in the existing SQLite file.
    __tablename__ = "TipoDoc"
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
    # relación hacia Cancha (un estado puede aplicarse a varias canchas)
    cancha = relationship("Cancha", back_populates="estados")


class EstadoReserva(Base):
    __tablename__ = "EstadoReserva"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoReserva(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    reserva = relationship("Reserva", back_populates="estados")


class EstadoTorneo(Base):
    __tablename__ = "EstadoTorneo"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoTorneo(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    torneo = relationship("Torneo", back_populates="estados")


class EstadoPago(Base):
    __tablename__ = "EstadoPago"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoPago(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    pago = relationship("Pago", back_populates="estados")


class Cliente(Base):
    __tablename__ = "Cliente"
    idCliente = Column(Integer, primary_key=True, autoincrement=True)
    idTipoDoc = Column('tipoDoc', Integer, ForeignKey("TipoDoc.idTipoDoc"), nullable=False)
    numeroDoc = Column(Integer, nullable=False)
    nombre = Column(String(50))
    apellido = Column(String(50))
    mail = Column(String(50), unique=True)
    telefono = Column(String(20))
    fechaRegistro = Column(DateTime)
    idUsuario = Column(Integer, ForeignKey("Usuario.idUsuario"))

    tipo_documento = relationship("TipoDocumento", back_populates="clientes")
    usuario = relationship("Usuario", back_populates="clientes")

    __table_args__ = (UniqueConstraint('tipoDoc', 'numeroDoc', name='uq_cliente_tipoydoc'),)

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
    descripcion = Column(String(200), nullable=True)
    imagen = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<Cancha(idCancha={self.idCancha}, nombre='{self.nombre}', deporte='{self.deporte}', precioHora={self.precioHora}, estado='{self.estado}')>"
    # relaciones ORM
    servicios = relationship("CanchaxServicio", back_populates="cancha", cascade="all, delete-orphan")
    torneos = relationship("TorneoxCancha", back_populates="cancha")
    estados = relationship("EstadoCancha", back_populates="cancha")


class Horario(Base):
    __tablename__ = "Horario"
    idHorario = Column(Integer, primary_key=True, autoincrement=True)
    horaInicio = Column(String(8), nullable=False)
    horaFin = Column(String(8), nullable=False)

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
    pago = relationship("Pago", back_populates="reserva", uselist=False, cascade="all, delete-orphan")


class MetodoPago(Base):
    __tablename__ = "MetodoPago"
    idMetodoPago = Column(Integer, primary_key=True, autoincrement=True)
    descripcion = Column(String(50), nullable=False, unique=True)

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


class TorneoxCancha(Base):
    __tablename__ = "TorneoxCancha"
    idTorneoCancha = Column(Integer, primary_key=True, autoincrement=True)
    idTorneo = Column(Integer, ForeignKey("Torneo.idTorneo"), nullable=False)
    idCancha = Column(Integer, ForeignKey("Cancha.idCancha"), nullable=False)
    idHorario = Column(Integer, ForeignKey("Horario.idHorario"), nullable=True)

    torneo = relationship("Torneo", back_populates="cancha")
    cancha = relationship("Cancha", back_populates="torneos")
    horario = relationship("Horario", back_populates="torneos")

    def __repr__(self):
        return f"<TorneoxCancha(idTorneoCancha={self.idTorneoCancha}, idTorneo={self.idTorneo}, idCancha={self.idCancha}, idHorario={self.idHorario})>"


class Partido(Base):
    __tablename__ = "Partido"
    idPartido = Column(Integer, primary_key=True, autoincrement=True)
    idTorneo = Column(Integer, ForeignKey("Torneo.idTorneo"), nullable=False)
    idCancha = Column(Integer, ForeignKey("Cancha.idCancha"), nullable=False)
    fecha = Column(Date, nullable=False)
    idHorario = Column(Integer, ForeignKey("Horario.idHorario"), nullable=False)
    idEquipoLocal = Column(Integer, ForeignKey("Equipo.idEquipo"), nullable=False)
    idEquipoVisitante = Column(Integer, ForeignKey("Equipo.idEquipo"), nullable=False)
    resultado = Column(String(20))


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
    nombre = Column(String(100), nullable=False, unique=True)

    def __repr__(self):
        return f"<Permiso(idPermiso={self.idPermiso}, nombre='{self.nombre}')>"
    usuarios = relationship("Usuario", back_populates="permiso_rel")


class Usuario(Base):
    __tablename__ = "Usuario"
    idUsuario = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column('usuario', String(100), nullable=False, unique=True)
    contrasena = Column('contraseña', String(200), nullable=False)
    permisos = Column('permisos', Integer, ForeignKey("Permiso.idPermiso"))
    imagen = Column(String(255), nullable=True)  # URL o path de la imagen de perfil

    def __repr__(self):
        return f"<Usuario(idUsuario={self.idUsuario}, usuario='{self.usuario}', permisos={self.permisos})>"
    permiso_rel = relationship("Permiso", back_populates="usuarios")
    clientes = relationship("Cliente", back_populates="usuario")

class Empleado(Base):
    __tablename__ = "Empleado"
    idEmpleado = Column(Integer, primary_key=True, autoincrement=True)
    idUsuario = Column(Integer, ForeignKey("Usuario.idUsuario"), nullable=False)
    tipoDoc = Column(Integer, ForeignKey("TipoDoc.idTipoDoc"), nullable=False)
    documento = Column(Integer, nullable=False)
    nombre = Column(String(50))
    apellido = Column(String(50))
    fechaIngreso = Column(Date, default=date.today)
    telefono = Column(Integer, unique=True)
    mail = Column(String(50), unique=True)

    def __repr__(self):
        return f"<Empleado(idEmpleado={self.idEmpleado}, nombre='{self.nombre}', apellido='{self.apellido}', documento={self.documento})>"
    usuario = relationship("Usuario")
    tipo_documento = relationship("TipoDocumento")
