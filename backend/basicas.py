#EN ESTE ARCHIVO VAN A ESTAR LOS ABMC Y FUNCIONES BÁSICAS NECESARIAS DIVIDIDOS POR TABLAS
#(LO PONGO EN UN SOLO ARCHIVO PARA QUE SEA MÁS FÁCIL EL IMPORT DE VARIAS FUNCIONES A LA VEZ)

from typing import List, Dict, Any
from sqlalchemy import func, desc

from database.mapeoCanchas import (
	SessionLocal,
	Cliente,
	Cancha,
	Horario,
	Equipo,
	Partido,
    Servicio,
    Torneo,
	Usuario,
	Permiso,
	EstadoCancha,
	EstadoReserva,
	EstadoTorneo,
	EstadoPago,
	Deporte,
	MetodoPago,
	TipoDocumento,
	Reserva,
	Pago,
	DetalleReserva,
	CanchaxServicio,
    EquipoxCliente,
)


def _to_dict(obj) -> Dict[str, Any]:
	"""Convierte un objeto ORM a diccionario plano.

	No intenta serializar relaciones complejas; solo devuelve las columnas
	definidas en la tabla para que sea simple de leer.
	"""
	if obj is None:
		return {}
	return {col.name: getattr(obj, col.name) for col in obj.__table__.columns}


#---------------- Tipo Documento ----------------

def get_tipo_documento(idTipoDoc: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(TipoDocumento, idTipoDoc))
	finally:
		session.close()

def list_tipos_documento() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		rows = session.query(TipoDocumento).all()
		return [_to_dict(r) for r in rows]
	finally:
		session.close()


# ---------------- Clientes ----------------

def create_cliente(idTipoDoc: int, numeroDoc: int, nombre: str = None,
				   apellido: str = None, mail: str = None, telefono: str = None, fechaRegistro = None) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		cliente = Cliente(idTipoDoc=idTipoDoc, numeroDoc=numeroDoc, nombre=nombre,
						  apellido=apellido, mail=mail, telefono=telefono, fechaRegistro=fechaRegistro)
		session.add(cliente)
		session.commit()  # aquí se guarda en la DB
		session.refresh(cliente)  # actualiza el objeto con la PK autogenerada
		return _to_dict(cliente)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_cliente(idCliente: int) -> Dict[str, Any]:
	"""Consulta un cliente por su id. Devuelve {} si no existe."""
	session = SessionLocal()
	try:
		obj = session.get(Cliente, idCliente)
		return _to_dict(obj)
	finally:
		session.close()

def get_cliente_by_doc(idTipoDoc: int, numeroDoc: int) -> Dict[str, Any]:
	"""Consulta un cliente por su tipo y número de documento. Devuelve {} si no existe."""
	session = SessionLocal()
	try:
		obj = session.query(Cliente).filter(
			Cliente.idTipoDoc == idTipoDoc,
			Cliente.numeroDoc == numeroDoc
		).first()
		return _to_dict(obj)
	finally:
		session.close()


def list_clientes() -> List[Dict[str, Any]]:
	"""Devuelve todos los clientes como lista de dicts."""
	session = SessionLocal()
	try:
		rows = session.query(Cliente).all()
		return [_to_dict(r) for r in rows]
	finally:
		session.close()


