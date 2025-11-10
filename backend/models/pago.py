from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from .base import Base

class EstadoPago(Base):
    __tablename__ = "EstadoPago"
    idEstado = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    def __repr__(self):
        return f"<EstadoPago(idEstado={self.idEstado}, nombre='{self.nombre}')>"
    pago = relationship("Pago", back_populates="estados")

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
