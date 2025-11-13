from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, EquipoxCliente, Cliente, Usuario, Equipo
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
    torneo_id = request.args.get('torneo')
    session = SessionLocal()
    try:
        if torneo_id:
            # Filter by torneo and join with Cliente, Usuario and Equipo to get client and team info
            rows = session.query(
                EquipoxCliente,
                Cliente.nombre.label('nombreCliente'),
                Cliente.apellido.label('apellidoCliente'),
                Cliente.numeroDoc.label('documentoCliente'),
                Equipo.nombre.label('nombreEquipo')
            ).join(
                Cliente, EquipoxCliente.idCliente == Cliente.idCliente
            ).join(
                Equipo, EquipoxCliente.idEquipo == Equipo.idEquipo
            ).filter(
                EquipoxCliente.idTorneo == int(torneo_id)
            ).all()
            
            result = []
            for exc, nombre, apellido, documento, nombreEquipo in rows:
                obj = _to_dict(exc)
                obj['nombreCliente'] = nombre
                obj['apellidoCliente'] = apellido
                obj['documentoCliente'] = documento
                obj['nombreEquipo'] = nombreEquipo
                result.append(obj)
            return jsonify(result)
        else:
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