def update_cliente(
	idCliente: int,
	idTipoDoc: int = None,
	numeroDoc: int = None,
	nombre: str = None,
	apellido: str = None,
	mail: str = None,
	telefono: str = None,
	fechaRegistro = None,
) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		cliente = session.get(Cliente, idCliente)
		if not cliente:
			return {}

		# Para cada parámetro explícito: si no es None, aplicarlo al objeto
		if idTipoDoc is not None:
			cliente.idTipoDoc = idTipoDoc
		if numeroDoc is not None:
			cliente.numeroDoc = numeroDoc
		if nombre is not None:
			cliente.nombre = nombre
		if apellido is not None:
			cliente.apellido = apellido
		if mail is not None:
			cliente.mail = mail
		if telefono is not None:
			cliente.telefono = telefono
		if fechaRegistro is not None:
			cliente.fechaRegistro = fechaRegistro

		session.commit()
		session.refresh(cliente)
		return _to_dict(cliente)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_cliente(idCliente: int) -> bool:
	"""Elimina un cliente por id. Devuelve True si se eliminó, False si no existía."""
	session = SessionLocal()
	try:
		cliente = session.get(Cliente, idCliente)
		if not cliente:
			return False
		session.delete(cliente)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def list_reservas_por_cliente_en_periodo(fechaDesde=None, fechaHasta=None, idCliente: int = None) -> List[Dict[str, Any]]:
	"""Devuelve un listado de reservas agrupadas por cliente dentro de un periodo.

	Parámetros:
	- fechaDesde: fecha mínima (inclusive) para Reserva.fechaReservada
	0
	- fechaHasta: fecha máxima (inclusive) para Reserva.fechaReservada
	- idCliente: opcional, filtrar sólo ese cliente

	Resultado: lista de objetos {'cliente': cliente_dict, 'reservas': [reserva_dict, ...]}.
	"""
	from datetime import date as _date, datetime as _datetime

	# Normalizar datetime -> date
	if fechaDesde is not None and isinstance(fechaDesde, _datetime):
		fechaDesde = fechaDesde.date()
	if fechaHasta is not None and isinstance(fechaHasta, _datetime):
		fechaHasta = fechaHasta.date()

	today = _date.today()
	if fechaHasta is not None and fechaHasta > today:
		raise ValueError(f"fechaHasta ({fechaHasta}) no puede ser posterior a la fecha actual ({today})")
	if fechaDesde is not None and fechaHasta is not None and fechaDesde > fechaHasta:
		raise ValueError("fechaDesde no puede ser posterior a fechaHasta")

	session = SessionLocal()
	try:
		q = session.query(Reserva)
		if idCliente is not None:
			q = q.filter(Reserva.idCliente == idCliente)
		if fechaDesde is not None:
			q = q.filter(Reserva.fechaReservada >= fechaDesde)
		if fechaHasta is not None:
			q = q.filter(Reserva.fechaReservada <= fechaHasta)

		reservas = q.order_by(Reserva.idCliente, Reserva.fechaReservada, Reserva.fechaCreacion).all()

		# Agrupar por cliente
		clientes_map = {}
		for r in reservas:
			cid = r.idCliente
			if cid not in clientes_map:
				cliente_obj = session.get(Cliente, cid)
				clientes_map[cid] = {'cliente': _to_dict(cliente_obj), 'reservas': []}
			clientes_map[cid]['reservas'].append(_to_dict(r))

		# Devolver como lista
		return list(clientes_map.values())
	finally:
		session.close()
		
        

# ---------------- Canchas ----------------

def create_cancha(nombre: str, deporte: int, precioHora: float, estado: int) -> Dict[str, Any]:
	"""Crear cancha y devolverla como dict."""
	session = SessionLocal()
	try:
		cancha = Cancha(nombre=nombre, deporte=deporte, precioHora=precioHora, estado=estado)
		session.add(cancha)
		session.commit()
		session.refresh(cancha)
		return _to_dict(cancha)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_cancha(idCancha: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Cancha, idCancha))
	finally:
		session.close()


def list_canchas() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(c) for c in session.query(Cancha).all()]
	finally:
		session.close()


def update_cancha(idCancha: int, nombre: str = None, deporte: int = None, precioHora: float = None, estado: int = None) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		cancha = session.get(Cancha, idCancha)
		if not cancha:
			return {}
		if nombre is not None:
			cancha.nombre = nombre
		if deporte is not None:
			cancha.deporte = deporte
		if precioHora is not None:
			cancha.precioHora = precioHora
		if estado is not None:
			cancha.estado = estado
		session.commit()
		session.refresh(cancha)
		return _to_dict(cancha)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_cancha(idCancha: int) -> bool:
	session = SessionLocal()
	try:
		cancha = session.get(Cancha, idCancha)
		if not cancha:
			return False
		session.delete(cancha)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()
		

