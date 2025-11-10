from sqlalchemy import (
    Column, Integer, String, ForeignKey
)
from sqlalchemy.orm import relationship
from .base import Base

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

    def __repr__(self):
        return f"<Usuario(idUsuario={self.idUsuario}, usuario='{self.usuario}', permisos={self.permisos})>"
    
    permiso_rel = relationship("Permiso", back_populates="usuarios")
    clientes = relationship("Cliente", back_populates="usuario")
