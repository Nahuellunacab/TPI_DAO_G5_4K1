from flask import Blueprint, request, jsonify
from backend.models import SessionLocal, Cliente, TipoDocumento, engine
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
        # Build allowed keys using the ORM mapper attribute names. This returns
        # attributes like 'idTipoDoc' even if the physical DB column is named
        # 'tipoDoc'. Exclude primary key attrs.
        mapper = Cliente.__mapper__
        pk_attr_keys = {mapper.get_property_by_column(c).key for c in mapper.primary_key}
        allowed = {attr.key for attr in mapper.column_attrs if attr.key not in pk_attr_keys}
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
        # Use ORM mapper attribute names so callers can pass keys like 'idTipoDoc'.
        mapper = Cliente.__mapper__
        pk_attr_keys = {mapper.get_property_by_column(col).key for col in mapper.primary_key}
        allowed = {attr.key for attr in mapper.column_attrs if attr.key not in pk_attr_keys}
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
        # Use a raw SQL select to avoid triggering ORM mapper initialization
        # Try both possible table names that might exist in different DBs: TipoDocumento or TipoDoc
        from sqlalchemy import text
        out = []
        tried = []
        # Try the most likely table name first (some DBs use 'TipoDoc')
        for tbl in ("TipoDoc", "TipoDocumento"):
            try:
                tried.append(tbl)
                res = session.execute(text(f"SELECT idTipoDoc, nombre FROM {tbl}")).fetchall()
                if res:
                    for row in res:
                        out.append({"idTipoDoc": row[0], "nombre": row[1]})
                    break
            except Exception:
                # ignore and try next table name
                continue
        return jsonify(out)
    finally:
        session.close()



@bp.route('/tipos-documento/info', methods=['GET'])
def tipos_documento_info():
    """Devuelve información de diagnóstico sobre la tabla de tipos de documento.

    Retorna la DATABASE_URL usada por el backend y un intento de conteo/ejemplo
    de filas en las tablas 'TipoDocumento' y 'TipoDoc'.
    """
    session = SessionLocal()
    from sqlalchemy import text
    info = {"database_url": "N/A in new structure", "checked": []}
    for tbl in ("TipoDocumento", "TipoDoc"):
        try:
            cnt_row = session.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            sample = []
            if cnt_row and cnt_row > 0:
                rows = session.execute(text(f"SELECT idTipoDoc, nombre FROM {tbl} LIMIT 10")).fetchall()
                for r in rows:
                    sample.append({"idTipoDoc": r[0], "nombre": r[1]})
            info["checked"].append({"table": tbl, "count": int(cnt_row or 0), "sample": sample})
        except Exception as e:
            info["checked"].append({"table": tbl, "error": str(e)})
    session.close()
    return jsonify(info)