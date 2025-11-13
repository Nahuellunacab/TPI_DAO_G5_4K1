from flask import Blueprint, request, jsonify, send_from_directory
from flask import send_file
import os
from werkzeug.utils import secure_filename
from uuid import uuid4
from database.mapeoCanchas import SessionLocal, Cancha, Deporte, EstadoCancha, CanchaxServicio
from basicas import _to_dict
# import engine/Base for reflection fallback
from backend.database import engine
from sqlalchemy import Table, select, MetaData
from io import BytesIO
import urllib.request
try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

bp = Blueprint('canchas', __name__)

# Upload folder (relative to project root)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@bp.route('/canchas/<int:idCancha>/foto', methods=['POST'])
def upload_cancha_foto(idCancha):
    # expects multipart/form-data with field 'foto'
    session = SessionLocal()
    try:
        c = session.get(Cancha, idCancha)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404

        if 'foto' not in request.files:
            return jsonify({'error': 'No file uploaded (field name must be `foto`)'}), 400
        f = request.files['foto']
        if f.filename == '':
            return jsonify({'error': 'No filename provided'}), 400

        filename = secure_filename(f.filename)
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext not in ('jpg', 'jpeg', 'png'):
            return jsonify({'error': 'Tipo de archivo no permitido'}), 400

        newname = f"{uuid4().hex}.{ext}"
        dest = os.path.abspath(os.path.join(UPLOAD_FOLDER, newname))
        f.save(dest)

        # store public path (served at /uploads/<name>)
        c.imagen = f"/uploads/{newname}"
        session.commit()
        return jsonify({'imagen': c.imagen, 'url': c.imagen})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/canchas/<int:idCancha>/imagen', methods=['GET'])
def cancha_imagen(idCancha):
    """Serve the cancha image referenced in Cancha.imagen.

    Behavior:
    - If imagen starts with /uploads/, serve the file from backend/uploads.
    - If imagen starts with /assets/, attempt to serve from frontend-react/public/assets.
    - If imagen is an http(s) URL, fetch it, optionally process with PIL, and stream it.
    - If PIL is available, we open and re-encode the image to ensure valid MIME and optionally
      provide a consistent response (JPEG/PNG). If not available, we stream bytes directly.
    """
    session = SessionLocal()
    try:
        c = session.get(Cancha, idCancha)
        if not c or not getattr(c, 'imagen', None):
            return jsonify({'error': 'No image for this cancha'}), 404
        img = c.imagen
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
                        bio = BytesIO(); fmt = 'JPEG' if im.format is None else im.format
                        im.save(bio, format=fmt); bio.seek(0)
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
                        bio = BytesIO(); fmt = 'JPEG' if im.format is None else im.format
                        im.save(bio, format=fmt); bio.seek(0)
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