def cancha_mas_usada() -> Dict[str, Any]:
	"""Devuelve un resumen de la cancha más utilizada.
	La métrica usada es el número de reservas (count distinct idReserva) en las que
	aparece la cancha según la tabla DetalleReserva.
	"""
	session = SessionLocal()
	try:
		# contar reservas por cancha (distinct idReserva)
		q = (
			session.query(DetalleReserva.idCancha.label('idCancha'), func.count(func.distinct(DetalleReserva.idReserva)).label('cnt'))
			.group_by(DetalleReserva.idCancha)
			.order_by(desc('cnt'))
		)
		top = q.first()
		if not top:
			return {}

		id_cancha = top.idCancha
		conteo = int(top.cnt)

		cancha = session.get(Cancha, id_cancha)
		nombre = cancha.nombre if cancha else None

		return {'idCancha': id_cancha, 'nombre': nombre, 'conteo_reservas': conteo}
	finally:
		session.close()


def list_reservas_por_cancha(idCancha: int, fechaDesde=None, fechaHasta=None) -> List[Dict[str, Any]]:
	"""Devuelve las reservas que incluyen la cancha indicada, con sus detalles (sólo los detalles de esa cancha).

	Parámetros opcionales:
	- fechaDesde: fecha mínima (inclusive) para Reserva.fechaReservada
	- fechaHasta: fecha máxima (inclusive) para Reserva.fechaReservada

	Cada elemento tiene la forma: { reserva_columns..., 'detalles': [detalle_dict, ...] }
	"""
	from datetime import date as _date, datetime as _datetime

	# Normalizar datetime -> date
	if fechaDesde is not None and isinstance(fechaDesde, _datetime):
		fechaDesde = fechaDesde.date()
	if fechaHasta is not None and isinstance(fechaHasta, _datetime):
		fechaHasta = fechaHasta.date()

	today = _date.today()
	if fechaHasta is not None and fechaHasta > today:
		raise ValueError(f"fechaHasta ({fechaHasta}) no puede ser posterior a la fecha actual ({today})")
	if fechaDesde is not None and fechaHasta is not None and fechaDesde > fechaHasta:
		raise ValueError("fechaDesde no puede ser posterior a fechaHasta")

	session = SessionLocal()
	try:
		q = (
			session.query(Reserva)
			.join(DetalleReserva, Reserva.idReserva == DetalleReserva.idReserva)
			.filter(DetalleReserva.idCancha == idCancha)
			.distinct()
		)

		if fechaDesde is not None:
			q = q.filter(Reserva.fechaReservada >= fechaDesde)
		if fechaHasta is not None:
			q = q.filter(Reserva.fechaReservada <= fechaHasta)

		reservas = q.order_by(Reserva.fechaReservada, Reserva.fechaCreacion).all()

		results = []
		for r in reservas:
			rdict = _to_dict(r)
			detalles = (
				session.query(DetalleReserva)
				.filter(DetalleReserva.idReserva == r.idReserva, DetalleReserva.idCancha == idCancha)
				.all()
			)
			rdict['detalles'] = [_to_dict(d) for d in detalles]
			results.append(rdict)

		return results
	finally:
		session.close()


def get_cancha_by_nombre_y_deporte(nombre: str, deporte: str) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.query(Cancha).filter_by(nombre=nombre, deporte=deporte).first())
	finally:
		session.close()


# ---------------- Servicios ----------------

def create_servicio(descripcion: str) -> Dict[str, Any]:
	"""Crear un servicio y devolverlo como dict."""
	session = SessionLocal()
	try:
		s = Servicio(descripcion=descripcion)
		session.add(s)
		session.commit()
		session.refresh(s)
		return _to_dict(s)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_servicio(idServicio: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Servicio, idServicio))
	finally:
		session.close()


