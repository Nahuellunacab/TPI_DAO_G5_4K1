from flask import Blueprint, request, jsonify
from basicas import (
    list_reservas_por_cliente_en_periodo,
    list_reservas_por_cancha,
    cancha_mas_usada,
    utilizacion_mensual,
)
from validators import parse_iso_date, json_error

# Blueprint en español: 'informes'
bp = Blueprint('informes', __name__)


@bp.route('/informes/reservas-por-cliente', methods=['GET'])
def informes_reservas_por_cliente():
    """Devuelve reservas agrupadas por cliente en un periodo opcional."""
    inicio = request.args.get('start')
    fin = request.args.get('end')
    idCliente = request.args.get('idCliente')
    try:
        fechaDesde = parse_iso_date(inicio) if inicio else None
        fechaHasta = parse_iso_date(fin) if fin else None
    except ValueError as e:
        return json_error(str(e), 400)

    try:
        if idCliente:
            resultado = list_reservas_por_cliente_en_periodo(fechaDesde=fechaDesde, fechaHasta=fechaHasta, idCliente=int(idCliente))
        else:
            resultado = list_reservas_por_cliente_en_periodo(fechaDesde=fechaDesde, fechaHasta=fechaHasta)
        return jsonify(resultado)
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/reservas-por-cancha/<int:idCancha>', methods=['GET'])
def informes_reservas_por_cancha(idCancha: int):
    """Devuelve las reservas que incluyen la cancha indicada en un periodo."""
    inicio = request.args.get('start')
    fin = request.args.get('end')
    try:
        fechaDesde = parse_iso_date(inicio) if inicio else None
        fechaHasta = parse_iso_date(fin) if fin else None
    except ValueError as e:
        return json_error(str(e), 400)
    try:
        resultado = list_reservas_por_cancha(idCancha=idCancha, fechaDesde=fechaDesde, fechaHasta=fechaHasta)
        return jsonify(resultado)
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/cancha-mas-usada', methods=['GET'])
def informe_cancha_mas_usada():
    try:
        return jsonify(cancha_mas_usada())
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/utilizacion-mensual', methods=['GET'])
def informe_utilizacion_mensual():
    """Devuelve la utilización mensual de canchas para un año y (opcional) cancha."""
    anio = request.args.get('year')
    idCancha = request.args.get('idCancha')
    try:
        y = int(anio) if anio else None
    except Exception:
        return json_error('year debe ser un entero (ej: 2025)', 400)
    try:
        resultado = utilizacion_mensual(year=y, idCancha=int(idCancha) if idCancha else None)
        return jsonify(resultado)
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/reporte-reservas-cliente', methods=['GET'])
def reporte_reservas_cliente():
    """Genera reporte imprimible de reservas por cliente con filtro de fechas."""
    inicio = request.args.get('start')
    fin = request.args.get('end')
    idCliente = request.args.get('idCliente')
    
    try:
        fechaDesde = parse_iso_date(inicio) if inicio else None
        fechaHasta = parse_iso_date(fin) if fin else None
    except ValueError as e:
        return json_error(str(e), 400)
    
    try:
        from basicas import list_clientes
        
        if idCliente:
            resultado = list_reservas_por_cliente_en_periodo(
                fechaDesde=fechaDesde, 
                fechaHasta=fechaHasta, 
                idCliente=int(idCliente)
            )
        else:
            resultado = list_reservas_por_cliente_en_periodo(
                fechaDesde=fechaDesde, 
                fechaHasta=fechaHasta
            )
        
        # Enriquecer con información adicional para el reporte
        for item in resultado:
            cliente = item.get('cliente', {})
            total_monto = sum(r.get('monto', 0) for r in item.get('reservas', []))
            item['total_monto'] = total_monto
            item['cantidad_reservas'] = len(item.get('reservas', []))
        
        return jsonify({
            'data': resultado,
            'fechaDesde': inicio,
            'fechaHasta': fin,
            'tipo': 'reservas-por-cliente'
        })
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/reporte-reservas-cancha', methods=['GET'])
def reporte_reservas_cancha():
    """Genera reporte imprimible de reservas por cancha con filtro de fechas."""
    inicio = request.args.get('start')
    fin = request.args.get('end')
    idCancha = request.args.get('idCancha')
    
    try:
        fechaDesde = parse_iso_date(inicio) if inicio else None
        fechaHasta = parse_iso_date(fin) if fin else None
    except ValueError as e:
        return json_error(str(e), 400)
    
    if not idCancha:
        return json_error('idCancha es requerido', 400)
    
    try:
        from basicas import get_cancha, list_deportes, get_cliente, list_tipos_documento
        
        cancha = get_cancha(int(idCancha))
        if not cancha:
            return json_error('Cancha no encontrada', 404)
        
        reservas = list_reservas_por_cancha(
            idCancha=int(idCancha),
            fechaDesde=fechaDesde,
            fechaHasta=fechaHasta
        )
        
        # Obtener deportes para el nombre
        deportes = list_deportes()
        deporte_map = {d['idDeporte']: d['nombre'] for d in deportes}
        
        # Obtener tipos de documento
        tipos_doc = list_tipos_documento()
        tipo_doc_map = {t['idTipoDoc']: t['nombre'] for t in tipos_doc}
        
        # Enriquecer cada reserva con información del cliente
        for reserva in reservas:
            cliente = get_cliente(reserva.get('idCliente'))
            if cliente:
                reserva['cliente'] = {
                    'nombre': cliente.get('nombre'),
                    'apellido': cliente.get('apellido'),
                    'tipoDocumento': tipo_doc_map.get(cliente.get('idTipoDoc'), 'DNI'),
                    'numeroDoc': cliente.get('numeroDoc')
                }
        
        total_monto = sum(r.get('monto', 0) for r in reservas)
        
        return jsonify({
            'cancha': cancha,
            'deporte': deporte_map.get(cancha.get('deporte')),
            'reservas': reservas,
            'cantidad_reservas': len(reservas),
            'total_monto': total_monto,
            'fechaDesde': inicio,
            'fechaHasta': fin,
            'tipo': 'reservas-por-cancha'
        })
    except Exception as e:
        return json_error(str(e), 500)


