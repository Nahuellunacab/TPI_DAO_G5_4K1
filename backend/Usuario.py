from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Usuario, Permiso
from basicas import _to_dict

bp = Blueprint('usuario', __name__)


@bp.route('/usuarios', methods=['POST'])
def create_usuario():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Usuario.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = Usuario(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/usuarios', methods=['GET'])
def list_usuarios():
    session = SessionLocal()
    try:
        rows = session.query(Usuario).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/permisos', methods=['GET'])
def list_permisos():
    session = SessionLocal()
    try:
        rows = session.query(Permiso).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/permisos/<int:id>', methods=['GET'])
def get_permiso(id: int):
    session = SessionLocal()
    try:
        obj = session.get(Permiso, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/usuarios/<int:id>', methods=['GET'])
def get_usuario(id):
    session = SessionLocal()
    try:
        obj = session.get(Usuario, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/usuarios/<int:id>', methods=['PUT'])
def update_usuario(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Usuario, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Usuario.__table__.columns if not c.primary_key}
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


@bp.route('/usuarios/<int:id>', methods=['DELETE'])
def delete_usuario(id):
    session = SessionLocal()
    try:
        obj = session.get(Usuario, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
