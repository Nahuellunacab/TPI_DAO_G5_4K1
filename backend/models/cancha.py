from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from .base import Base

class EstadoCancha(Base):
    __tablename__ = "EstadoCancha"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoCancha(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    cancha = relationship("Cancha", back_populates="estados")

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
    
    torneos = relationship("TorneoxCancha", back_populates="horario")
    detalles = relationship("DetalleReserva", back_populates="horario")

class Servicio(Base):
    __tablename__ = "Servicio"
    idServicio = Column(Integer, primary_key=True, autoincrement=True)
    descripcion = Column(String(200), nullable=False)
    
    def __repr__(self):
        return f"<Servicio(idServicio={self.idServicio}, descripcion='{self.descripcion}')>"
    
    canchas = relationship("CanchaxServicio", back_populates="servicio", cascade="all, delete-orphan")

class CanchaxServicio(Base):
    __tablename__ = "CanchaxServicio"
    idCxS= Column(Integer, primary_key=True, autoincrement=True)
    idCancha = Column(Integer, ForeignKey("Cancha.idCancha"))
    idServicio = Column(Integer, ForeignKey("Servicio.idServicio"))
    precioAdicional = Column(Float, nullable=False)

    cancha = relationship("Cancha", back_populates="servicios")
    servicio = relationship("Servicio", back_populates="canchas")
