# backend/models/__init__.py

# Importa la configuración de la DB para que sea accesible desde el paquete
from .base import Base, SessionLocal, engine

# Importa todas las clases de los modelos para exponerlas a través del paquete
from .cliente import Cliente, TipoDocumento
from .cancha import EstadoCancha, Deporte, Cancha, Horario, Servicio, CanchaxServicio
from .reserva import EstadoReserva, DetalleReserva, Reserva
from .pago import EstadoPago, MetodoPago, Pago
from .torneo import EstadoTorneo, Torneo, TorneoxCancha, Partido
from .equipo import Equipo, EquipoxCliente
from .usuario import Permiso, Usuario