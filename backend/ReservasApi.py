from flask import Blueprint, request, jsonify, session
from database.mapeoCanchas import (
    SessionLocal, Reserva, DetalleReserva, Horario, CanchaxServicio, Cancha, EstadoCancha, Servicio, Cliente
)
from basicas import _to_dict
from datetime import datetime
from validators import parse_iso_date, is_future_or_today, json_error
from services.reserva_service import ServicioReservas

bp = Blueprint('reservas_api', __name__)


@bp.route('/canchas/<int:idCancha>/reservas', methods=['GET'])
def reservas_por_cancha(idCancha: int):
    """Devuelve eventos ocupados para FullCalendar.
    Acepta query params `start` y `end` (ISO dates) para filtrar rango de fechas.
    """
    start = request.args.get('start')
    end = request.args.get('end')
    idCancha_q = request.args.get('idCancha')
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
        if idCancha_q:
            try:
                q = q.filter(Cancha.idCancha == int(idCancha_q))
            except Exception:
                pass

        rows = q.all()
        # Return a compact, stable representation so the client can map
        # horarios (from /api/horarios) to reservas by idHorario + fecha.
        out = []
        for detalle, reserva, horario, cvs in rows:
            out.append({
                'idDetalle': detalle.idDetalle,
                'idReserva': reserva.idReserva,
                'idHorario': detalle.idHorario if hasattr(detalle, 'idHorario') else None,
                'fechaReservada': reserva.fechaReservada.isoformat(),
                'idCxS': detalle.idCxS,
            })

        return jsonify(out)
    finally:
        session.close()


@bp.route('/canchas/<int:idCancha>/reservas-resumen', methods=['GET'])
def reservas_resumen_por_cancha(idCancha: int):
    """Devuelve un resumen por reserva (una fila por reserva) con fecha, cliente, servicios (lista de nombres) y monto.

    Sólo incluye reservas cuya fechaReservada sea hoy o en el futuro.
    """
    from datetime import date
    session = SessionLocal()
    try:
        # Reuse the basicas helper to get reservas con sus detalles
        from basicas import list_reservas_por_cancha
        rows = list_reservas_por_cancha(idCancha=idCancha)
        out = []
        today = date.today()
        for r in rows:
            # r is a dict returned by basicas.list_reservas_por_cancha
            try:
                fr = r.get('fechaReservada')
                # fr may be a date object or string; normalize to date
                if isinstance(fr, str):
                    fr_date = datetime.fromisoformat(fr).date()
                else:
                    fr_date = fr
            except Exception:
                fr_date = None
            if fr_date is None or fr_date < today:
                continue

            servicios_set = []
            # collect service descriptions for detalles
            for d in r.get('detalles', []):
                idCxS = d.get('idCxS')
                if not idCxS:
                    continue
                try:
                    cvs = session.get(CanchaxServicio, int(idCxS))
                    if not cvs:
                        continue
                    serv = session.get(Servicio, cvs.idServicio)
                    if serv and getattr(serv, 'descripcion', None):
                        desc = serv.descripcion
                        if desc not in servicios_set:
                            servicios_set.append(desc)
                except Exception:
                    continue

            # Business rule for UI: keep 'ninguno' in DB but do not show it
            # when there are other services available. If the only service is
            # 'ninguno', keep it so the UI can display that state.
            try:
                lowercased = [s.lower() for s in servicios_set]
                if len(servicios_set) > 1 and 'ninguno' in lowercased:
                    # remove the first occurrence of 'ninguno' (case-insensitive)
                    idx = lowercased.index('ninguno')
                    servicios_set.pop(idx)
            except Exception:
                pass

            cliente_nombre = None
            try:
                cl = session.get(Cliente, r.get('idCliente'))
                if cl:
                    cliente_nombre = f"{getattr(cl,'nombre', '')} {getattr(cl,'apellido','')}".strip()
            except Exception:
                cliente_nombre = None

            out.append({
                'idReserva': r.get('idReserva'),
                'fechaReservada': r.get('fechaReservada'),
                'cliente': cliente_nombre,
                'servicios': servicios_set,
                'monto': r.get('monto')
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
    # Delegar la lógica de negocio a ServicioReservas (POO en español)
    result, status = ServicioReservas.crear_reserva_slot(data)
    return jsonify(result), status


@bp.route('/reservas/calendar', methods=['GET'])
def reservas_calendar():
    """Devuelve un listado de eventos detallados para vistas de calendario (gerencia).

    Query params aceptados: start, end (ISO dates). Si se proveen, filtran por Reserva.fechaReservada.
    Cada elemento incluye: idDetalle, idReserva, fechaReservada, idCancha, nombreCancha,
    idDeporte, nombreDeporte, idHorario, horaInicio, horaFin, idCxS, servicioDescripcion,
    idCliente, clienteNombre, clienteApellido
    """
    start = request.args.get('start')
    end = request.args.get('end')
    session = SessionLocal()
    try:
        q = (
            session.query(DetalleReserva, Reserva, Horario, CanchaxServicio, Cancha)
            .join(Reserva, DetalleReserva.idReserva == Reserva.idReserva)
            .join(CanchaxServicio, DetalleReserva.idCxS == CanchaxServicio.idCxS)
            .join(Cancha, CanchaxServicio.idCancha == Cancha.idCancha)
            .outerjoin(Horario, DetalleReserva.idHorario == Horario.idHorario)
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
        out = []
        for detalle, reserva, horario, cvs, cancha in rows:
            # fetch related Servicio and Deporte and Cliente info defensively
            servicio = None
            deporte = None
            cliente = None
            try:
                servicio = session.get(type(cvs).servicio.property.mapper.class_, cvs.idServicio) if cvs is not None else None
            except Exception:
                servicio = None
            try:
                deporte = session.get(type(cancha).deporte.property.mapper.class_, cancha.deporte) if cancha is not None else None
            except Exception:
                deporte = None
            try:
                cliente = session.get(type(reserva).cliente.property.mapper.class_, reserva.idCliente) if reserva is not None else None
            except Exception:
                cliente = None

            out.append({
                'idDetalle': detalle.idDetalle,
                'idReserva': reserva.idReserva,
                'fechaReservada': reserva.fechaReservada.isoformat() if hasattr(reserva.fechaReservada, 'isoformat') else str(reserva.fechaReservada),
                'idCancha': cancha.idCancha if cancha is not None else None,
                'nombreCancha': cancha.nombre if cancha is not None else None,
                'idDeporte': cancha.deporte if cancha is not None else None,
                'nombreDeporte': deporte.nombre if deporte is not None else None,
                'idHorario': detalle.idHorario,
                'horaInicio': horario.horaInicio if horario is not None else None,
                'horaFin': horario.horaFin if horario is not None else None,
                'idCxS': detalle.idCxS,
                'servicioDescripcion': servicio.descripcion if servicio is not None else None,
                'idCliente': reserva.idCliente,
                'clienteNombre': cliente.nombre if cliente is not None else None,
                'clienteApellido': cliente.apellido if cliente is not None else None,
            })

        return jsonify(out)
    finally:
        session.close()
