from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .base import Base

class TipoDocumento(Base):
    # The actual DB table name is 'TipoDoc' in the existing SQLite file.
    __tablename__ = "TipoDoc"
    idTipoDoc = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False, unique=True)
    
    clientes = relationship("Cliente", back_populates="tipo_documento")

    def __repr__(self):
        return f"<TipoDocumento(idTipoDoc={self.idTipoDoc}, nombre='{self.nombre}')>"

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
    
    reservas = relationship("Reserva", back_populates="cliente")
    equipos = relationship("EquipoxCliente", back_populates="cliente")
