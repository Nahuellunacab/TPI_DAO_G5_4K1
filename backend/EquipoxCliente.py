from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, EquipoxCliente
from basicas import _to_dict

bp = Blueprint('equipoxcliente', __name__)


@bp.route('/equipoxcliente', methods=['POST'])
def create_ex():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in EquipoxCliente.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = EquipoxCliente(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/equipoxcliente', methods=['GET'])
def list_ex():
    session = SessionLocal()
    try:
        rows = session.query(EquipoxCliente).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/equipoxcliente/<int:id>', methods=['GET'])
def get_ex(id):
    session = SessionLocal()
    try:
        obj = session.get(EquipoxCliente, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/equipoxcliente/<int:id>', methods=['PUT'])
def update_ex(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(EquipoxCliente, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in EquipoxCliente.__table__.columns if not c.primary_key}
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


@bp.route('/equipoxcliente/<int:id>', methods=['DELETE'])
def delete_ex(id):
    session = SessionLocal()
    try:
        obj = session.get(EquipoxCliente, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
