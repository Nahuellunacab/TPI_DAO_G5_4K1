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
