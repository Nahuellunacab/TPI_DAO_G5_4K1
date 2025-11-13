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
    Usuario as UsuarioModel,
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

            # Basic validation: required fields and types
            if not idCancha:
                return ({'error': 'idCancha es requerido'}, 400)
            try:
                idCancha = int(idCancha)
            except Exception:
                return ({'error': 'idCancha inválido'}, 400)

            if not fecha_text:
                return ({'error': 'fechaReservada es requerida'}, 400)

            if not idCliente:
                return ({'error': 'idCliente es requerido'}, 400)
            try:
                idCliente = int(idCliente)
            except Exception:
                return ({'error': 'idCliente inválido'}, 400)

            # Require at least one horario (single idHorario or non-empty horarios array)
            if horarios_list and isinstance(horarios_list, list) and len(horarios_list) > 0:
                # normalize to ints, ignore non-numeric entries
                normalized = []
                for x in horarios_list:
                    try:
                        normalized.append(int(x))
                    except Exception:
                        continue
                if len(normalized) == 0:
                    return ({'error': 'El campo "horarios" debe contener al menos un idHorario válido'}, 400)
                horarios_to_book = normalized
            elif idHorario is not None:
                try:
                    horarios_to_book = [int(idHorario)]
                except Exception:
                    return ({'error': 'idHorario inválido'}, 400)
            else:
                return ({'error': 'Se requiere idHorario o un arreglo "horarios" con al menos un idHorario'}, 400)

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
            # Normalize servicios_selected to ints if possible; invalid entries ignored
            normalized_servicios = []
            for s in servicios_selected:
                try:
                    normalized_servicios.append(int(s))
                except Exception:
                    # ignore non-numeric service ids
                    continue
            servicios_selected = normalized_servicios

            valid_cxs = {c.idCxS: c for c in cxs_list}
            for s_id in servicios_selected:
                if int(s_id) not in valid_cxs:
                    return ({'error': f'idCxS {s_id} no pertenece a la cancha seleccionada'}, 400)

            # verificar que el cliente exista
            cliente_check = session.get(ClienteModel, idCliente)
            if not cliente_check:
                return ({'error': 'Cliente no encontrado'}, 400)

            # verificar que el cliente tenga permiso de 'cliente' (idPermiso == 1)
            try:
                if getattr(cliente_check, 'idUsuario', None) is None:
                    return ({'error': 'El cliente no está asociado a un usuario con permisos válidos'}, 403)
                usuario_obj = session.get(UsuarioModel, cliente_check.idUsuario)
                if not usuario_obj:
                    return ({'error': 'Usuario asociado al cliente no encontrado'}, 403)
                # Usuario.permisos es FK hacia Permiso.idPermiso; cliente UI uses idpermiso==1
                if getattr(usuario_obj, 'permisos', None) != 1:
                    return ({'error': 'Permisos insuficientes para crear reservas'}, 403)
            except Exception:
                # If anything goes wrong while checking permissions, deny by default
                return ({'error': 'Error verificando permisos'}, 403)

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

            # Check if any horario is after 18:00 (requires iluminación)
            requires_iluminacion_by_time = False
            try:
                for hid in horarios_to_book:
                    hor = session.get(Horario, int(hid))
                    if hor and hor.horaInicio:
                        # Parse horaInicio (format: "HH:MM" or "HH:MM:SS")
                        hora_str = str(hor.horaInicio).split(':')[0]
                        try:
                            hora_int = int(hora_str)
                            if hora_int >= 18:  # 18:00 o posterior
                                requires_iluminacion_by_time = True
                                break
                        except Exception:
                            continue
            except Exception:
                pass

            num_turnos = len(horarios_to_book)
            monto_total = float(cancha.precioHora or 0.0) * num_turnos
            # Services that should be charged only once per reservation (not per turno)
            SINGLETON_SERVICIOS = {6, 8}

            extras = []
            try:
                # Iluminación is required if:
                # 1. Cancha is techada, OR
                # 2. Any horario starts at or after 18:00
                if is_techada or requires_iluminacion_by_time:
                    # If the chosen base service is the special 'ninguno', do not
                    # force-add iluminación even if the cancha is techada. Also
                    # remove any iluminación ids submitted by the client in this
                    # case to avoid frontend auto-selection causing it to be saved.
                    base_desc = ''
                    try:
                        base_desc = (cvs_base.servicio.descripcion or '').strip().lower()
                    except Exception:
                        base_desc = ''

                    if base_desc == 'ninguno':
                        # Respect explicit selections from the client: if the
                        # payload included a non-empty 'servicios' array, assume
                        # the user intentionally selected those services and
                        # don't strip them. If the client didn't provide
                        # servicios (or provided an empty list), then we do not
                        # force-add iluminación and leave servicios_selected as-is
                        # (which will typically be empty).
                        if data.get('servicios'):
                            # client explicitly provided services: keep them
                            pass
                        else:
                            # no client selection: ensure we don't auto-add
                            # iluminación (leave servicios_selected empty)
                            servicios_selected = []
                    else:
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

            # Some services (e.g. iluminación vs. others) may be one-time fees per reserva
            seen_singletons = set()
            for s_id in servicios_selected:
                s_id_int = int(s_id)
                if s_id_int == cvs_base.idCxS:
                    continue
                cxs = valid_cxs.get(s_id_int)
                if cxs:
                    precio = float(cxs.precioAdicional or 0.0)
                    if s_id_int in SINGLETON_SERVICIOS:
                        # Charge only once per reservation
                        if s_id_int not in seen_singletons:
                            monto_total += precio
                            seen_singletons.add(s_id_int)
                    else:
                        # Charge per turno
                        monto_total += precio * num_turnos
                    extras.append(cxs)

            # Debug: mostrar qué servicios fueron finalmente seleccionados y los extras
            try:
                print(f"DEBUG crear_reserva_slot: servicios_selected={servicios_selected}, extras={[c.idCxS for c in extras]}, monto_total={monto_total}")
            except Exception:
                pass

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