def list_servicios() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(s) for s in session.query(Servicio).all()]
	finally:
		session.close()


def update_servicio(idServicio: int, descripcion: str = None) -> Dict[str, Any]:
	"""Actualizar todos los campos editables de Servicio (excepto la PK)."""
	session = SessionLocal()
	try:
		s = session.get(Servicio, idServicio)
		if not s:
			return {}
		if descripcion is not None:
			s.descripcion = descripcion
		session.commit()
		session.refresh(s)
		return _to_dict(s)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_servicio(idServicio: int) -> bool:
	session = SessionLocal()
	try:
		s = session.get(Servicio, idServicio)
		if not s:
			return False
		session.delete(s)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()
		

# ---------------- Horarios ----------------

def create_horario(horaInicio, horaFin) -> Dict[str, Any]:
	"""Crear un horario (horaInicio, horaFin deben ser objetos datetime)."""
	session = SessionLocal()
	try:
		h = Horario(horaInicio=horaInicio, horaFin=horaFin)
		session.add(h)
		session.commit()
		session.refresh(h)
		return _to_dict(h)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_horario(idHorario: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Horario, idHorario))
	finally:
		session.close()


def list_horarios() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(h) for h in session.query(Horario).all()]
	finally:
		session.close()


def list_horarios_libres(idCancha: int, fechaReservada) -> List[Dict[str, Any]]:
	"""Devuelve los horarios que aún no tienen una reserva para la cancha y fecha indicada.

	Parámetros:
	- idCancha: id de la cancha a consultar
	- fechaReservada: objeto date (igual que se guarda en Reserva.fechaReservada)"""
	
	session = SessionLocal()
	try:
		# subquery con horarios ya ocupados para esa cancha y fecha
		subq = (
			session.query(DetalleReserva.idHorario)
			.join(Reserva, Reserva.idReserva == DetalleReserva.idReserva)
			.filter(DetalleReserva.idCancha == idCancha, Reserva.fechaReservada == fechaReservada)
			.distinct()
		)

		occupied = [r[0] for r in subq.all() if r[0] is not None]

		q = session.query(Horario)
		if occupied:
			q = q.filter(~Horario.idHorario.in_(occupied))

		return [_to_dict(h) for h in q.order_by(Horario.horaInicio).all()]
	finally:
		session.close()


def update_horario(idHorario: int, horaInicio=None, horaFin=None) -> Dict[str, Any]:
	"""Actualizar los campos de un horario (horaInicio/horaFin)."""
	session = SessionLocal()
	try:
		h = session.get(Horario, idHorario)
		if not h:
			return {}
		if horaInicio is not None:
			h.horaInicio = horaInicio
		if horaFin is not None:
			h.horaFin = horaFin
		session.commit()
		session.refresh(h)
		return _to_dict(h)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_horario(idHorario: int) -> bool:
	session = SessionLocal()
	try:
		h = session.get(Horario, idHorario)
		if not h:
			return False
		session.delete(h)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


# ---------------- Equipos ----------------

def create_equipo(nombre: str) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		e = Equipo(nombre=nombre)
		session.add(e)
		session.commit()
		session.refresh(e)
		return _to_dict(e)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_equipo(idEquipo: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Equipo, idEquipo))
	finally:
		session.close()


def list_equipos() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(e) for e in session.query(Equipo).all()]
	finally:
		session.close()


def update_equipo(idEquipo: int, nombre: str = None) -> Dict[str, Any]:
	"""Actualizar el nombre del equipo (u otros campos si se agregan)."""
	session = SessionLocal()
	try:
		e = session.get(Equipo, idEquipo)
		if not e:
			return {}
		if nombre is not None:
			e.nombre = nombre
		session.commit()
		session.refresh(e)
		return _to_dict(e)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_equipo(idEquipo: int) -> bool:
	session = SessionLocal()
	try:
		e = session.get(Equipo, idEquipo)
		if not e:
			return False
		session.delete(e)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


