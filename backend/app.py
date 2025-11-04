from flask import Flask, jsonify
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Import blueprints from this folder
try:
    from Clientes import bp as clientes_bp
    from Canchas import bp as canchas_bp
    from DetalleReserva import bp as detalle_reserva_bp
    from Reserva import bp as reserva_bp
    from Torneo import bp as torneo_bp
    from Equipo import bp as equipo_bp
    from EquipoxCliente import bp as equipoxcliente_bp
    from Partido import bp as partido_bp
    from Pago import bp as pago_bp
    from Usuario import bp as usuario_bp
except Exception as e:
    # If imports fail, raise a clearer error so the developer can fix import paths
    raise ImportError(f"Fallo al importar blueprints: {e}")


def create_app():
    app = Flask(__name__)

    # Register all blueprints under /api so routes become /api/<route>
    app.register_blueprint(clientes_bp, url_prefix='/api')
    app.register_blueprint(canchas_bp, url_prefix='/api')
    app.register_blueprint(detalle_reserva_bp, url_prefix='/api')
    app.register_blueprint(reserva_bp, url_prefix='/api')
    app.register_blueprint(torneo_bp, url_prefix='/api')
    app.register_blueprint(equipo_bp, url_prefix='/api')
    app.register_blueprint(equipoxcliente_bp, url_prefix='/api')
    app.register_blueprint(partido_bp, url_prefix='/api')
    app.register_blueprint(pago_bp, url_prefix='/api')
    app.register_blueprint(usuario_bp, url_prefix='/api')

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    return app


if __name__ == '__main__':
    app = create_app()
    # Development server
    app.run(host='0.0.0.0', port=5000, debug=True)
