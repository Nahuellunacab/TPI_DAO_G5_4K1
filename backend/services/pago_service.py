"""
Servicio de Pagos - Lógica de negocio para el manejo de pagos
"""
from datetime import datetime
from database.mapeoCanchas import (
    SessionLocal, Pago, Reserva, DetalleReserva, 
    CanchaxServicio, EstadoPago, MetodoPago, Cliente, Empleado
)
from basicas import _to_dict
import json


def calcular_monto_reserva(idReserva: int, session=None) -> float:
    """
    Calcula el monto total de una reserva basado en:
    - Precio base de la cancha por hora
    - Servicios adicionales contratados
    
    Retorna el monto total a pagar
    """
    should_close = session is None
    if session is None:
        session = SessionLocal()
    
    try:
        reserva = session.get(Reserva, idReserva)
        if not reserva:
            raise ValueError(f"Reserva {idReserva} no encontrada")
        
        # El monto ya está calculado en la reserva
        # Pero lo recalculamos para validar
        monto_total = 0.0
        
        for detalle in reserva.detalles:
            # Obtener el CanchaxServicio
            cxs = session.get(CanchaxServicio, detalle.idCxS)
            if cxs:
                # El precio base de la cancha está en precioHora
                from database.mapeoCanchas import Cancha
                cancha = session.get(Cancha, cxs.idCancha)
                if cancha:
                    # Asumimos 1 hora por defecto, o calculamos según horario
                    monto_total += cancha.precioHora
                
                # Agregar precio adicional del servicio
                monto_total += cxs.precioAdicional
        
        return round(monto_total, 2)
    
    finally:
        if should_close:
            session.close()


def crear_pago(idReserva: int, idMetodoPago: int, monto: float, 
               idEmpleado: int = None, detalles_extra: dict = None):
    """
    Crea un nuevo registro de pago para una reserva
    
    Args:
        idReserva: ID de la reserva a pagar
        idMetodoPago: ID del método de pago (efectivo, tarjeta, etc)
        monto: Monto pagado
        idEmpleado: ID del empleado que registra el pago (opcional)
        detalles_extra: Diccionario con información adicional (últimos 4 dígitos, etc)
    
    Returns:
        dict: Datos del pago creado
    """
    session = SessionLocal()
    try:
        # Validar que la reserva existe
        reserva = session.get(Reserva, idReserva)
        if not reserva:
            raise ValueError(f"Reserva {idReserva} no encontrada")
        
        # Validar que no exista ya un pago para esta reserva
        pago_existente = session.query(Pago).filter_by(idReserva=idReserva).first()
        if pago_existente:
            raise ValueError(f"Ya existe un pago para la reserva {idReserva}")
        
        # Obtener el estado "pendiente" o "pagado" según corresponda
        estado_pagado = session.query(EstadoPago).filter_by(nombre='Pagado').first()
        if not estado_pagado:
            # Crear estados si no existen
            estado_pagado = EstadoPago(nombre='Pagado')
            session.add(estado_pagado)
            session.flush()
        
        # Crear el pago
        pago = Pago(
            idReserva=idReserva,
            metodoPago=idMetodoPago,
            monto=monto,
            fechaPago=datetime.now(),
            estado=estado_pagado.idEstado,
            detalles=json.dumps(detalles_extra) if detalles_extra else None,
            idEmpleado=idEmpleado
        )
        
        session.add(pago)
        
        # Actualizar estado de la reserva a "Confirmada"
        from database.mapeoCanchas import EstadoReserva
        estado_confirmada = session.query(EstadoReserva).filter_by(nombre='Confirmada').first()
        if estado_confirmada:
            reserva.estado = estado_confirmada.idEstado
        
        session.commit()
        session.refresh(pago)
        
        return _to_dict(pago)
    
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def obtener_pago_por_reserva(idReserva: int):
    """
    Obtiene el pago asociado a una reserva
    """
    session = SessionLocal()
    try:
        pago = session.query(Pago).filter_by(idReserva=idReserva).first()
        if not pago:
            return None
        
        # Enriquecer con información adicional
        pago_dict = _to_dict(pago)
        
        # Agregar método de pago
        metodo = session.get(MetodoPago, pago.metodoPago)
        if metodo:
            pago_dict['metodoPagoNombre'] = metodo.descripcion
        
        # Agregar estado
        estado = session.get(EstadoPago, pago.estado)
        if estado:
            pago_dict['estadoNombre'] = estado.nombre
        
        # Agregar información de la reserva
        reserva = session.get(Reserva, pago.idReserva)
        if reserva:
            cliente = session.get(Cliente, reserva.idCliente)
            if cliente:
                pago_dict['cliente'] = {
                    'nombre': cliente.nombre,
                    'apellido': cliente.apellido,
                    'mail': cliente.mail
                }
        
        # Agregar empleado si existe
        if pago.idEmpleado:
            empleado = session.get(Empleado, pago.idEmpleado)
            if empleado:
                pago_dict['empleado'] = {
                    'nombre': empleado.nombre,
                    'apellido': empleado.apellido
                }
        
        return pago_dict
    
    finally:
        session.close()


