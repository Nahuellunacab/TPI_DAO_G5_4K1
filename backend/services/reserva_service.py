from datetime import datetime as _dt
from datetime import datetime
from sqlalchemy import text

from database.mapeoCanchas import (
    SessionLocal,
    Reserva,
    DetalleReserva,
    Horario,
    CanchaxServicio,
    Cancha,
    EstadoCancha,
    Cliente as ClienteModel,
)


class ServicioReservas:
    """Servicio orientado a objetos que encapsula la lógica de creación y
    validación de reservas (slot por horario y servicios) en español.

    Métodos principales:
    - crear_reserva_slot(data, session=None)
    """

    @classmethod
    def crear_reserva_slot(cls, data: dict, session=None):
        """Crea Reserva + DetalleReserva.

        Retorna (dict_resultado, codigo_http).
        Si se pasa una `session` externa, no la cerramos; si no, la creamos y cerramos.
        """
        own_session = False
        if session is None:
            session = SessionLocal()
            own_session = True

        try:
            # Acquire DB-level lock to avoid race conditions when checking + inserting
            # For SQLite use BEGIN IMMEDIATE to get a RESERVED lock (prevent concurrent writers).
            # For other DBs we could use SELECT ... FOR UPDATE on a lockable row (e.g. CanchaxServicio).
            try:
                bind = session.get_bind()
                dialect_name = getattr(bind.dialect, 'name', '')
            except Exception:
                dialect_name = ''

            if dialect_name == 'sqlite':
                # BEGIN IMMEDIATE will raise if another writer holds a lock.
                try:
                    session.execute(text('BEGIN IMMEDIATE'))
                except Exception:
                    # If we cannot acquire the lock, return conflict-like response
                    return ({'error': 'Otro proceso está creando reservas. Reintente.'}, 409)
            else:
                # Try to lock the CanchaxServicio rows for this cancha when possible
                # We'll do a dummy SELECT FOR UPDATE later after cxs_list is obtained.
                pass

            # Normalizar entrada
            idCancha = data.get('idCancha')
            idHorario = data.get('idHorario')
            horarios_list = data.get('horarios')
            fecha_text = data.get('fechaReservada')
            idCliente = data.get('idCliente')

            if horarios_list and isinstance(horarios_list, list) and len(horarios_list) > 0:
                horarios_to_book = [int(x) for x in horarios_list]
            elif idHorario:
                horarios_to_book = [int(idHorario)]
            else:
                return ({'error': 'idCancha, fechaReservada, idCliente y al menos un idHorario u "horarios" son requeridos'}, 400)

            # parsear fecha
            try:
                fecha = datetime.fromisoformat(fecha_text).date()
            except Exception:
                try:
                    fecha = datetime.strptime(fecha_text, '%Y-%m-%d').date()
                except Exception:
                    return ({'error': 'fechaReservada debe tener formato YYYY-MM-DD'}, 400)

            # Verificar que la fecha no sea pasada
            if fecha < _dt.now().date():
                return ({'error': 'fechaReservada no puede ser anterior a hoy'}, 400)

            # Obtener filas CanchaxServicio para la cancha
            cxs_list = session.query(CanchaxServicio).filter(CanchaxServicio.idCancha == idCancha).all()
            if not cxs_list:
                return ({'error': 'No existe asociación CanchaxServicio para la cancha seleccionada'}, 400)

            cvs_base = None
            def _desc_of(c):
                try:
                    return (c.servicio.descripcion or '').lower()
                except Exception:
                    return ''

            for c in cxs_list:
                try:
                    desc = _desc_of(c)
                    if (not c.precioAdicional or float(c.precioAdicional) == 0.0) and 'ilumin' not in desc:
                        cvs_base = c
                        break
                except Exception:
                    continue
            if cvs_base is None:
                for c in cxs_list:
                    desc = _desc_of(c)
                    if any(k in desc for k in ('alquiler', 'cancha', 'renta', 'arriendo')):
                        cvs_base = c
                        break
            if cvs_base is None:
                for c in cxs_list:
                    try:
                        if not c.precioAdicional or float(c.precioAdicional) == 0.0:
                            cvs_base = c
                            break
                    except Exception:
                        continue
            if cvs_base is None:
                cvs_base = cxs_list[0]

            servicios_selected = data.get('servicios') or []
            if not isinstance(servicios_selected, list):
                servicios_selected = []

            valid_cxs = {c.idCxS: c for c in cxs_list}
            for s_id in servicios_selected:
                if int(s_id) not in valid_cxs:
                    return ({'error': f'idCxS {s_id} no pertenece a la cancha seleccionada'}, 400)

            # verificar que el cliente exista
            cliente_check = session.get(ClienteModel, idCliente)
            if not cliente_check:
                return ({'error': 'Cliente no encontrado'}, 400)

            # If not sqlite, attempt to lock the selected CanchaxServicio rows to avoid races
            if dialect_name != 'sqlite':
                try:
                    # Lock the base cvs row and any extras by selecting FOR UPDATE
                    # Build list of ids to lock (if cvs_base yet unknown, lock by idCancha)
                    # Note: SQLAlchemy will translate text('... FOR UPDATE') on supported DBs.
                    session.execute(text('SELECT 1 FROM CanchaxServicio WHERE idCancha = :id FOR UPDATE'), {'id': idCancha})
                except Exception:
                    # If FOR UPDATE not supported or fails, continue without it; we still have app-level checks.
                    pass

            # verificar que los horarios existan y si hay conflictos
            for hid in horarios_to_book:
                try:
                    hid_int = int(hid)
                except Exception:
                    return ({'error': f'idHorario inválido: {hid}'}, 400)
                hor = session.get(Horario, hid_int)
                if not hor:
                    return ({'error': f'Horario {hid_int} no existe'}, 400)

                conflict = (
                    session.query(DetalleReserva)
                    .join(Reserva, DetalleReserva.idReserva == Reserva.idReserva)
                    .filter(DetalleReserva.idCxS == cvs_base.idCxS, DetalleReserva.idHorario == hid_int, Reserva.fechaReservada == fecha)
                    .first()
                )
                if conflict:
                    return ({'error': f'Horario {hid_int} ya reservado'}, 409)

            cancha = session.get(Cancha, idCancha)
            if not cancha:
                return ({'error': 'Cancha no encontrada'}, 400)

            # detect techada heuristic
            is_techada = False
            try:
                if cancha and getattr(cancha, 'descripcion', None):
                    desc_text = (cancha.descripcion or '').lower()
                    if any(k in desc_text for k in ('tech', 'techada', 'techa', 'cubiert', 'cerrad', 'cubierta')):
                        is_techada = True
                if not is_techada:
                    estado_obj = None
                    if cancha and getattr(cancha, 'estado', None) is not None:
                        estado_obj = session.get(EstadoCancha, cancha.estado)
                    estado_name = (estado_obj.nombre if estado_obj and getattr(estado_obj, 'nombre', None) else '') or ''
                    cname = (cancha.nombre or '')
                    key = (estado_name + ' ' + cname).lower()
                    if any(k in key for k in ('tech', 'techada', 'techa', 'cubiert', 'cerrad', 'cubierta')):
                        is_techada = True
            except Exception:
                is_techada = False

            num_turnos = len(horarios_to_book)
            monto_total = float(cancha.precioHora or 0.0) * num_turnos

            extras = []
            try:
                if is_techada:
                    ilum_id = None
                    for c in valid_cxs.values():
                        try:
                            desc = (c.servicio.descripcion or '').lower()
                            if 'ilumin' in desc or 'luz' in desc:
                                ilum_id = c.idCxS
                                break
                        except Exception:
                            continue
                    if ilum_id and int(ilum_id) not in [int(x) for x in servicios_selected]:
                        servicios_selected.append(int(ilum_id))
            except Exception:
                pass

            for s_id in servicios_selected:
                s_id_int = int(s_id)
                if s_id_int == cvs_base.idCxS:
                    continue
                cxs = valid_cxs.get(s_id_int)
                if cxs:
                    monto_total += float(cxs.precioAdicional or 0.0) * num_turnos
                    extras.append(cxs)

            # crear reserva y detalles
            r = Reserva(idCliente=idCliente, fechaReservada=fecha, estado=1, monto=monto_total, fechaCreacion=_dt.now())
            session.add(r)
            session.flush()
            created_detalles = []
            for hid in horarios_to_book:
                d_base = DetalleReserva(idCxS=cvs_base.idCxS, idHorario=hid, idReserva=r.idReserva)
                session.add(d_base)
                session.flush()
                created_detalles.append(d_base.idDetalle)
                for extra_cxs in extras:
                    dd = DetalleReserva(idCxS=extra_cxs.idCxS, idHorario=hid, idReserva=r.idReserva)
                    session.add(dd)

            session.commit()

            return ({'idReserva': r.idReserva, 'detalles': created_detalles, 'monto': monto_total}, 201)

        except Exception as e:
            try:
                session.rollback()
            except Exception:
                pass
            return ({'error': str(e)}, 500)
        finally:
            if own_session:
                session.close()
