from flask import Blueprint, jsonify, request
from database.mapeoCanchas import SessionLocal, Deporte

bp = Blueprint('deportes', __name__)

@bp.route('/deportes', methods=['GET'])
def get_deportes():
    """
    GET /api/deportes
    Retorna todos los deportes registrados
    """
    session = SessionLocal()
    try:
        deportes = session.query(Deporte).all()
        result = []
        for d in deportes:
            result.append({
                'idDeporte': d.idDeporte,
                'nombre': d.nombre
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