@bp.route('/informes/reporte-canchas-mas-usadas', methods=['GET'])
def reporte_canchas_mas_usadas():
    """Genera reporte imprimible de canchas más utilizadas."""
    inicio = request.args.get('start')
    fin = request.args.get('end')
    
    try:
        fechaDesde = parse_iso_date(inicio) if inicio else None
        fechaHasta = parse_iso_date(fin) if fin else None
    except ValueError as e:
        return json_error(str(e), 400)
    
    try:
        from basicas import list_canchas, list_deportes, _to_dict
        import sys
        from pathlib import Path
        
        # Asegurar que podemos importar desde database
        ROOT = Path(__file__).resolve().parent.parent
        if str(ROOT) not in sys.path:
            sys.path.insert(0, str(ROOT))
        
        from database.mapeoCanchas import SessionLocal, Reserva, DetalleReserva, CanchaxServicio
        
        session = SessionLocal()
        try:
            # Obtener todas las canchas
            canchas = list_canchas()
            deportes = list_deportes()
            deporte_map = {d['idDeporte']: d['nombre'] for d in deportes}
            
            # Calcular reservas por cancha en el período
            resultado = []
            for cancha in canchas:
                q = session.query(Reserva).join(
                    DetalleReserva, 
                    Reserva.idReserva == DetalleReserva.idReserva
                ).join(
                    CanchaxServicio,
                    DetalleReserva.idCxS == CanchaxServicio.idCxS
                ).filter(
                    CanchaxServicio.idCancha == cancha['idCancha']
                )
                
                if fechaDesde:
                    q = q.filter(Reserva.fechaReservada >= fechaDesde)
                if fechaHasta:
                    q = q.filter(Reserva.fechaReservada <= fechaHasta)
                
                count = q.distinct().count()
                
                resultado.append({
                    'idCancha': cancha['idCancha'],
                    'nombre': cancha['nombre'],
                    'deporte': deporte_map.get(cancha['deporte']),
                    'conteo_reservas': count,
                    'precioHora': cancha.get('precioHora', 0)
                })
            
            # Ordenar por conteo descendente
            resultado.sort(key=lambda x: x['conteo_reservas'], reverse=True)
            
            return jsonify({
                'data': resultado,
                'fechaDesde': inicio,
                'fechaHasta': fin,
                'tipo': 'canchas-mas-usadas'
            })
        finally:
            session.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json_error(str(e), 500)
