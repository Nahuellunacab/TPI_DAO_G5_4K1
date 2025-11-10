from flask import Blueprint, request, jsonify, session
from database.mapeoCanchas import (
    SessionLocal, Reserva, DetalleReserva, Horario, CanchaxServicio, Cancha, EstadoCancha
)
from basicas import _to_dict
from datetime import datetime
from validators import parse_iso_date, is_future_or_today, json_error

bp = Blueprint('reservas_api', __name__)


@bp.route('/canchas/<int:idCancha>/reservas', methods=['GET'])
def reservas_por_cancha(idCancha: int):
    """Devuelve eventos ocupados para FullCalendar.
    Acepta query params `start` y `end` (ISO dates) para filtrar rango de fechas.
    """
    start = request.args.get('start')
    end = request.args.get('end')
    session = SessionLocal()
    try:
        q = (
            session.query(DetalleReserva, Reserva, Horario, CanchaxServicio)
            .join(Reserva, DetalleReserva.idReserva == Reserva.idReserva)
            .join(CanchaxServicio, DetalleReserva.idCxS == CanchaxServicio.idCxS)
            .outerjoin(Horario, DetalleReserva.idHorario == Horario.idHorario)
            .filter(CanchaxServicio.idCancha == idCancha)
        )

        if start:
            try:
                start_date = datetime.fromisoformat(start).date()
                q = q.filter(Reserva.fechaReservada >= start_date)
            except Exception:
                pass
        if end:
            try:
                end_date = datetime.fromisoformat(end).date()
                q = q.filter(Reserva.fechaReservada <= end_date)
            except Exception:
                pass

        rows = q.all()
        # Return a compact, stable representation so the client can map
        # horarios (from /api/horarios) to reservas by idHorario + fecha.
        out = []
        for detalle, reserva, horario, cvs in rows:
            out.append({
                'idDetalle': detalle.idDetalle,
                'idHorario': detalle.idHorario if hasattr(detalle, 'idHorario') else None,
                'fechaReservada': reserva.fechaReservada.isoformat(),
                'idCxS': detalle.idCxS,
            })

        return jsonify(out)
    finally:
        session.close()


@bp.route('/horarios', methods=['GET'])
def listar_horarios():
    session = SessionLocal()
    try:
        rows = session.query(Horario).order_by(Horario.horaInicio).all()
        out = []
        for h in rows:
            # horaInicio/horaFin may be stored as plain strings (HH:MM) in the
            # legacy DB or as time/datetime objects depending on context. Be
            # defensive: if the object exposes isoformat(), use it; otherwise
            # coerce to str(). This avoids ValueError when DB strings like
            # '00:00' would otherwise be parsed as datetimes.
            hi = h.horaInicio.isoformat() if hasattr(h.horaInicio, 'isoformat') else str(h.horaInicio)
            hf = h.horaFin.isoformat() if hasattr(h.horaFin, 'isoformat') else str(h.horaFin)
            out.append({'idHorario': h.idHorario, 'horaInicio': hi, 'horaFin': hf})
        return jsonify(out)
    finally:
        session.close()


