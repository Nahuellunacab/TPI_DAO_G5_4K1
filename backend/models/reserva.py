from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, Date, DateTime
)
from sqlalchemy.orm import relationship
from .base import Base

class EstadoReserva(Base):
    __tablename__ = "EstadoReserva"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoReserva(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    reserva = relationship("Reserva", back_populates="estados")

class DetalleReserva(Base):
    __tablename__ = "DetalleReserva"
    idDetalle = Column(Integer, primary_key=True, autoincrement=True)
    idCxS = Column(Integer, ForeignKey("CanchaxServicio.idCxS"), nullable=False)
    idHorario = Column(Integer, ForeignKey("Horario.idHorario"))
    idReserva = Column(Integer, ForeignKey("Reserva.idReserva"), nullable=False)
   
    def __repr__(self):
        return f"<DetalleReserva(idDetalle={self.idDetalle}, idCxS={self.idCxS}, idHorario={self.idHorario}, idReserva={self.idReserva})>"
    
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
    
    detalles = relationship("DetalleReserva", back_populates="reserva", cascade="all, delete-orphan")
    cliente = relationship("Cliente", back_populates="reservas")
    estados = relationship("EstadoReserva", back_populates="reserva")
    pago = relationship("Pago", back_populates="reserva", uselist=False, cascade="all, delete-orphan")
