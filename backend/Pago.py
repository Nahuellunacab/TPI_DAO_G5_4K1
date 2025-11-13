from flask import Blueprint, request, jsonify
from database.mapeoCanchas import SessionLocal, Pago, EstadoPago, MetodoPago
from basicas import _to_dict
from services.pago_service import (
    crear_pago, obtener_pago_por_reserva, listar_pagos_pendientes,
    actualizar_estado_pago, obtener_historial_pagos_cliente,
    verificar_reserva_pagada, calcular_monto_reserva,
    inicializar_estados_y_metodos
)
from validators import json_error
import traceback

bp = Blueprint('pago', __name__)


@bp.route('/pagos', methods=['POST'])
def create_pago():
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        allowed = {c.name for c in Pago.__table__.columns if not c.primary_key}
        obj_kwargs = {k: v for k, v in data.items() if k in allowed}
        obj = Pago(**obj_kwargs)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return jsonify(_to_dict(obj)), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/pagos', methods=['GET'])
def list_pagos():
    session = SessionLocal()
    try:
        rows = session.query(Pago).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/estado-pagos', methods=['GET'])
def listar_estado_pagos():
    session = SessionLocal()
    try:
        rows = session.query(EstadoPago).all()
        return jsonify([_to_dict(r) for r in rows])
    finally:
        session.close()


@bp.route('/pagos/<int:id>', methods=['GET'])
def get_pago(id):
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


@bp.route('/pagos/<int:id>', methods=['PUT'])
def update_pago(id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        allowed = {c.name for c in Pago.__table__.columns if not c.primary_key}
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


@bp.route('/pagos/<int:id>', methods=['DELETE'])
def delete_pago(id):
    session = SessionLocal()
    try:
        obj = session.get(Pago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        session.delete(obj)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@bp.route('/metodo-pago/<int:id>', methods=['GET'])
def get_metodo_pago(id: int):
    session = SessionLocal()
    try:
        obj = session.get(MetodoPago, id)
        if not obj:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(_to_dict(obj))
    finally:
        session.close()


# ========== NUEVOS ENDPOINTS CON LÓGICA DE NEGOCIO ==========

@bp.route('/metodos-pago', methods=['GET'])
def listar_metodos_pago():
    """Lista todos los métodos de pago disponibles"""
    session = SessionLocal()
    try:
        metodos = session.query(MetodoPago).all()
        return jsonify([_to_dict(m) for m in metodos])
    finally:
        session.close()


@bp.route('/estados-pago', methods=['GET'])
def listar_estados_pago():
    """Lista todos los estados de pago"""
    session = SessionLocal()
    try:
        estados = session.query(EstadoPago).all()
        return jsonify([_to_dict(e) for e in estados])
    finally:
        session.close()


@bp.route('/pagos/crear', methods=['POST'])
def crear_nuevo_pago():
    """
    Crea un nuevo pago para una reserva
    Body: {
        "idReserva": int,
        "idMetodoPago": int,
        "monto": float,
        "idEmpleado": int (opcional),
        "detalles": {} (opcional)
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return json_error('No se enviaron datos', 400)
        
        # Validar campos requeridos
        if 'idReserva' not in data:
            return json_error('idReserva es requerido', 400)
        
        if 'idMetodoPago' not in data:
            return json_error('idMetodoPago es requerido', 400)
        
        if 'monto' not in data:
            return json_error('monto es requerido', 400)
        
        pago = crear_pago(
            idReserva=data['idReserva'],
            idMetodoPago=data['idMetodoPago'],
            monto=data['monto'],
            idEmpleado=data.get('idEmpleado'),
            detalles_extra=data.get('detalles')
        )
        
        return jsonify(pago), 201
    
    except ValueError as e:
        return json_error(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return json_error(f'Error al crear pago: {str(e)}', 500)


@bp.route('/pagos/reserva/<int:idReserva>', methods=['GET'])
def obtener_pago_reserva(idReserva):
    """Obtiene el pago de una reserva específica"""
    try:
        pago = obtener_pago_por_reserva(idReserva)
        if not pago:
            return json_error('No se encontró pago para esta reserva', 404)
        return jsonify(pago)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/pendientes', methods=['GET'])
def obtener_pagos_pendientes():
    """Lista todas las reservas sin pago"""
    try:
        pendientes = listar_pagos_pendientes()
        return jsonify(pendientes)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/<int:idPago>/estado', methods=['PUT'])
def cambiar_estado_pago(idPago):
    """
    Actualiza el estado de un pago
    Body: {
        "estado": "Pagado|Cancelado|Reembolsado",
        "idEmpleado": int (opcional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'estado' not in data:
            return json_error('estado es requerido', 400)
        
        pago = actualizar_estado_pago(
            idPago=idPago,
            nuevoEstado=data['estado'],
            idEmpleado=data.get('idEmpleado')
        )
        
        return jsonify(pago)
    
    except ValueError as e:
        return json_error(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/cliente/<int:idCliente>', methods=['GET'])
def obtener_historial_cliente(idCliente):
    """Obtiene todos los pagos de un cliente"""
    try:
        pagos = obtener_historial_pagos_cliente(idCliente)
        return jsonify(pagos)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/verificar/<int:idReserva>', methods=['GET'])
def verificar_pago(idReserva):
    """Verifica si una reserva está pagada"""
    try:
        pagada = verificar_reserva_pagada(idReserva)
        return jsonify({'pagada': pagada})
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/calcular-monto/<int:idReserva>', methods=['GET'])
def calcular_monto(idReserva):
    """Calcula el monto total de una reserva"""
    try:
        monto = calcular_monto_reserva(idReserva)
        return jsonify({'monto': monto})
    except ValueError as e:
        return json_error(str(e), 404)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/inicializar', methods=['POST'])
def inicializar_datos():
    """Inicializa estados y métodos de pago básicos"""
    try:
        result = inicializar_estados_y_metodos()
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)


@bp.route('/pagos/todos', methods=['GET'])
def listar_todos_pagos():
    """Lista todos los pagos con información completa"""
    session = SessionLocal()
    try:
        pagos = session.query(Pago).all()
        resultado = []
        
        for pago in pagos:
            pago_dict = _to_dict(pago)
            
            # Enriquecer con información adicional
            metodo = session.get(MetodoPago, pago.metodoPago)
            if metodo:
                pago_dict['metodoPagoNombre'] = metodo.descripcion
            
            estado = session.get(EstadoPago, pago.estado)
            if estado:
                pago_dict['estadoNombre'] = estado.nombre
            
            # Información de la reserva
            from database.mapeoCanchas import Reserva, Cliente
            reserva = session.get(Reserva, pago.idReserva)
            if reserva:
                pago_dict['fechaReservada'] = reserva.fechaReservada.isoformat() if reserva.fechaReservada else None
                
                cliente = session.get(Cliente, reserva.idCliente)
                if cliente:
                    pago_dict['cliente'] = {
                        'idCliente': cliente.idCliente,
                        'nombre': cliente.nombre,
                        'apellido': cliente.apellido,
                        'mail': cliente.mail
                    }
            
            resultado.append(pago_dict)
        
        return jsonify(resultado)
    
    except Exception as e:
        traceback.print_exc()
        return json_error(str(e), 500)
    finally:
        session.close()
