from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Cancha, Deporte, EstadoCancha
from basicas import _to_dict

bp = Blueprint('canchas', __name__)


@bp.route("/canchas", methods=["POST"])
def registrar_cancha():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        # construir kwargs usando columnas existentes (excluyendo PK)
        allowed = {c.name for c in Cancha.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        c = Cancha(**obj_kwargs)
        session.add(c)
        session.commit()
        session.refresh(c)
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
            # Intentar resolver nombre de deporte y estado; si no existen, ignorar
            d = session.get(Deporte, c.deporte)
            e = session.get(EstadoCancha, c.estado)
            if d:
                data['deporteNombre'] = getattr(d, 'nombre', None)
            if e:
                data['estadoNombre'] = getattr(e, 'nombre', None)
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


@bp.route('/estado-canchas', methods=['GET'])
def listar_estado_canchas():
    session = SessionLocal()
    try:
        try:
            rows = session.query(EstadoCancha).all()
            return jsonify([_to_dict(r) for r in rows])
        except Exception as e:
            # Fallback: if the mapped table/schema doesn't match the DB, return an empty list
            # and log the error to help debugging without breaking the frontend.
            print(f"listar_estado_canchas: DB query failed: {e}")
            return jsonify([])
    finally:
        session.close()


