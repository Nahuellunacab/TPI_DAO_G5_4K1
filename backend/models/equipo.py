from sqlalchemy import (
    Column, Integer, String, ForeignKey
)
from sqlalchemy.orm import relationship
from .base import Base

class Equipo(Base):
    __tablename__ = "Equipo"
    idEquipo = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    
    def __repr__(self):
        return f"<Equipo(idEquipo={self.idEquipo}, nombre='{self.nombre}')>"
    
    clientes = relationship("EquipoxCliente", back_populates="equipo")

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
