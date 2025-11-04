from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Pago, EstadoPago, MetodoPago
from basicas import _to_dict

bp = Blueprint('pago', __name__)


@bp.route('/pagos', methods=['POST'])
def create_pago():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Pago.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = Pago(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/pagos', methods=['GET'])
def list_pagos():
    session = SessionLocal()
    try:
        rows = session.query(Pago).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/estado-pagos', methods=['GET'])
def listar_estado_pagos():
    session = SessionLocal()
    try:
        rows = session.query(EstadoPago).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/pagos/<int:id>', methods=['GET'])
def get_pago(id):
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/pagos/<int:id>', methods=['PUT'])
def update_pago(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Pago.__table__.columns if not c.primary_key}
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


@bp.route('/pagos/<int:id>', methods=['DELETE'])
def delete_pago(id):
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@bp.route('/metodo-pago/<int:id>', methods=['GET'])
def get_metodo_pago(id: int):
    session = SessionLocal()
    try:
        obj = session.get(MetodoPago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()