@bp.route("/canchas", methods=["POST"])
def registrar_cancha():
    session = SessionLocal()
    try:
        # Support both JSON and multipart/form-data create+upload in one request.
        if request.content_type and 'multipart/form-data' in request.content_type.lower():
            # Read form fields
            nombre = request.form.get('nombre')
            deporte = request.form.get('deporte')
            precioHora = request.form.get('precioHora')
            estado = request.form.get('estado')
            imagen_field = request.form.get('imagen')

            # Build kwargs using allowed column names
            allowed = {c.name for c in Cancha.__table__.columns if not c.primary_key}
            obj_kwargs = {}
            if 'nombre' in allowed and nombre is not None: obj_kwargs['nombre'] = nombre
            if 'deporte' in allowed and deporte is not None:
                try: obj_kwargs['deporte'] = int(deporte)
                except Exception: obj_kwargs['deporte'] = None
            if 'precioHora' in allowed and precioHora is not None:
                try: obj_kwargs['precioHora'] = float(precioHora)
                except Exception: obj_kwargs['precioHora'] = 0.0
            if 'estado' in allowed and estado is not None:
                try: obj_kwargs['estado'] = int(estado)
                except Exception: obj_kwargs['estado'] = 1
            if 'imagen' in allowed and imagen_field:
                obj_kwargs['imagen'] = imagen_field

            c = Cancha(**obj_kwargs)
            session.add(c)
            session.commit()
            session.refresh(c)

            # Handle uploaded file if present under field name 'foto'
            if 'foto' in request.files:
                f = request.files['foto']
                if f and f.filename:
                    filename = secure_filename(f.filename)
                    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                    if ext in ('jpg','jpeg','png'):
                        newname = f"{uuid4().hex}.{ext}"
                        dest = os.path.abspath(os.path.join(UPLOAD_FOLDER, newname))
                        f.save(dest)
                        c.imagen = f"/uploads/{newname}"
                        session.commit()

            # Procesar servicios enviados (si vienen como form field JSON-string 'servicios')
            serv_field = request.form.get('servicios')
            if serv_field:
                try:
                    import json
                    servs = json.loads(serv_field)
                    # esperar lista de objetos {idServicio, precioAdicional}
                    for sv in servs:
                        try:
                            idS = int(sv.get('idServicio'))
                            precio = float(sv.get('precioAdicional', 0))
                            # crear asociación CanchaxServicio
                            cxs = CanchaxServicio(idCancha=c.idCancha, idServicio=idS, precioAdicional=precio)
                            session.add(cxs)
                        except Exception:
                            # ignorar entradas inválidas
                            continue
                    session.commit()
                except Exception:
                    session.rollback()

            return jsonify(_to_dict(c)), 201

        # Fallback: JSON body create (existing behavior)
        data = request.get_json() or {}
        allowed = {c.name for c in Cancha.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        c = Cancha(**obj_kwargs)
        session.add(c)
        session.commit()
        session.refresh(c)
        # Si el payload incluye 'servicios' (array de objetos {idServicio, precioAdicional}) crearlos
        try:
            servs = data.get('servicios') or []
            if isinstance(servs, list) and len(servs) > 0:
                for sv in servs:
                    try:
                        idS = int(sv.get('idServicio'))
                        precio = float(sv.get('precioAdicional', 0))
                        cxs = CanchaxServicio(idCancha=c.idCancha, idServicio=idS, precioAdicional=precio)
                        session.add(cxs)
                    except Exception:
                        continue
                session.commit()
        except Exception:
            session.rollback()
        return jsonify(_to_dict(c)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'No se pudo crear cancha', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/canchas", methods=["GET"])
def listar_canchas():
    session = SessionLocal()
    try:
        rows = session.query(Cancha).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route("/canchas/<int:idCancha>", methods=["GET"])
def get_cancha(idCancha: int):
    session = SessionLocal()
    try:
        c = session.get(Cancha, idCancha)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        # devolver el dict básico y añadir nombres legibles para deporte/estado
        data = _to_dict(c)
        try:
            # Intentar resolver nombre de deporte y estado; si no existen, intentar
            # una consulta reflectiva segura contra la tabla real.
            d = session.get(Deporte, c.deporte)
            if d:
                data['deporteNombre'] = getattr(d, 'nombre', None)

            # Primero intentamos la consulta ORM normal; si no encuentra nada,
            # usamos reflection para leer la tabla y mapear el id -> nombre.
            e = None
            try:
                e = session.get(EstadoCancha, c.estado)
            except Exception:
                e = None

            if e:
                data['estadoNombre'] = getattr(e, 'nombre', None)
            else:
                # Fallback: reflect table to find the correct id column name
                try:
                    md = MetaData()
                    tbl = Table('EstadoCancha', md, autoload_with=engine)
                    # find id column key (first column that looks like an id)
                    id_col = None
                    for k in tbl.c.keys():
                        lk = k.lower()
                        if 'id' in lk:
                            id_col = tbl.c[k]
                            break
                    if id_col is None:
                        # fallback to first column
                        id_col = list(tbl.c)[0]
                    stmt = select(tbl).where(id_col == c.estado).limit(1)
                    with engine.connect() as conn:
                        row = conn.execute(stmt).mappings().first()
                    if row:
                        # try to get name by common keys
                        name_val = None
                        for k in row.keys():
                            if 'nombre' in k.lower() or 'name' in k.lower():
                                name_val = row[k]
                                break
                        if name_val is None:
                            # fallback to second column if present
                            keys = list(row.keys())
                            if len(keys) >= 2:
                                name_val = row[keys[1]]
                        data['estadoNombre'] = name_val
                except Exception:
                    pass
        except Exception:
            # No propagar error por esta operación auxiliar
            pass
        return jsonify(data)
    finally:
        session.close()


@bp.route("/canchas/<int:idCancha>", methods=["PUT"])
def modificar_datos_cancha(idCancha):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        c = session.get(Cancha, idCancha)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        allowed = {col.name for col in Cancha.__table__.columns if not col.primary_key}
        for k, v in data.items():
            if k in allowed:
                setattr(c, k, v)
        # If the payload includes 'servicios', perform upsert of CanchaxServicio rows
        servs = data.get('servicios')
        if isinstance(servs, list) and len(servs) > 0:
            try:
                from database.mapeoCanchas import CanchaxServicio
                for sv in servs:
                    try:
                        idS = int(sv.get('idServicio'))
                        precio = float(sv.get('precioAdicional', 0))
                    except Exception:
                        continue
                    # try to find existing association
                    existing = session.query(CanchaxServicio).filter(CanchaxServicio.idCancha == idCancha, CanchaxServicio.idServicio == idS).first()
                    if existing:
                        existing.precioAdicional = precio
                    else:
                        # create new association
                        cxs = CanchaxServicio(idCancha=idCancha, idServicio=idS, precioAdicional=precio)
                        session.add(cxs)
                # commit changes for servicios alongside other updates
                session.commit()
            except Exception:
                session.rollback()
        session.commit()
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al actualizar', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/canchas/<int:idCancha>", methods=["DELETE"])
def eliminar_cancha(idCancha):
    session = SessionLocal()
    try:
        c = session.get(Cancha, idCancha)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        session.delete(c)
        session.commit()
        return jsonify({'success': True})
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al eliminar', 'detail': str(e)}), 500
    finally:
        session.close()


@bp.route("/deportes", methods=["GET"])
def listar_deportes():
    session = SessionLocal()
    try:
        rows = session.query(Deporte).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/servicios', methods=['GET'])
def listar_servicios():
    """Devuelve la lista de servicios disponibles."""
    session = SessionLocal()
    try:
        from database.mapeoCanchas import Servicio
        rows = session.query(Servicio).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/estado-canchas', methods=['GET'])
def listar_estado_canchas():
    session = SessionLocal()
    try:
        try:
            rows = session.query(EstadoCancha).all()
            return jsonify([_to_dict(r) for r in rows])
        except Exception as e:
            # Fallback: attempt to reflect the actual table schema and return rows
            # even if the ORM mapping doesn't match the DB. This helps when the
            # deployed SQLite file uses different column names than the model.
            print(f"listar_estado_canchas: DB query failed: {e}")
            try:
                # Reflect into a fresh MetaData to avoid clashes with ORM mappings
                md = MetaData()
                tbl = Table('EstadoCancha', md, autoload_with=engine)
                stmt = select(tbl)
                with engine.connect() as conn:
                    res = conn.execute(stmt).mappings().all()
                out = []
                for row in res:
                    # Try common column names for id and nombre
                    id_val = None
                    name_val = None
                    for k in row.keys():
                        lk = k.lower()
                        if id_val is None and ('id' in lk and ('estado' in lk or 'id' == lk or lk.endswith('id'))):
                            id_val = row[k]
                        if name_val is None and ('nombre' in lk or 'name' in lk):
                            name_val = row[k]
                    # fallback: first/second columns
                    keys = list(row.keys())
                    if id_val is None and len(keys) >= 1:
                        id_val = row[keys[0]]
                    if name_val is None and len(keys) >= 2:
                        name_val = row[keys[1]]
                    out.append({'idEstado': id_val, 'nombre': name_val})
                return jsonify(out)
            except Exception as e2:
                print(f"listar_estado_canchas: reflection fallback failed: {e2}")
                return jsonify([])
    finally:
        session.close()


