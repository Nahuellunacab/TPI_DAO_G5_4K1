from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Cliente, TipoDocumento
from basicas import _to_dict

bp = Blueprint('clientes', __name__)


def _validate_email(email):
    import re
    return bool(re.match(r'^[^@]+@[^@]+\.[^@]+$', str(email)))


@bp.route("/clientes", methods=["POST"])
def registrar_cliente():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Cliente.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        if 'mail' in obj_kwargs and obj_kwargs['mail'] and not _validate_email(obj_kwargs['mail']):
            return jsonify({'error': 'Email inválido'}), 400
        c = Cliente(**obj_kwargs)
        session.add(c)
        session.commit()
        session.refresh(c)
        return jsonify(_to_dict(c)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'No se pudo crear cliente', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/clientes", methods=["GET"])
def listar_clientes():
    session = SessionLocal()
    try:
        rows = session.query(Cliente).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route("/clientes/<int:idCliente>", methods=["GET"])
def get_cliente(idCliente: int):
    session = SessionLocal()
    try:
        c = session.get(Cliente, idCliente)
        if not c:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        return jsonify(_to_dict(c))
    finally:
        session.close()


@bp.route("/clientes/<int:idCliente>", methods=["PUT"])
def modificar_datos_cliente(idCliente):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        c = session.get(Cliente, idCliente)
        if not c:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        allowed = {col.name for col in Cliente.__table__.columns if not col.primary_key}
        for k, v in data.items():
            if k in allowed:
                setattr(c, k, v)
        session.commit()
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al actualizar', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/clientes/<int:idCliente>", methods=["DELETE"])
def eliminar_cliente(idCliente):
    session = SessionLocal()
    try:
        c = session.get(Cliente, idCliente)
        if not c:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        session.delete(c)
        session.commit()
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al eliminar', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/tipos-documento", methods=["GET"])
def listar_tipos_documento():
    session = SessionLocal()
    try:
        rows = session.query(TipoDocumento).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()