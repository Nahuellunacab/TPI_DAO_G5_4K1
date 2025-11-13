from flask import Blueprint, request, jsonify, send_file, send_from_directory
from database.mapeoCanchas import SessionLocal, Usuario, Permiso, Cliente, Empleado
from basicas import _to_dict
from validators import validate_email, validate_password_strength, json_error
from werkzeug.utils import secure_filename
from uuid import uuid4
import os
from io import BytesIO
import urllib.request
try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

bp = Blueprint('usuario', __name__)

# Upload folder (same as canchas)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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
        
        # Get user data
        user_data = _to_dict(obj)
        
        # Try to find associated Cliente or Empleado
        cliente = session.query(Cliente).filter(Cliente.idUsuario == id).first()
        empleado = session.query(Empleado).filter(Empleado.idUsuario == id).first()
        
        # Debug: print what we found
        print(f"DEBUG - Usuario {id}: cliente={cliente}, empleado={empleado}")
        
        # Merge data from Cliente or Empleado (they have priority over Usuario fields)
        if cliente:
            print(f"DEBUG - Cliente encontrado: {cliente.nombre} {cliente.apellido}")
            user_data['nombre'] = cliente.nombre
            user_data['apellido'] = cliente.apellido
            user_data['telefono'] = cliente.telefono
            user_data['mail'] = cliente.mail
            user_data['tipoRegistro'] = 'cliente'
            user_data['idRegistro'] = cliente.idCliente
        elif empleado:
            print(f"DEBUG - Empleado encontrado: {empleado.nombre} {empleado.apellido}")
            user_data['nombre'] = empleado.nombre
            user_data['apellido'] = empleado.apellido
            user_data['telefono'] = str(empleado.telefono) if empleado.telefono else None
            user_data['mail'] = empleado.mail
            user_data['tipoRegistro'] = 'empleado'
            user_data['idRegistro'] = empleado.idEmpleado
        else:
            print(f"DEBUG - No se encontró Cliente ni Empleado para usuario {id}")
            # No associated record, use Usuario fields if they exist
            user_data['tipoRegistro'] = None
            user_data['idRegistro'] = None
        
        print(f"DEBUG - Retornando: {user_data}")
        return jsonify(user_data)
    finally:
        session.close()


