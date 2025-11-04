from flask import Blueprint, request, jsonify
from database.mapeoCanchas import Cancha, CanchaxServicio, Deporte, Horario, Servicio, SessionLocal, DetalleReserva
from basicas import _to_dict

bp = Blueprint('detalle_reserva', __name__)


@bp.route('/detalle-reserva', methods=['POST'])
def create_detalle():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in DetalleReserva.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = DetalleReserva(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/detalle-reserva', methods=['GET'])
def list_detalles():
    session = SessionLocal()
    try:
        rows = session.query(DetalleReserva).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/detalle-reserva/<int:id>', methods=['GET'])
def get_detalle(id):
    session = SessionLocal()
    try:
        obj = session.get(DetalleReserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/detalle-reserva/<int:id>', methods=['PUT'])
def update_detalle(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(DetalleReserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in DetalleReserva.__table__.columns if not c.primary_key}
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


@bp.route('/detalle-reserva/<int:id>', methods=['DELETE'])
def delete_detalle(id):
    session = SessionLocal()
    try:
        obj = session.get(DetalleReserva, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@bp.route('/canchaxservicio/<int:idCxS>', methods=['GET'])
def get_canchaxservicio(idCxS: int):
    """Devuelve detalle de una fila CanchaxServicio incluyendo cancha y servicio anidados."""
    session = SessionLocal()
    try:
        obj = session.get(CanchaxServicio, idCxS)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        res = _to_dict(obj)
        # incluir detalle de cancha y servicio para conveniencia
        try:
            res['cancha'] = _to_dict(session.get(Cancha, obj.idCancha))
        except Exception:
            res['cancha'] = {}
        try:
            res['servicio'] = _to_dict(session.get(Servicio, obj.idServicio))
        except Exception:
            res['servicio'] = {}
        return jsonify(res)
    finally:
        session.close()


@bp.route('/deportes/<int:idDeporte>', methods=['GET'])
def get_deporte(idDeporte: int):
    session = SessionLocal()
    try:
        obj = session.get(Deporte, idDeporte)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/horarios/<int:idHorario>', methods=['GET'])
def get_horario(idHorario: int):
    session = SessionLocal()
    try:
        obj = session.get(Horario, idHorario)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()