def listar_pagos_pendientes():
    """
    Lista todas las reservas CONFIRMADAS que no tienen pago asociado
    """
    session = SessionLocal()
    try:
        from database.mapeoCanchas import EstadoReserva
        
        # Obtener el ID del estado "Confirmada"
        estado_confirmada = session.query(EstadoReserva).filter_by(nombre='Confirmada').first()
        
        if not estado_confirmada:
            return []
        
        # Obtener solo las reservas confirmadas
        reservas_confirmadas = session.query(Reserva).filter_by(estado=estado_confirmada.idEstado).all()
        
        reservas_sin_pago = []
        
        for reserva in reservas_confirmadas:
            # Verificar que no tenga pago registrado
            pago = session.query(Pago).filter_by(idReserva=reserva.idReserva).first()
            if not pago:
                reserva_dict = _to_dict(reserva)
                
                # Agregar información del cliente
                cliente = session.get(Cliente, reserva.idCliente)
                if cliente:
                    reserva_dict['cliente'] = {
                        'nombre': cliente.nombre,
                        'apellido': cliente.apellido,
                        'mail': cliente.mail
                    }
                
                reservas_sin_pago.append(reserva_dict)
        
        return reservas_sin_pago
    
    finally:
        session.close()


def actualizar_estado_pago(idPago: int, nuevoEstado: str, idEmpleado: int = None):
    """
    Actualiza el estado de un pago (pagado, cancelado, reembolsado)
    """
    session = SessionLocal()
    try:
        pago = session.get(Pago, idPago)
        if not pago:
            raise ValueError(f"Pago {idPago} no encontrado")
        
        # Buscar el estado por nombre
        estado = session.query(EstadoPago).filter_by(nombre=nuevoEstado).first()
        if not estado:
            raise ValueError(f"Estado '{nuevoEstado}' no encontrado")
        
        pago.estado = estado.idEstado
        
        if idEmpleado:
            pago.idEmpleado = idEmpleado
        
        session.commit()
        return _to_dict(pago)
    
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def obtener_historial_pagos_cliente(idCliente: int):
    """
    Obtiene todos los pagos realizados por un cliente
    """
    session = SessionLocal()
    try:
        # Buscar reservas del cliente
        reservas = session.query(Reserva).filter_by(idCliente=idCliente).all()
        
        pagos = []
        for reserva in reservas:
            pago = session.query(Pago).filter_by(idReserva=reserva.idReserva).first()
            if pago:
                pago_dict = _to_dict(pago)
                
                # Agregar información de la reserva
                pago_dict['fechaReservada'] = reserva.fechaReservada.isoformat() if reserva.fechaReservada else None
                
                # Agregar método de pago
                metodo = session.get(MetodoPago, pago.metodoPago)
                if metodo:
                    pago_dict['metodoPagoNombre'] = metodo.descripcion
                
                # Agregar estado
                estado = session.get(EstadoPago, pago.estado)
                if estado:
                    pago_dict['estadoNombre'] = estado.nombre
                
                pagos.append(pago_dict)
        
        return pagos
    
    finally:
        session.close()


def verificar_reserva_pagada(idReserva: int) -> bool:
    """
    Verifica si una reserva tiene un pago confirmado
    """
    session = SessionLocal()
    try:
        pago = session.query(Pago).filter_by(idReserva=idReserva).first()
        if not pago:
            return False
        
        # Verificar que el estado sea "Pagado"
        estado = session.get(EstadoPago, pago.estado)
        if estado and estado.nombre == 'Pagado':
            return True
        
        return False
    
    finally:
        session.close()


def inicializar_estados_y_metodos():
    """
    Crea los estados de pago y métodos de pago básicos si no existen
    """
    session = SessionLocal()
    try:
        # Estados de pago
        estados = ['Pendiente', 'Pagado', 'Cancelado', 'Reembolsado']
        for nombre in estados:
            existe = session.query(EstadoPago).filter_by(nombre=nombre).first()
            if not existe:
                session.add(EstadoPago(nombre=nombre))
        
        # Métodos de pago
        metodos = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia Bancaria', 'MercadoPago']
        for descripcion in metodos:
            existe = session.query(MetodoPago).filter_by(descripcion=descripcion).first()
            if not existe:
                session.add(MetodoPago(descripcion=descripcion))
        
        session.commit()
        return {'success': True, 'message': 'Estados y métodos de pago inicializados'}
    
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