@bp.route('/usuarios/<int:id>', methods=['PUT'])
def update_usuario(id):
    session = SessionLocal()
    try:
        obj = session.get(Usuario, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        
        # Find associated Cliente or Empleado
        cliente = session.query(Cliente).filter(Cliente.idUsuario == id).first()
        empleado = session.query(Empleado).filter(Empleado.idUsuario == id).first()
        
        # Check if multipart/form-data (file upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle image upload (store in Usuario)
            if 'imagen' in request.files:
                f = request.files['imagen']
                if f.filename != '':
                    filename = secure_filename(f.filename)
                    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                    if ext not in ('jpg', 'jpeg', 'png'):
                        return jsonify({'error': 'Tipo de archivo no permitido'}), 400
                    
                    newname = f"{uuid4().hex}.{ext}"
                    dest = os.path.abspath(os.path.join(UPLOAD_FOLDER, newname))
                    f.save(dest)
                    obj.imagen = f"/uploads/{newname}"
            
            # Handle other form fields - update Cliente or Empleado
            if cliente:
                if 'nombre' in request.form:
                    cliente.nombre = request.form['nombre']
                if 'apellido' in request.form:
                    cliente.apellido = request.form['apellido']
                if 'telefono' in request.form:
                    cliente.telefono = request.form['telefono']
                if 'mail' in request.form:
                    cliente.mail = request.form['mail']
            elif empleado:
                if 'nombre' in request.form:
                    empleado.nombre = request.form['nombre']
                if 'apellido' in request.form:
                    empleado.apellido = request.form['apellido']
                if 'telefono' in request.form:
                    try:
                        empleado.telefono = int(request.form['telefono']) if request.form['telefono'] else None
                    except ValueError:
                        empleado.telefono = None
                if 'mail' in request.form:
                    empleado.mail = request.form['mail']
            else:
                # No associated record, update Usuario fields directly (fallback)
                for key in request.form:
                    if hasattr(obj, key) and key != 'idUsuario':
                        setattr(obj, key, request.form[key])
        else:
            # JSON data
            data = request.get_json() or {}
            
            # Handle image URL from JSON
            if 'imagen' in data:
                obj.imagen = data['imagen']
            
            # Update Cliente or Empleado
            if cliente:
                if 'nombre' in data:
                    cliente.nombre = data['nombre']
                if 'apellido' in data:
                    cliente.apellido = data['apellido']
                if 'telefono' in data:
                    cliente.telefono = data['telefono']
                if 'mail' in data:
                    cliente.mail = data['mail']
            elif empleado:
                if 'nombre' in data:
                    empleado.nombre = data['nombre']
                if 'apellido' in data:
                    empleado.apellido = data['apellido']
                if 'telefono' in data:
                    try:
                        empleado.telefono = int(data['telefono']) if data['telefono'] else None
                    except (ValueError, TypeError):
                        empleado.telefono = None
                if 'mail' in data:
                    empleado.mail = data['mail']
            else:
                # No associated record, update Usuario fields directly (fallback)
                mapper = Usuario.__mapper__
                pk_attr_keys = {mapper.get_property_by_column(col).key for col in mapper.primary_key}
                allowed = {attr.key for attr in mapper.column_attrs if attr.key not in pk_attr_keys}
                for k, v in data.items():
                    if k in allowed:
                        setattr(obj, k, v)
        
        session.commit()
        session.refresh(obj)
        
        # Return merged data
        user_data = _to_dict(obj)
        if cliente:
            session.refresh(cliente)
            user_data['nombre'] = cliente.nombre
            user_data['apellido'] = cliente.apellido
            user_data['telefono'] = cliente.telefono
            user_data['mail'] = cliente.mail
            user_data['tipoRegistro'] = 'cliente'
            user_data['idRegistro'] = cliente.idCliente
        elif empleado:
            session.refresh(empleado)
            user_data['nombre'] = empleado.nombre
            user_data['apellido'] = empleado.apellido
            user_data['telefono'] = str(empleado.telefono) if empleado.telefono else None
            user_data['mail'] = empleado.mail
            user_data['tipoRegistro'] = 'empleado'
            user_data['idRegistro'] = empleado.idEmpleado
        
        return jsonify(user_data)
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/usuarios/<int:id>/imagen', methods=['GET'])
def usuario_imagen(id):
    """Serve the usuario image referenced in Usuario.imagen.
    
    Behavior similar to cancha imagen endpoint:
    - If imagen starts with /uploads/, serve from backend/uploads.
    - If imagen starts with /assets/, serve from frontend-react/public/assets.
    - If imagen is http(s), fetch and stream it.
    """
    session = SessionLocal()
    try:
        u = session.get(Usuario, id)
        if not u or not getattr(u, 'imagen', None):
            # Return default avatar
            default_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend-react', 'public', 'assets', 'default-avatar.png'))
            if os.path.exists(default_path):
                return send_file(default_path, mimetype='image/png')
            return jsonify({'error': 'No image for this user'}), 404
        
        img = u.imagen
        
        # uploads (served from backend/uploads)
        if img.startswith('/uploads/'):
            filename = img.split('/uploads/', 1)[1]
            full = os.path.abspath(os.path.join(UPLOAD_FOLDER, filename))
            if os.path.exists(full):
                return send_file(full, mimetype='image/jpeg')
            return jsonify({'error': 'File not found'}), 404
        
        # assets (served from frontend-react/public/assets)
        if img.startswith('/assets/'):
            filename = img.split('/assets/', 1)[1]
            assets_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend-react', 'public', 'assets'))
            full = os.path.join(assets_folder, filename)
            if os.path.exists(full):
                return send_file(full, mimetype='image/jpeg')
            return jsonify({'error': 'Asset not found'}), 404
        
        # remote URL
        if img.startswith('http://') or img.startswith('https://'):
            try:
                with urllib.request.urlopen(img) as response:
                    data = response.read()
                    if PIL_AVAILABLE:
                        pil_img = Image.open(BytesIO(data))
                        buf = BytesIO()
                        pil_img.save(buf, format='JPEG')
                        buf.seek(0)
                        return send_file(buf, mimetype='image/jpeg')
                    else:
                        return send_file(BytesIO(data), mimetype='image/jpeg')
            except Exception as e:
                return jsonify({'error': f'Could not fetch remote image: {str(e)}'}), 500
        
        return jsonify({'error': 'Invalid image path'}), 400
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