@bp.route('/reservas', methods=['POST'])
def crear_reserva_slot():
    """Crea Reserva + DetalleReserva para un idCancha + idHorario + fechaReservada.
    Payload esperado: { idCancha, idHorario, fechaReservada (YYYY-MM-DD), idCliente }
    - Verifica conflicto (mismo idCancha + idHorario + fecha) y devuelve 409 si está ocupado.
    - Usa la primera fila de CanchaxServicio asociada a la cancha para idCxS.
    """
    data = request.get_json() or {}
    idCancha = data.get('idCancha')
    # Support either single idHorario or list of horarios
    idHorario = data.get('idHorario')
    horarios_list = data.get('horarios')
    fecha_text = data.get('fechaReservada')
    idCliente = data.get('idCliente')

    # Normalize horarios: prefer explicit 'horarios' array, otherwise single idHorario
    if horarios_list and isinstance(horarios_list, list) and len(horarios_list) > 0:
        horarios_to_book = [int(x) for x in horarios_list]
    elif idHorario:
        horarios_to_book = [int(idHorario)]
    else:
        return json_error('idCancha, fechaReservada, idCliente y al menos un idHorario u "horarios" son requeridos', 400)

    try:
        fecha = parse_iso_date(fecha_text)
    except ValueError as e:
        return json_error(str(e), 400)
    # Do not allow reservations in the past
    if not is_future_or_today(fecha):
        return json_error('fechaReservada no puede ser anterior a hoy', 400)

    session = SessionLocal()
    try:
        # Buscar CanchaxServicio para la cancha. Preferimos el registro "base"
        # (precioAdicional == 0) como el servicio de alquiler; si no hay uno,
        # usamos el primero encontrado. Esto evita que un servicio como
        # "iluminación" (con precio) sea elegido por accidente como base.
        # Fetch CanchaxServicio rows (they include .servicio via relationship)
        cxs_list = session.query(CanchaxServicio).filter(CanchaxServicio.idCancha == idCancha).all()
        if not cxs_list:
            return jsonify({'error': 'No existe asociación CanchaxServicio para la cancha seleccionada'}), 400
        cvs_base = None
        # Prefer a logical "base" service for alquiler (rental):
        # 1) prefer precioAdicional == 0 and NOT an iluminación service
        # 2) prefer servicio.descripcion containing 'alquiler' or 'cancha'
        # 3) else fallback to any precioAdicional == 0
        # 4) else first available
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
            # try to find by description keywords
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

        # Optional: list of extra servicios (idCxS) provided by client
        servicios_selected = data.get('servicios') or []
        if not isinstance(servicios_selected, list):
            servicios_selected = []

        # Verify that any provided idCxS belong to this cancha
        valid_cxs = {c.idCxS: c for c in cxs_list}
        for s_id in servicios_selected:
            if int(s_id) not in valid_cxs:
                return jsonify({'error': f'idCxS {s_id} no pertenece a la cancha seleccionada'}), 400

        # Verify that the cliente exists
        cliente_obj = session.get(Reserva.__table__.columns['idCliente'].type.__class__, None)
        # Instead of the above hack, use session.get on the Cliente model if available
        try:
            from database.mapeoCanchas import Cliente as ClienteModel
            cliente_check = session.get(ClienteModel, idCliente)
            if not cliente_check:
                return json_error('Cliente no encontrado', 400)
        except Exception:
            # If Cliente model can't be loaded for some reason, skip strict check
            cliente_check = None

        # Verify horarios exist and conflicts for each horario requested
        for hid in horarios_to_book:
            # ensure horario exists
            try:
                hid_int = int(hid)
            except Exception:
                return json_error(f'idHorario inválido: {hid}', 400)
            hor = session.get(Horario, hid_int)
            if not hor:
                return json_error(f'Horario {hid_int} no existe', 400)

            conflict = (
                session.query(DetalleReserva)
                .join(Reserva, DetalleReserva.idReserva == Reserva.idReserva)
                .filter(DetalleReserva.idCxS == cvs_base.idCxS, DetalleReserva.idHorario == hid_int, Reserva.fechaReservada == fecha)
                .first()
            )
            if conflict:
                return json_error(f'Horario {hid_int} ya reservado', 409)

        # Calculate monto: cancha.precioHora * number_of_turnos + sum(precioAdicional de servicios seleccionados per turno)
        cancha = session.get(Cancha, idCancha)
        if not cancha:
            return jsonify({'error': 'Cancha no encontrada'}), 400
        # Detect if cancha is 'techada'. Prefer explicit cancha.descripcion when present.
        is_techada = False
        try:
            # 1) Check explicit description column first
            if cancha and getattr(cancha, 'descripcion', None):
                desc_text = (cancha.descripcion or '').lower()
                if any(k in desc_text for k in ('tech', 'techada', 'techa', 'cubiert', 'cerrad', 'cubierta')):
                    is_techada = True
            # 2) Fallback to EstadoCancha.nombre and cancha.nombre heuristics
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
        # Sum precioAdicional for servicios selected (exclude base cvs_base if included)
        extras = []
        # If cancha is techada, ensure iluminación (if present in valid_cxs) is included as mandatory
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
                # skip base if client accidentally sent it
                continue
            cxs = valid_cxs.get(s_id_int)
            if cxs:
                monto_total += float(cxs.precioAdicional or 0.0) * num_turnos
                extras.append(cxs)

        # Crear Reserva y DetalleReserva dentro de la transacción
        from datetime import datetime as _dt
        r = Reserva(idCliente=idCliente, fechaReservada=fecha, estado=1, monto=monto_total, fechaCreacion=_dt.now())
        session.add(r)
        session.flush()  # obtener idReserva
        # Crear DetalleReserva por cada turno solicitado
        created_detalles = []
        for hid in horarios_to_book:
            d_base = DetalleReserva(idCxS=cvs_base.idCxS, idHorario=hid, idReserva=r.idReserva)
            session.add(d_base)
            session.flush()
            created_detalles.append(d_base.idDetalle)
            # detalles adicionales por cada servicio extra para este turno
            for extra_cxs in extras:
                dd = DetalleReserva(idCxS=extra_cxs.idCxS, idHorario=hid, idReserva=r.idReserva)
                session.add(dd)

        session.commit()

        # Devolver la reserva creada con monto
        return jsonify({'idReserva': r.idReserva, 'detalles': created_detalles, 'monto': monto_total}), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
