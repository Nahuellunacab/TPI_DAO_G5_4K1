from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Partido, Equipo, Cancha, Horario, Torneo, EquipoxCliente
from basicas import _to_dict
from datetime import datetime, timedelta
import random

bp = Blueprint('partido', __name__)


@bp.route('/partidos', methods=['POST'])
def create_partido():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Partido.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = Partido(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/partidos', methods=['GET'])
def list_partidos():
    session = SessionLocal()
    try:
        torneo_id = request.args.get('torneo')
        
        if torneo_id:
            # Obtener partidos con información completa para un torneo específico
            try:
                partidos = session.query(Partido).filter(Partido.idTorneo == int(torneo_id)).all()
            except Exception as e:
                # Si la tabla no existe o hay error, devolver lista vacía
                print(f"Error querying partidos: {e}")
                return jsonify([])
            
            result = []
            
            for p in partidos:
                partido_dict = _to_dict(p)
                
                # Agregar información del equipo 1
                equipo_1 = session.get(Equipo, p.equipo1)
                if equipo_1:
                    partido_dict['equipoLocal'] = _to_dict(equipo_1)
                
                # Agregar información del equipo 2
                equipo_2 = session.get(Equipo, p.equipo2)
                if equipo_2:
                    partido_dict['equipoVisitante'] = _to_dict(equipo_2)
                
                # Agregar información de la cancha
                cancha = session.get(Cancha, p.idCancha)
                if cancha:
                    partido_dict['cancha'] = _to_dict(cancha)
                
                # Agregar información del horario
                horario = session.get(Horario, p.idHorario)
                if horario:
                    partido_dict['horario'] = _to_dict(horario)
                
                result.append(partido_dict)
            
            return jsonify(result)
        else:
            rows = session.query(Partido).all()
            return jsonify([_to_dict(r) for r in rows])
    except Exception as e:
        print(f"Error in list_partidos: {e}")
        return jsonify([])
    finally:
        session.close()


@bp.route('/partidos/<int:id>', methods=['GET'])
def get_partido(id):
    session = SessionLocal()
    try:
        obj = session.get(Partido, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/partidos/<int:id>', methods=['PUT'])
def update_partido(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Partido, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Partido.__table__.columns if not c.primary_key}
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


@bp.route('/partidos/<int:id>', methods=['DELETE'])
def delete_partido(id):
    session = SessionLocal()
    try:
        obj = session.get(Partido, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@bp.route('/torneos/<int:torneo_id>/generar-partidos', methods=['POST'])
def generar_partidos_torneo(torneo_id):
    """Genera partidos aleatorios para un torneo usando los equipos registrados."""
    session = SessionLocal()
    try:
        # Obtener el torneo
        torneo = session.get(Torneo, torneo_id)
        if not torneo:
            return jsonify({'error': 'Torneo no encontrado'}), 404
        
        # Verificar que haya equipos registrados
        equipos_query = session.query(EquipoxCliente.idEquipo).filter(
            EquipoxCliente.idTorneo == torneo_id
        ).distinct().all()
        
        equipo_ids = [eq[0] for eq in equipos_query]
        
        if len(equipo_ids) < 2:
            return jsonify({'error': 'Se necesitan al menos 2 equipos para generar partidos'}), 400
        
        # Eliminar partidos existentes del torneo si los hay
        session.query(Partido).filter(Partido.idTorneo == torneo_id).delete()
        
        # Obtener canchas y horarios disponibles
        canchas = session.query(Cancha).filter(Cancha.deporte == torneo.deporte).all()
        horarios = session.query(Horario).all()
        
        if not canchas or not horarios:
            return jsonify({'error': 'No hay canchas u horarios disponibles'}), 400
        
        # Mezclar equipos aleatoriamente
        random.shuffle(equipo_ids)
        
        # Generar partidos emparejando equipos consecutivos
        partidos_creados = 0
        fecha_actual = datetime.strptime(torneo.fechaInicio, '%Y-%m-%d').date() if isinstance(torneo.fechaInicio, str) else torneo.fechaInicio
        fecha_fin = datetime.strptime(torneo.fechaFin, '%Y-%m-%d').date() if isinstance(torneo.fechaFin, str) else torneo.fechaFin
        
        # Crear partidos ida (cada equipo juega contra cada uno)
        for i in range(len(equipo_ids)):
            for j in range(i + 1, len(equipo_ids)):
                # Seleccionar cancha y horario aleatorios
                cancha = random.choice(canchas)
                horario = random.choice(horarios)
                
                # Calcular fecha del partido (distribuir entre fecha inicio y fin)
                dias_disponibles = (fecha_fin - fecha_actual).days
                if dias_disponibles > 0:
                    dias_offset = partidos_creados % (dias_disponibles + 1)
                    fecha_partido = fecha_actual + timedelta(days=dias_offset)
                else:
                    fecha_partido = fecha_actual
                
                # Crear partido
                partido = Partido(
                    idTorneo=torneo_id,
                    idCancha=cancha.idCancha,
                    fecha=fecha_partido,
                    idHorario=horario.idHorario,
                    equipo1=equipo_ids[i],
                    equipo2=equipo_ids[j],
                    resultado=None
                )
                session.add(partido)
                partidos_creados += 1
        
        session.commit()
        return jsonify({
            'success': True, 
            'partidos_creados': partidos_creados,
            'equipos': len(equipo_ids)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
