from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Equipo
from basicas import _to_dict

bp = Blueprint('equipo', __name__)


@bp.route('/equipos', methods=['POST'])
def create_equipo():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Equipo.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = Equipo(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/equipos', methods=['GET'])
def list_equipos():
    session = SessionLocal()
    try:
        rows = session.query(Equipo).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/equipos/<int:id>', methods=['GET'])
def get_equipo(id):
    session = SessionLocal()
    try:
        obj = session.get(Equipo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/equipos/<int:id>', methods=['PUT'])
def update_equipo(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Equipo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Equipo.__table__.columns if not c.primary_key}
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


@bp.route('/equipos/<int:id>', methods=['DELETE'])
def delete_equipo(id):
    session = SessionLocal()
    try:
        obj = session.get(Equipo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