# ---------------- Partidos ----------------

def create_partido(idTorneo: int, idCancha: int, fecha, idHorario: int,
				   idEquipoLocal: int, idEquipoVisitante: int, resultado: str = None) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		p = Partido(idTorneo=idTorneo, idCancha=idCancha, fecha=fecha,
					idHorario=idHorario, idEquipoLocal=idEquipoLocal,
					idEquipoVisitante=idEquipoVisitante, resultado=resultado)
		session.add(p)
		session.commit()
		session.refresh(p)
		return _to_dict(p)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_partido(idPartido: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Partido, idPartido))
	finally:
		session.close()


def list_partidos() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(p) for p in session.query(Partido).all()]
	finally:
		session.close()


def update_partido(idPartido: int, idTorneo: int = None, idCancha: int = None, fecha=None,
				   idHorario: int = None, idEquipoLocal: int = None, idEquipoVisitante: int = None,
				   resultado: str = None) -> Dict[str, Any]:
	"""Actualizar todos los campos de un partido (excepto la PK)."""
	session = SessionLocal()
	try:
		p = session.get(Partido, idPartido)
		if not p:
			return {}
		if idTorneo is not None:
			p.idTorneo = idTorneo
		if idCancha is not None:
			p.idCancha = idCancha
		if fecha is not None:
			p.fecha = fecha
		if idHorario is not None:
			p.idHorario = idHorario
		if idEquipoLocal is not None:
			p.idEquipoLocal = idEquipoLocal
		if idEquipoVisitante is not None:
			p.idEquipoVisitante = idEquipoVisitante
		if resultado is not None:
			p.resultado = resultado
		session.commit()
		session.refresh(p)
		return _to_dict(p)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_partido(idPartido: int) -> bool:
	session = SessionLocal()
	try:
		p = session.get(Partido, idPartido)
		if not p:
			return False
		session.delete(p)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


# ---------------- Torneos ----------------

def create_torneo(nombre: str, deporte: int, fechaInicio, fechaFin, estado: int) -> Dict[str, Any]:
	"""Crear un torneo y devolverlo como dict."""
	session = SessionLocal()
	try:
		t = Torneo(nombre=nombre, deporte=deporte, fechaInicio=fechaInicio, fechaFin=fechaFin, estado=estado)
		session.add(t)
		session.commit()
		session.refresh(t)
		return _to_dict(t)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_torneo(idTorneo: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Torneo, idTorneo))
	finally:
		session.close()


def list_torneos() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(t) for t in session.query(Torneo).all()]
	finally:
		session.close()


def update_torneo(idTorneo: int, nombre: str = None, deporte: int = None, fechaInicio=None, fechaFin=None, estado: int = None) -> Dict[str, Any]:
	"""Actualizar todos los campos editables de un torneo (excepto la PK)."""
	session = SessionLocal()
	try:
		t = session.get(Torneo, idTorneo)
		if not t:
			return {}
		if nombre is not None:
			t.nombre = nombre
		if deporte is not None:
			t.deporte = deporte
		if fechaInicio is not None:
			t.fechaInicio = fechaInicio
		if fechaFin is not None:
			t.fechaFin = fechaFin
		if estado is not None:
			t.estado = estado
		session.commit()
		session.refresh(t)
		return _to_dict(t)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_torneo(idTorneo: int) -> bool:
	session = SessionLocal()
	try:
		t = session.get(Torneo, idTorneo)
		if not t:
			return False
		session.delete(t)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()
		

# ---------------- Reservas (ABM y consultas) ----------------

def create_reserva(idCliente: int, fechaReservada, estado: int, monto: float) -> Dict[str, Any]:
	"""Crear una reserva. `fechaReservada` y `fechaCreacion` deben ser objetos date/datetime.

	La columna `fechaCreacion` se setea automáticamente a la fecha y hora actuales
	en el momento de la creación (no se acepta como parámetro de entrada).
	"""
	from datetime import datetime
	session = SessionLocal()
	try:
		fechaCreacion = datetime.now()
		r = Reserva(idCliente=idCliente, fechaReservada=fechaReservada, estado=estado, monto=monto, fechaCreacion=fechaCreacion)
		session.add(r)
		session.commit()
		session.refresh(r)
		return _to_dict(r)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_reserva(idReserva: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Reserva, idReserva))
	finally:
		session.close()


