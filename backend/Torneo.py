from flask import Blueprint, request, jsonify, send_file, send_from_directory
from database.mapeoCanchas import SessionLocal, Torneo, EstadoTorneo
from basicas import _to_dict
import os
from io import BytesIO
import urllib.request
from werkzeug.utils import secure_filename
from datetime import datetime

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

bp = Blueprint('torneo', __name__)

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/torneos/<int:idTorneo>/imagen', methods=['GET'])
def torneo_imagen(idTorneo):
    """Serve the torneo image referenced in Torneo.imagen.

    Behavior:
    - If imagen starts with /uploads/, serve the file from backend/uploads.
    - If imagen starts with /assets/, attempt to serve from frontend-react/public/assets.
    - If imagen is an http(s) URL, fetch it, optionally process with PIL, and stream it.
    """
    session = SessionLocal()
    try:
        t = session.get(Torneo, idTorneo)
        if not t or not getattr(t, 'imagen', None):
            return jsonify({'error': 'No image for this torneo'}), 404
        img = t.imagen
        
        # uploads (served from backend/uploads)
        if img.startswith('/uploads/'):
            filename = img.split('/uploads/',1)[1]
            full = os.path.abspath(os.path.join(UPLOAD_FOLDER, filename))
            if os.path.exists(full):
                if PIL_AVAILABLE:
                    try:
                        im = Image.open(full)
                        bio = BytesIO()
                        fmt = 'JPEG' if im.format is None else im.format
                        im.save(bio, format=fmt)
                        bio.seek(0)
                        return send_file(bio, mimetype=f'image/{fmt.lower()}')
                    except Exception:
                        return send_from_directory(UPLOAD_FOLDER, filename)
                else:
                    return send_from_directory(UPLOAD_FOLDER, filename)
            return jsonify({'error':'File not found'}), 404

        # assets from frontend public
        if img.startswith('/assets/'):
            asset_name = img.split('/assets/',1)[1]
            assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend-react', 'public', 'assets'))
            full = os.path.join(assets_dir, asset_name)
            if os.path.exists(full):
                if PIL_AVAILABLE:
                    try:
                        im = Image.open(full)
                        bio = BytesIO()
                        fmt = 'JPEG' if im.format is None else im.format
                        im.save(bio, format=fmt)
                        bio.seek(0)
                        return send_file(bio, mimetype=f'image/{fmt.lower()}')
                    except Exception:
                        return send_file(full)
                else:
                    return send_file(full)
            return jsonify({'error':'Asset not found'}), 404

        # remote URL
        if img.startswith('http://') or img.startswith('https://'):
            try:
                with urllib.request.urlopen(img, timeout=8) as resp:
                    data = resp.read()
                if PIL_AVAILABLE:
                    try:
                        im = Image.open(BytesIO(data))
                        bio = BytesIO()
                        fmt = 'JPEG' if im.format is None else im.format
                        im.save(bio, format=fmt)
                        bio.seek(0)
                        return send_file(bio, mimetype=f'image/{fmt.lower()}')
                    except Exception:
                        return send_file(BytesIO(data), mimetype=resp.headers.get_content_type() or 'application/octet-stream')
                else:
                    return send_file(BytesIO(data), mimetype=resp.headers.get_content_type() or 'application/octet-stream')
            except Exception as e:
                return jsonify({'error': 'Failed to fetch remote image', 'detail': str(e)}), 502

        # Unknown scheme: attempt to treat as relative path inside backend/uploads
        possible = os.path.abspath(os.path.join(UPLOAD_FOLDER, img.lstrip('/')))
        if os.path.exists(possible):
            return send_file(possible)
        return jsonify({'error':'Unsupported image path or not found'}), 404
    finally:
        session.close()


