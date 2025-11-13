from flask import Flask, jsonify, send_from_directory
import sys
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Import blueprints from this folder
try:
    from Clientes import bp as clientes_bp
    from Canchas import bp as canchas_bp
    from DetalleReserva import bp as detalle_reserva_bp
    from Reserva import bp as reserva_bp
    from ReservasApi import bp as reservas_api_bp
    from reports import bp as informes_bp
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
    app.register_blueprint(reservas_api_bp, url_prefix='/api')
    app.register_blueprint(informes_bp, url_prefix='/api')
    app.register_blueprint(torneo_bp, url_prefix='/api')
    app.register_blueprint(equipo_bp, url_prefix='/api')
    app.register_blueprint(equipoxcliente_bp, url_prefix='/api')
    app.register_blueprint(partido_bp, url_prefix='/api')
    app.register_blueprint(pago_bp, url_prefix='/api')
    app.register_blueprint(usuario_bp, url_prefix='/api')

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    # --- seed mínimo para TipoDocumento si está vacío ---
    try:
        from database.mapeoCanchas import SessionLocal, TipoDocumento
        # Asegurar que la columna 'descripcion' exista en Cancha (migración ligera)
        try:
            from database.mapeoCanchas import ensure_cancha_descripcion_column
            try:
                created = ensure_cancha_descripcion_column()
                if created:
                    print("Migración: columna 'descripcion' añadida a Cancha")
            except Exception:
                # No bloquear el arranque si la migración falla; dejar que admin la resuelva.
                pass
            # Asegurar que la columna 'imagen' exista en Cancha (migración ligera)
            try:
                from database.mapeoCanchas import ensure_cancha_imagen_column
                try:
                    created_img = ensure_cancha_imagen_column()
                    if created_img:
                        print("Migración: columna 'imagen' añadida a Cancha")
                except Exception:
                    pass
            except Exception:
                pass
            # Asegurar que la columna 'imagen' exista en Usuario (migración ligera)
            try:
                from database.mapeoCanchas import ensure_usuario_imagen_column
                try:
                    created_usr_img = ensure_usuario_imagen_column()
                    if created_usr_img:
                        print("Migración: columna 'imagen' añadida a Usuario")
                except Exception:
                    pass
            except Exception:
                pass
        except Exception:
            pass
        session = SessionLocal()
        try:
            cnt = session.query(TipoDocumento).count()
            if cnt == 0:
                defaults = ['DNI', 'LC', 'LE', 'PASAPORTE']
                for n in defaults:
                    session.add(TipoDocumento(nombre=n))
                session.commit()
        finally:
            session.close()
    except Exception:
        # No bloquear el arranque si algo falla aquí; solo intentamos un seed seguro.
        pass

    # Serve uploaded files from /uploads/<filename> (saved to backend/uploads)
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
    if not os.path.isdir(uploads_dir):
        try:
            os.makedirs(uploads_dir, exist_ok=True)
        except Exception:
            pass

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        try:
            return send_from_directory(uploads_dir, filename)
        except Exception:
            return jsonify({'error': 'File not found'}), 404

    return app


if __name__ == '__main__':
    app = create_app()
    # Development server
    app.run(host='0.0.0.0', port=5000, debug=True)
