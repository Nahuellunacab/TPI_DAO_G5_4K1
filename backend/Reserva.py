from flask import Blueprint, request, jsonify
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
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
