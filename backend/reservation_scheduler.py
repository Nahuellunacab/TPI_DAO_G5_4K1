"""
Script para enviar recordatorios de reservas al comenzar el día.
Debe ejecutarse periódicamente (cada hora) mediante cron/task scheduler.
"""
import sys
import os

# Agregar el directorio raíz del proyecto al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime, timedelta
from database.mapeoCanchas import SessionLocal, Reserva, Cliente, DetalleReserva, Cancha, Horario, Deporte, Servicio, CanchaxServicio
from backend.email_service import send_reservation_reminder

# URL base de la aplicación (configurar según el entorno)
BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')

def check_and_send_reminders():
    """
    Verifica las reservas del día actual y envía recordatorios por email
    al comenzar el día (primera ejecución entre 00:00 y 01:00).
    """
    db = SessionLocal()
    try:
        now = datetime.now()
        # Obtener la fecha de hoy
        today = now.date()
        
        # MODO PRUEBA: Comentar esto para probar en cualquier hora
        # Solo enviar recordatorios si estamos entre 00:00 y 01:00
        # if now.hour > 0:
        #     print(f"\n⏰ Fuera del horario de envío (solo 00:00-01:00). Hora actual: {now.hour}:{now.minute:02d}")
        #     return
        
        print(f"\n🔍 Buscando reservas para hoy {today}")
        
        # Buscar reservas pendientes o confirmadas para el día de hoy
        reservas = db.query(Reserva).filter(
            Reserva.estado.in_([1, 2]),  # pendiente o confirmada
            Reserva.fechaReservada == today
        ).all()
        
        emails_sent = 0
        
        for reserva in reservas:
            try:
                # Obtener detalles de la reserva
                detalles = db.query(DetalleReserva).filter_by(idReserva=reserva.idReserva).all()
                if not detalles:
                    continue
                
                # Obtener información del primer detalle (cancha y horario principal)
                primer_detalle = detalles[0]
                horario = db.get(Horario, primer_detalle.idHorario) if primer_detalle.idHorario else None
                
                if not horario:
                    continue
                
                # Obtener cancha a través de CanchaxServicio
                cancha = None
                cancha_nombre = 'N/A'
                if primer_detalle.idCxS:
                    cxs = db.get(CanchaxServicio, primer_detalle.idCxS)
                    if cxs and cxs.idCancha:
                        cancha = db.get(Cancha, cxs.idCancha)
                        cancha_nombre = cancha.nombre if cancha else 'N/A'
                
                # La reserva ya está para hoy, no necesitamos verificar tiempo exacto
                # ya que enviamos al comenzar el día
                
                # Obtener información del cliente
                cliente = db.get(Cliente, reserva.idCliente)
                if not cliente or not cliente.mail:
                    print(f"⚠️ Reserva {reserva.idReserva}: Cliente sin email")
                    continue
                
                # Obtener deporte
                deporte_nombre = 'N/A'
                if cancha and cancha.deporte:
                    deporte = db.get(Deporte, cancha.deporte)
                    if deporte:
                        deporte_nombre = deporte.nombre
                
                # Obtener servicios
                servicios_lista = []
                for detalle in detalles:
                    if detalle.idCxS:
                        cxs = db.get(CanchaxServicio, detalle.idCxS)
                        if cxs and cxs.idServicio:
                            servicio = db.get(Servicio, cxs.idServicio)
                            if servicio and servicio.descripcion.lower() not in ['ninguno', 'ningún']:
                                servicios_lista.append(servicio.descripcion)
                
                servicios_texto = ', '.join(set(servicios_lista)) if servicios_lista else None
                
                # Preparar información de la reserva
                reserva_info = {
                    'fecha': reserva.fechaReservada.strftime('%d/%m/%Y'),
                    'horario': f"{horario.horaInicio} - {horario.horaFin}",
                    'cancha': cancha_nombre,
                    'deporte': deporte_nombre,
                    'monto': f"{reserva.monto:.2f}",
                    'servicios': servicios_texto
                }
                
                # Generar URLs de confirmación/cancelación
                confirm_url = f"{BASE_URL}/api/reservas/{reserva.idReserva}/confirmar"
                cancel_url = f"{BASE_URL}/api/reservas/{reserva.idReserva}/cancelar"
                
                # Enviar email
                cliente_nombre = f"{cliente.nombre} {cliente.apellido}".strip() or "Cliente"
                
                if send_reservation_reminder(
                    cliente.mail,
                    cliente_nombre,
                    reserva_info,
                    confirm_url,
                    cancel_url
                ):
                    emails_sent += 1
                    print(f"✅ Recordatorio enviado para reserva {reserva.idReserva}")
                
            except Exception as e:
                print(f"❌ Error procesando reserva {reserva.idReserva}: {e}")
                continue
        
        print(f"\n📧 Total de emails enviados: {emails_sent}")
        
    except Exception as e:
        print(f"❌ Error en check_and_send_reminders: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    print("="*60)
    print("🔔 Iniciando verificación de recordatorios de reservas")
    print("="*60)
    check_and_send_reminders()
    print("="*60)
    print("✅ Proceso completado")
    print("="*60)
