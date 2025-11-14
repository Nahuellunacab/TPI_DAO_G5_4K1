from flask import Blueprint, request, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import traceback
from datetime import datetime, date
from time import sleep
from database.mapeoCanchas import SessionLocal, Reserva, EstadoReserva
from basicas import _to_dict

bp = Blueprint('reserva', __name__)


@bp.route('/reserva', methods=['POST'])
def create_reserva():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Reserva.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        # ensure fechaReservada is a date object for Date column
        if 'fechaReservada' in obj_kwargs:
            fr = obj_kwargs.get('fechaReservada')
            if isinstance(fr, str):
                try:
                    obj_kwargs['fechaReservada'] = datetime.fromisoformat(fr).date()
                except Exception:
                    try:
                        obj_kwargs['fechaReservada'] = datetime.strptime(fr, '%Y-%m-%d').date()
                    except Exception:
                        # leave as-is; DB/ORM will raise if incompatible
                        pass
        obj = Reserva(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        d = _to_dict(obj)
        try:
            fr = d.get('fechaReservada')
            if fr is not None and hasattr(fr, 'isoformat'):
                d['fechaReservada'] = fr.isoformat()
            else:
                if isinstance(fr, str) and len(fr) >= 10:
                    d['fechaReservada'] = fr[:10]
        except Exception:
            pass
        return jsonify(d), 201
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        # Print full traceback to server log to help debug 500 errors
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/reserva', methods=['GET'])
def list_reservas():
    session = SessionLocal()
    try:
        from database.mapeoCanchas import DetalleReserva, Horario, CanchaxServicio, Cancha
        rows = session.query(Reserva).all()
        out = []
        for r in rows:
            d = _to_dict(r)
            try:
                fr = d.get('fechaReservada')
                if fr is not None and hasattr(fr, 'isoformat'):
                    d['fechaReservada'] = fr.isoformat()
                else:
                    if isinstance(fr, str) and len(fr) >= 10:
                        d['fechaReservada'] = fr[:10]
            except Exception:
                pass
            
            # Include detalles with horario and cancha info
            detalles = []
            try:
                det_rows = (
                    session.query(DetalleReserva, Horario, CanchaxServicio, Cancha)
                    .outerjoin(Horario, DetalleReserva.idHorario == Horario.idHorario)
                    .outerjoin(CanchaxServicio, DetalleReserva.idCxS == CanchaxServicio.idCxS)
                    .outerjoin(Cancha, CanchaxServicio.idCancha == Cancha.idCancha)
                    .filter(DetalleReserva.idReserva == r.idReserva)
                    .all()
                )
                for det, horario, cvs, cancha in det_rows:
                    det_dict = _to_dict(det)
                    if horario:
                        det_dict['horaInicio'] = horario.horaInicio
                        det_dict['horaFin'] = horario.horaFin
                    if cancha:
                        det_dict['idCancha'] = cancha.idCancha
                    detalles.append(det_dict)
            except Exception:
                pass
            
            d['detalles'] = detalles
            out.append(d)
        return jsonify(out)
    finally:
        session.close()


@bp.route('/estado-reservas', methods=['GET'])
def listar_estado_reservas():
    session = SessionLocal()
    try:
        rows = session.query(EstadoReserva).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/reserva/<int:id>', methods=['GET'])
def get_reserva(id):
    session = SessionLocal()
    try:
        from database.mapeoCanchas import Cliente, DetalleReserva, Horario, CanchaxServicio, Cancha, Servicio
        
        obj = session.get(Reserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        d = _to_dict(obj)
        try:
            fr = d.get('fechaReservada')
            if fr is not None and hasattr(fr, 'isoformat'):
                d['fechaReservada'] = fr.isoformat()
            else:
                if isinstance(fr, str) and len(fr) >= 10:
                    d['fechaReservada'] = fr[:10]
        except Exception:
            pass
        
        # Include cliente info
        if obj.idCliente:
            cliente = session.get(Cliente, obj.idCliente)
            if cliente:
                d['cliente'] = _to_dict(cliente)
        
        # Include detalles with horario, cancha and servicio info
        detalles = []
        try:
            det_rows = (
                session.query(DetalleReserva, Horario, CanchaxServicio, Cancha, Servicio)
                .outerjoin(Horario, DetalleReserva.idHorario == Horario.idHorario)
                .outerjoin(CanchaxServicio, DetalleReserva.idCxS == CanchaxServicio.idCxS)
                .outerjoin(Cancha, CanchaxServicio.idCancha == Cancha.idCancha)
                .outerjoin(Servicio, CanchaxServicio.idServicio == Servicio.idServicio)
                .filter(DetalleReserva.idReserva == obj.idReserva)
                .all()
            )
            for det, horario, cvs, cancha, servicio in det_rows:
                det_dict = _to_dict(det)
                if horario:
                    det_dict['horario'] = _to_dict(horario)
                if cancha:
                    det_dict['nombreCancha'] = cancha.nombre
                    det_dict['idCancha'] = cancha.idCancha
                if servicio:
                    det_dict['servicio'] = _to_dict(servicio)
                detalles.append(det_dict)
        except Exception as e:
            print(f"Error loading detalles: {e}")
        
        d['detalles'] = detalles
        return jsonify(d)
    finally:
        session.close()


@bp.route('/reserva/<int:id>', methods=['PUT'])
def update_reserva(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Reserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Reserva.__table__.columns if not c.primary_key}
        for k, v in data.items():
            if k in allowed:
                # convert fechaReservada strings into date objects
                if k == 'fechaReservada' and isinstance(v, str):
                    try:
                        parsed = datetime.fromisoformat(v).date()
                    except Exception:
                        try:
                            parsed = datetime.strptime(v, '%Y-%m-%d').date()
                        except Exception:
                            parsed = None
                    if parsed:
                        setattr(obj, k, parsed)
                        continue
                # fallback for other fields
                setattr(obj, k, v)
        # commit with retry on SQLITE 'database is locked' errors
        attempts = 0
        while True:
            try:
                session.commit()
                break
            except OperationalError as oe:
                msg = str(oe).lower()
                if 'database is locked' in msg and attempts < 4:
                    attempts += 1
                    sleep(0.12 * attempts)  # small backoff
                    continue
                # otherwise fail
                try:
                    session.rollback()
                except Exception:
                    pass
                return jsonify({'error': str(oe)}), 500
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/reserva/<int:id>', methods=['DELETE'])
def delete_reserva(id):
    session = SessionLocal()
    try:
        obj = session.get(Reserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        # Perform manual deletes to avoid ORM lazy-loading issues when the
        # database schema differs from the ORM mapping (e.g. missing columns).
        # Delete DetalleReserva and Pago rows linked to this reserva first,
        # then delete the Reserva row itself using raw SQL.
        try:
            session.execute(text("DELETE FROM DetalleReserva WHERE idReserva = :id"), {"id": id})
        except Exception:
            # best-effort: if the table/column doesn't exist, ignore and continue
            session.rollback()
            session = SessionLocal()
        try:
            session.execute(text("DELETE FROM Pago WHERE idReserva = :id"), {"id": id})
        except Exception:
            session.rollback()
            session = SessionLocal()
        # Finally delete the Reserva row
        session.execute(text("DELETE FROM Reserva WHERE idReserva = :id"), {"id": id})
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@bp.route('/reservas/<int:id_reserva>/confirmar', methods=['GET', 'POST'])
def confirmar_reserva(id_reserva):
    """Endpoint para confirmar una reserva desde el email de recordatorio."""
    session = SessionLocal()
    try:
        reserva = session.get(Reserva, id_reserva)
        if not reserva:
            return '''
            <html>
                <head><title>Reserva no encontrada</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ Reserva no encontrada</h1>
                    <p>La reserva que intentas confirmar no existe o ya fue procesada.</p>
                </body>
            </html>
            ''', 404
        
        # Cambiar estado a confirmada (idEstado = 2)
        reserva.estado = 2
        session.commit()
        
        return '''
        <html>
            <head>
                <title>Reserva Confirmada</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f8f0; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #4caf50; }
                    .icon { font-size: 64px; margin: 20px 0; }
                    .info { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; }
                    .label { font-weight: bold; color: #333; }
                    a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4a9d9c; color: white; text-decoration: none; border-radius: 5px; }
                    a:hover { background: #2d6a6a; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">✅</div>
                    <h1>¡Reserva Confirmada!</h1>
                    <p>Tu reserva ha sido confirmada exitosamente.</p>
                    <div class="info">
                        <p><span class="label">Número de reserva:</span> #''' + str(id_reserva) + '''</p>
                        <p><span class="label">Estado:</span> Confirmada</p>
                    </div>
                    <p>Te esperamos en la cancha. ¡Que disfrutes tu partido!</p>
                    <a href="/">Volver al inicio</a>
                </div>
            </body>
        </html>
        ''', 200
        
    except Exception as e:
        session.rollback()
        return f'''
        <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Error</h1>
                <p>Ocurrió un error al confirmar la reserva: {str(e)}</p>
            </body>
        </html>
        ''', 500
    finally:
        session.close()


@bp.route('/reservas/<int:id_reserva>/cancelar', methods=['GET', 'POST'])
def cancelar_reserva(id_reserva):
    """Endpoint para cancelar una reserva desde el email de recordatorio."""
    session = SessionLocal()
    try:
        reserva = session.get(Reserva, id_reserva)
        if not reserva:
            return '''
            <html>
                <head><title>Reserva no encontrada</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ Reserva no encontrada</h1>
                    <p>La reserva que intentas cancelar no existe o ya fue procesada.</p>
                </body>
            </html>
            ''', 404
        
        # Verificar que no esté muy cerca del horario (mínimo 2 horas antes)
        from datetime import datetime, timedelta
        from database.mapeoCanchas import DetalleReserva, Horario
        
        # Obtener el horario de la reserva
        detalle = session.query(DetalleReserva).filter_by(idReserva=id_reserva).first()
        if detalle and detalle.idHorario:
            horario = session.get(Horario, detalle.idHorario)
            if horario:
                try:
                    hora_partes = horario.horaInicio.split(':')
                    hora_inicio = int(hora_partes[0])
                    minuto_inicio = int(hora_partes[1]) if len(hora_partes) > 1 else 0
                    
                    fecha_hora_reserva = datetime.combine(
                        reserva.fechaReservada,
                        datetime.min.time().replace(hour=hora_inicio, minute=minuto_inicio)
                    )
                    
                    time_until = fecha_hora_reserva - datetime.now()
                    hours_until = time_until.total_seconds() / 3600
                    
                    if hours_until < 2:
                        return '''
                        <html>
                            <head><title>Cancelación no permitida</title></head>
                            <body style="font-family: Arial; text-align: center; padding: 50px; background: #fff8e1;">
                                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <div style="font-size: 64px;">⚠️</div>
                                    <h1 style="color: #ff9800;">Cancelación no permitida</h1>
                                    <p>No se puede cancelar una reserva con menos de 2 horas de anticipación.</p>
                                    <p>Por favor, contacta directamente con el establecimiento.</p>
                                    <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4a9d9c; color: white; text-decoration: none; border-radius: 5px;">Volver</a>
                                </div>
                            </body>
                        </html>
                        ''', 403
                except Exception:
                    pass  # Si no se puede verificar, permitir cancelación
        
        # Cambiar estado a cancelada (idEstado = 3)
        reserva.estado = 3
        session.commit()
        
        return '''
        <html>
            <head>
                <title>Reserva Cancelada</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffebee; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #f44336; }
                    .icon { font-size: 64px; margin: 20px 0; }
                    .info { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; }
                    .label { font-weight: bold; color: #333; }
                    a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4a9d9c; color: white; text-decoration: none; border-radius: 5px; }
                    a:hover { background: #2d6a6a; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>Reserva Cancelada</h1>
                    <p>Tu reserva ha sido cancelada exitosamente.</p>
                    <div class="info">
                        <p><span class="label">Número de reserva:</span> #''' + str(id_reserva) + '''</p>
                        <p><span class="label">Estado:</span> Cancelada</p>
                    </div>
                    <p>Si deseas realizar una nueva reserva, puedes hacerlo desde nuestro sistema.</p>
                    <a href="/">Volver al inicio</a>
                </div>
            </body>
        </html>
        ''', 200
        
    except Exception as e:
        session.rollback()
        return f'''
        <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Error</h1>
                <p>Ocurrió un error al cancelar la reserva: {str(e)}</p>
            </body>
        </html>
        ''', 500
    finally:
        session.close()
