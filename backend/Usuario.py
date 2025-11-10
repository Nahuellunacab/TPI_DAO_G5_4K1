from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Usuario, Permiso
from basicas import _to_dict
from validators import validate_email, validate_password_strength, json_error

bp = Blueprint('usuario', __name__)


@bp.route('/usuarios', methods=['POST'])
def create_usuario():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        # Basic validation: require 'usuario' and 'contrasena'
        usuario = (data.get('usuario') or '').strip()
        contrasena = data.get('contrasena')
        if not usuario:
            return json_error('El campo "usuario" es requerido', 400)
        if not validate_password_strength(contrasena):
            return json_error('La contraseña debe tener al menos 6 caracteres', 400)

        # Optional email validation when provided
        mail = data.get('mail')
        if mail and not validate_email(mail):
            return json_error('Email inválido', 400)

        # Check uniqueness of username
        existing = session.query(Usuario).filter(Usuario.usuario == usuario).first()
        if existing:
            return json_error('El nombre de usuario ya existe', 409)

        # Build allowed keys from the ORM mapper attribute names (exclude PKs)
        mapper = Usuario.__mapper__
        pk_attr_keys = {mapper.get_property_by_column(col).key for col in mapper.primary_key}
        allowed = {attr.key for attr in mapper.column_attrs if attr.key not in pk_attr_keys}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        # Ensure permisos defaults to 1 for new users created from the modal/frontend.
        if 'permisos' not in obj_kwargs or obj_kwargs.get('permisos') in (None, ''):
            obj_kwargs['permisos'] = 1

        # guarantee trimmed usuario in the stored model
        obj_kwargs['usuario'] = usuario
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
        # Use ORM mapper attribute names for updates (exclude PKs)
        mapper = Usuario.__mapper__
        pk_attr_keys = {mapper.get_property_by_column(col).key for col in mapper.primary_key}
        allowed = {attr.key for attr in mapper.column_attrs if attr.key not in pk_attr_keys}
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