def list_reservas() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(r) for r in session.query(Reserva).all()]
	finally:
		session.close()


def update_reserva(idReserva: int, idCliente: int = None, fechaReservada=None, estado: int = None, monto: float = None) -> Dict[str, Any]:
	"""Actualizar campos editables de una reserva (excepto la PK y fechaCreacion)."""
	session = SessionLocal()
	try:
		r = session.get(Reserva, idReserva)
		if not r:
			return {}
		if idCliente is not None:
			r.idCliente = idCliente
		if fechaReservada is not None:
			r.fechaReservada = fechaReservada
		if estado is not None:
			r.estado = estado
		if monto is not None:
			r.monto = monto
		session.commit()
		session.refresh(r)
		return _to_dict(r)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def reservas_por_cancha() -> List[Dict[str, Any]]:
	"""Devuelve la cantidad de reservas asociadas a cada cancha.

	Incluye canchas con 0 reservas. Resultado: lista de dicts
	{'idCancha': int, 'nombre': str, 'conteo_reservas': int}, ordenada por conteo descendente.
	"""
	session = SessionLocal()
	try:
		q = (
			session.query(
				Cancha.idCancha.label('idCancha'),
				Cancha.nombre.label('nombre'),
				func.count(func.distinct(DetalleReserva.idReserva)).label('conteo')
			)
			.outerjoin(DetalleReserva, Cancha.idCancha == DetalleReserva.idCancha)
			.group_by(Cancha.idCancha)
			.order_by(desc('conteo'))
		)

		results = []
		for row in q.all():
			results.append({'idCancha': row.idCancha, 'nombre': row.nombre, 'conteo_reservas': int(row.conteo)})
		return results
	finally:
		session.close()


def get_reservas_por_cliente(idCliente: int) -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(r) for r in session.query(Reserva).filter(Reserva.idCliente == idCliente).all()]
	finally:
		session.close()


# ---------------- Usuarios ----------------

def create_usuario(usuario: str, contrasena: str, permisos: str = None) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		# En producción guardar contrasena hasheada (bcrypt, argon2, etc.). Aquí se guarda tal cual por simplicidad.
		u = Usuario(usuario=usuario, contrasena=contrasena, permisos=permisos)
		session.add(u)
		session.commit()
		session.refresh(u)
		return _to_dict(u)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_usuario(idUsuario: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Usuario, idUsuario))
	finally:
		session.close()


def list_usuarios() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(u) for u in session.query(Usuario).all()]
	finally:
		session.close()


def update_usuario(idUsuario: int, usuario: str = None, contrasena: str = None, permisos: str = None) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		u = session.get(Usuario, idUsuario)
		if not u:
			return {}
		if usuario is not None:
			u.usuario = usuario
		if contrasena is not None:
			# Recordar: hashear la contraseña en producción
			u.contrasena = contrasena
		if permisos is not None:
			u.permisos = permisos
		session.commit()
		session.refresh(u)
		return _to_dict(u)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_usuario(idUsuario: int) -> bool:
	session = SessionLocal()
	try:
		u = session.get(Usuario, idUsuario)
		if not u:
			return False
		session.delete(u)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


# ---------------- Consultas auxiliares (sólo lectura) ----------------

def list_estado_canchas() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(e) for e in session.query(EstadoCancha).all()]
	finally:
		session.close()


def list_estado_reservas() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(e) for e in session.query(EstadoReserva).all()]
	finally:
		session.close()


def list_estado_torneos() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(e) for e in session.query(EstadoTorneo).all()]
	finally:
		session.close()


