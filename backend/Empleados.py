from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Empleado, Usuario
from basicas import _to_dict
from datetime import datetime, date

bp = Blueprint('empleados', __name__)


@bp.route('/empleados', methods=['GET'])
def list_empleados():
    """Get all empleados"""
    session = SessionLocal()
    try:
        rows = session.query(Empleado).all()
        out = []
        for emp in rows:
            d = _to_dict(emp)
            # Convert fechaIngreso to ISO format if present
            if 'fechaIngreso' in d and d['fechaIngreso']:
                try:
                    if hasattr(d['fechaIngreso'], 'isoformat'):
                        d['fechaIngreso'] = d['fechaIngreso'].isoformat()
                except Exception:
                    pass
            out.append(d)
        return jsonify(out)
    finally:
        session.close()


@bp.route('/empleados/<int:id>', methods=['GET'])
def get_empleado(id):
    """Get a single empleado by ID"""
    session = SessionLocal()
    try:
        emp = session.get(Empleado, id)
        if not emp:
            return jsonify({'error': 'Empleado no encontrado'}), 404
        d = _to_dict(emp)
        # Convert fechaIngreso to ISO format if present
        if 'fechaIngreso' in d and d['fechaIngreso']:
            try:
                if hasattr(d['fechaIngreso'], 'isoformat'):
                    d['fechaIngreso'] = d['fechaIngreso'].isoformat()
            except Exception:
                pass
        return jsonify(d)
    finally:
        session.close()


@bp.route('/empleados', methods=['POST'])
def create_empleado():
    """Create a new empleado"""
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Empleado.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        
        # Handle fechaIngreso if provided
        if 'fechaIngreso' in obj_kwargs:
            fi = obj_kwargs['fechaIngreso']
            if isinstance(fi, str):
                try:
                    obj_kwargs['fechaIngreso'] = datetime.fromisoformat(fi).date()
                except Exception:
                    try:
                        obj_kwargs['fechaIngreso'] = datetime.strptime(fi, '%Y-%m-%d').date()
                    except Exception:
                        pass
        
        emp = Empleado(**obj_kwargs)
        session.add(emp)
        session.commit()
        session.refresh(emp)
        
        d = _to_dict(emp)
        if 'fechaIngreso' in d and d['fechaIngreso']:
            try:
                if hasattr(d['fechaIngreso'], 'isoformat'):
                    d['fechaIngreso'] = d['fechaIngreso'].isoformat()
            except Exception:
                pass
        
        return jsonify(d), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/empleados/<int:id>', methods=['PUT'])
def update_empleado(id):
    """Update an existing empleado"""
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        emp = session.get(Empleado, id)
        if not emp:
            return jsonify({'error': 'Empleado no encontrado'}), 404
        
        allowed = {c.name for c in Empleado.__table__.columns if not c.primary_key}
        
        for k, v in data.items():
            if k in allowed and hasattr(emp, k):
                if k == 'fechaIngreso' and isinstance(v, str):
                    try:
                        v = datetime.fromisoformat(v).date()
                    except Exception:
                        try:
                            v = datetime.strptime(v, '%Y-%m-%d').date()
                        except Exception:
                            pass
                setattr(emp, k, v)
        
        session.commit()
        session.refresh(emp)
        
        d = _to_dict(emp)
        if 'fechaIngreso' in d and d['fechaIngreso']:
            try:
                if hasattr(d['fechaIngreso'], 'isoformat'):
                    d['fechaIngreso'] = d['fechaIngreso'].isoformat()
            except Exception:
                pass
        
        return jsonify(d)
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/empleados/<int:id>', methods=['DELETE'])
def delete_empleado(id):
    """Delete an empleado"""
    session = SessionLocal()
    try:
        emp = session.get(Empleado, id)
        if not emp:
            return jsonify({'error': 'Empleado no encontrado'}), 404
        
        session.delete(emp)
        session.commit()
        return jsonify({'message': 'Empleado eliminado exitosamente'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
