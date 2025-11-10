from flask import Blueprint, request, jsonify
from sqlalchemy import text
from datetime import datetime, date
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
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/reserva', methods=['GET'])
def list_reservas():
    session = SessionLocal()
    try:
        rows = session.query(Reserva).all()
        return jsonify([_to_dict(r) for r in rows])
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
        obj = session.get(Reserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
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
        session.commit()
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