def list_estado_pagos() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(e) for e in session.query(EstadoPago).all()]
	finally:
		session.close()


def list_deportes() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(d) for d in session.query(Deporte).all()]
	finally:
		session.close()


def list_metodos_pago() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(m) for m in session.query(MetodoPago).all()]
	finally:
		session.close()


def list_tipo_documento() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(t) for t in session.query(TipoDocumento).all()]
	finally:
		session.close()


def list_permisos_table() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(p) for p in session.query(Permiso).all()]
	finally:
		session.close()


# ---------------- Pago y DetalleReserva (alta y consulta) ----------------

def create_pago(idReserva: int, metodoPago: int, monto: float, fechaPago=None, estado: int = None) -> Dict[str, Any]:
	"""Crear un pago. `fechaPago` por defecto es now() si no se provee."""
	from datetime import datetime
	session = SessionLocal()
	try:
		if fechaPago is None:
			fechaPago = datetime.now()
		p = Pago(idReserva=idReserva, metodoPago=metodoPago, monto=monto, fechaPago=fechaPago, estado=estado)
		session.add(p)
		session.commit()
		session.refresh(p)
		return _to_dict(p)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_pago(idPago: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(Pago, idPago))
	finally:
		session.close()


def create_detalle_reserva(idCancha: int, idServicio: int, idReserva: int, idHorario: int = None) -> Dict[str, Any]:
	"""Crear un detalle de reserva que vincula cancha+servicio a una reserva."""
	session = SessionLocal()
	try:
		d = DetalleReserva(idCancha=idCancha, idServicio=idServicio, idHorario=idHorario, idReserva=idReserva)
		session.add(d)
		session.commit()
		session.refresh(d)
		return _to_dict(d)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_detalle_reserva(idDetalle: int) -> Dict[str, Any]:
	session = SessionLocal()
	try:
		return _to_dict(session.get(DetalleReserva, idDetalle))
	finally:
		session.close()


def update_detalle_reserva(idDetalle: int, idCancha: int = None, idServicio: int = None, idHorario: int = None, idReserva: int = None) -> Dict[str, Any]:
	"""Actualizar los campos editables de un DetalleReserva (excepto la PK)."""
	session = SessionLocal()
	try:
		d = session.get(DetalleReserva, idDetalle)
		if not d:
			return {}
		if idCancha is not None:
			d.idCancha = idCancha
		if idServicio is not None:
			d.idServicio = idServicio
		if idHorario is not None:
			d.idHorario = idHorario
		if idReserva is not None:
			d.idReserva = idReserva
		session.commit()
		session.refresh(d)
		return _to_dict(d)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()





# ---------------- EquipoxCliente (ABMC) ----------------

def create_equipoxcliente(idEquipo: int, idCliente: int, idTorneo: int) -> Dict[str, Any]:
	"""Crear una relación equipo-cliente para un torneo."""
	session = SessionLocal()
	try:
		ex = EquipoxCliente(idEquipo=idEquipo, idCliente=idCliente, idTorneo=idTorneo)
		session.add(ex)
		session.commit()
		session.refresh(ex)
		return _to_dict(ex)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def get_equipoxcliente(idEquipo: int, idCliente: int) -> Dict[str, Any]:
	"""Obtener EquipoxCliente por PK compuesta (idEquipo, idCliente)."""
	session = SessionLocal()
	try:
		# session.get acepta la tupla con la PK compuesta en el orden de la tabla
		obj = session.get(EquipoxCliente, (idEquipo, idCliente))
		return _to_dict(obj)
	finally:
		session.close()


def list_equipoxclientes() -> List[Dict[str, Any]]:
	session = SessionLocal()
	try:
		return [_to_dict(x) for x in session.query(EquipoxCliente).all()]
	finally:
		session.close()