@bp.route('/torneos', methods=['POST'])
def create_torneo():
    session = SessionLocal()
    try:
        # Support both JSON and multipart/form-data
        if request.content_type and 'multipart/form-data' in request.content_type.lower():
            # Handle file upload
            nombreTorneo = request.form.get('nombreTorneo')
            deporte = request.form.get('deporte')
            fechaInicio = request.form.get('fechaInicio')
            fechaFin = request.form.get('fechaFin')
            estado = request.form.get('estado')
            maxIntegrantes = request.form.get('maxIntegrantes')
            imagen_url = request.form.get('imagen', '')
            
            allowed = {c.name for c in Torneo.__table__.columns if not c.primary_key}
            obj_kwargs = {}
            if 'nombreTorneo' in allowed and nombreTorneo: obj_kwargs['nombreTorneo'] = nombreTorneo
            if 'deporte' in allowed and deporte: obj_kwargs['deporte'] = int(deporte)
            if 'fechaInicio' in allowed and fechaInicio: 
                obj_kwargs['fechaInicio'] = datetime.strptime(fechaInicio, '%Y-%m-%d').date()
            if 'fechaFin' in allowed and fechaFin: 
                obj_kwargs['fechaFin'] = datetime.strptime(fechaFin, '%Y-%m-%d').date()
            if 'estado' in allowed and estado: obj_kwargs['estado'] = int(estado)
            if 'maxIntegrantes' in allowed and maxIntegrantes: obj_kwargs['maxIntegrantes'] = int(maxIntegrantes)
            
            obj = Torneo(**obj_kwargs)
            session.add(obj)
            session.flush()
            
            # Handle file upload
            if 'file' in request.files:
                file = request.files['file']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    filename = f"torneo_{obj.idTorneo}.{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    file.save(filepath)
                    obj.imagen = f'/uploads/{filename}'
            elif imagen_url and 'imagen' in allowed:
                obj.imagen = imagen_url
            
            session.commit()
            session.refresh(obj)
            return jsonify(_to_dict(obj)), 201
        else:
            # JSON request
            data = request.get_json() or {}
            allowed = {c.name for c in Torneo.__table__.columns if not c.primary_key}
            obj_kwargs = {k: v for k, v in data.items() if k in allowed}
            obj = Torneo(**obj_kwargs)
            session.add(obj)
            session.commit()
            session.refresh(obj)
            return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/torneos', methods=['GET'])
def list_torneos():
    session = SessionLocal()
    try:
        rows = session.query(Torneo).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/estado-torneos', methods=['GET'])
def listar_estado_torneos():
    session = SessionLocal()
    try:
        rows = session.query(EstadoTorneo).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/torneos/<int:id>', methods=['GET'])
def get_torneo(id):
    session = SessionLocal()
    try:
        obj = session.get(Torneo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/torneos/<int:id>', methods=['PUT'])
def update_torneo(id):
    session = SessionLocal()
    try:
        obj = session.get(Torneo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        
        # Support both JSON and multipart/form-data
        if request.content_type and 'multipart/form-data' in request.content_type.lower():
            # Handle file upload
            nombreTorneo = request.form.get('nombreTorneo')
            deporte = request.form.get('deporte')
            fechaInicio = request.form.get('fechaInicio')
            fechaFin = request.form.get('fechaFin')
            estado = request.form.get('estado')
            maxIntegrantes = request.form.get('maxIntegrantes')
            imagen_url = request.form.get('imagen', '')
            
            allowed = {c.name for c in Torneo.__table__.columns if not c.primary_key}
            if 'nombreTorneo' in allowed and nombreTorneo: obj.nombreTorneo = nombreTorneo
            if 'deporte' in allowed and deporte: obj.deporte = int(deporte)
            if 'fechaInicio' in allowed and fechaInicio: 
                obj.fechaInicio = datetime.strptime(fechaInicio, '%Y-%m-%d').date()
            if 'fechaFin' in allowed and fechaFin: 
                obj.fechaFin = datetime.strptime(fechaFin, '%Y-%m-%d').date()
            if 'estado' in allowed and estado: obj.estado = int(estado)
            if 'maxIntegrantes' in allowed and maxIntegrantes: obj.maxIntegrantes = int(maxIntegrantes)
            
            # Handle file upload
            if 'file' in request.files:
                file = request.files['file']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    filename = f"torneo_{obj.idTorneo}.{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    file.save(filepath)
                    obj.imagen = f'/uploads/{filename}'
            elif imagen_url and 'imagen' in allowed:
                obj.imagen = imagen_url
            
            session.commit()
            return jsonify({'success': True})
        else:
            # JSON request
            data = request.get_json() or {}
            allowed = {c.name for c in Torneo.__table__.columns if not c.primary_key}
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


@bp.route('/torneos/<int:id>', methods=['DELETE'])
def delete_torneo(id):
    session = SessionLocal()
    try:
        obj = session.get(Torneo, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
