from sqlalchemy import (
    Column, Integer, String, ForeignKey, Date
)
from sqlalchemy.orm import relationship
from .base import Base

class EstadoTorneo(Base):
    __tablename__ = "EstadoTorneo"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoTorneo(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    torneo = relationship("Torneo", back_populates="estados")

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
