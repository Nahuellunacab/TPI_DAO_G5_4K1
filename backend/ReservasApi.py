from flask import Blueprint, request, jsonify, session
from database.mapeoCanchas import (
    SessionLocal, Reserva, DetalleReserva, Horario, CanchaxServicio, Cancha, EstadoCancha
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
    # Delegar la lógica de negocio a ServicioReservas (POO en español)
    result, status = ServicioReservas.crear_reserva_slot(data)
    return jsonify(result), status