def update_equipoxcliente(idEquipo: int, idCliente: int, idTorneo: int = None) -> Dict[str, Any]:
	"""Actualizar campos editables de EquipoxCliente (no se permite cambiar las PKs)."""
	session = SessionLocal()
	try:
		ex = session.get(EquipoxCliente, (idEquipo, idCliente))
		if not ex:
			return {}
		if idTorneo is not None:
			ex.idTorneo = idTorneo
		session.commit()
		session.refresh(ex)
		return _to_dict(ex)
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def delete_equipoxcliente(idEquipo: int, idCliente: int) -> bool:
	session = SessionLocal()
	try:
		ex = session.get(EquipoxCliente, (idEquipo, idCliente))
		if not ex:
			return False
		session.delete(ex)
		session.commit()
		return True
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()
		



# ---------------- Consultas por estado (filtrado) ----------------

def canchas_por_estado(idEstado: int = None, nombre: str = None) -> List[Dict[str, Any]]:
    """Devuelve canchas cuyo `estado` coincide con idEstado o con el nombre del estado."""
    session = SessionLocal()
    try:
        q = session.query(Cancha)
        if idEstado is not None:
            q = q.filter(Cancha.estado == idEstado)
        elif nombre is not None:
            q = q.join(EstadoCancha).filter(EstadoCancha.nombre == nombre)
        return [_to_dict(c) for c in q.all()]
    finally:
        session.close()


def get_precio_cancha_servicio(idCancha: int, idServicio: int) -> Dict[str, Any]:
	"""Devuelve el precio desglosado para una cancha + servicio.

	Resultado: {'idCancha':..., 'idServicio':..., 'precioBase': float, 'precioAdicional': float, 'precioTotal': float}
	Si no se encuentra la cancha devuelve {}. Si no existe una fila en CanchaxServicio
	se asume precioAdicional = 0.0.
	"""
	session = SessionLocal()
	try:
		cancha = session.get(Cancha, idCancha)
		if not cancha:
			return {}
		precio_base = float(cancha.precioHora)

		cvs = session.query(CanchaxServicio).filter_by(idCancha=idCancha, idServicio=idServicio).first()
		precio_adicional = float(cvs.precioAdicional) if cvs is not None else 0.0

		precio_total = precio_base + precio_adicional
		return {
			'idCancha': idCancha,
			'idServicio': idServicio,
			'precioBase': precio_base,
			'precioAdicional': precio_adicional,
			'precioTotal': precio_total,
		}
	finally:
		session.close()


def reservas_por_estado(idEstado: int = None, nombre: str = None) -> List[Dict[str, Any]]:
    """Devuelve reservas cuyo `estado` coincide con idEstado o con el nombre del estado."""
    session = SessionLocal()
    try:
        q = session.query(Reserva)
        if idEstado is not None:
            q = q.filter(Reserva.estado == idEstado)
        elif nombre is not None:
            q = q.join(EstadoReserva).filter(EstadoReserva.nombre == nombre)
        return [_to_dict(r) for r in q.all()]
    finally:
        session.close()


def torneos_por_estado(idEstado: int = None, nombre: str = None) -> List[Dict[str, Any]]:
    """Devuelve torneos cuyo `estado` coincide con idEstado o con el nombre del estado."""
    session = SessionLocal()
    try:
        q = session.query(Torneo)
        if idEstado is not None:
            q = q.filter(Torneo.estado == idEstado)
        elif nombre is not None:
            q = q.join(EstadoTorneo).filter(EstadoTorneo.nombre == nombre)
        return [_to_dict(t) for t in q.all()]
    finally:
        session.close()


def pagos_por_estado(idEstado: int = None, nombre: str = None) -> List[Dict[str, Any]]:
    """Devuelve pagos cuyo `estado` coincide con idEstado o con el nombre del estado."""
    session = SessionLocal()
    try:
        q = session.query(Pago)
        if idEstado is not None:
            q = q.filter(Pago.estado == idEstado)
        elif nombre is not None:
            q = q.join(EstadoPago).filter(EstadoPago.nombre == nombre)
        return [_to_dict(p) for p in q.all()]
    finally:
        session.close()




