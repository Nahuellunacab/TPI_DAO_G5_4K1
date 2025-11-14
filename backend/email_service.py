import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os

# Configuración de email
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USE_SSL = True

SMTP_USER = os.getenv('SMTP_USER', 'gofield78@gmail.com')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', 'whse rdgv biin mmke')
FROM_EMAIL = os.getenv('FROM_EMAIL', SMTP_USER)

def send_reservation_reminder(cliente_email, cliente_nombre, reserva_info, confirm_url, cancel_url):
    """
    Envía un email de recordatorio de reserva con opciones de confirmar/cancelar.
    
    Args:
        cliente_email: Email del cliente
        cliente_nombre: Nombre del cliente
        reserva_info: Dict con información de la reserva (fecha, hora, cancha, etc.)
        confirm_url: URL para confirmar la reserva
        cancel_url: URL para cancelar la reserva
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️ Email no configurado. Para habilitar emails, configura SMTP_USER y SMTP_PASSWORD")
        return False
    
    try:
        # Crear mensaje
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Recordatorio: Reserva en {reserva_info['cancha']} - {reserva_info['fecha']}"
        msg['From'] = FROM_EMAIL
        msg['To'] = cliente_email
        
        # Contenido del email en HTML
        html = f"""
        <html>
          <head>
            <style>
              body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
              .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
              .header {{ background: linear-gradient(135deg, #4a9d9c 0%, #2d6a6a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
              .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
              .info-box {{ background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4a9d9c; border-radius: 5px; }}
              .info-row {{ margin: 10px 0; }}
              .label {{ font-weight: bold; color: #2d6a6a; }}
              .buttons {{ text-align: center; margin: 30px 0; }}
              .btn {{ display: inline-block; padding: 15px 30px; margin: 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }}
              .btn-confirm {{ background: #4caf50; color: white; }}
              .btn-cancel {{ background: #f44336; color: white; }}
              .btn:hover {{ opacity: 0.9; }}
              .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏟️ Recordatorio de Reserva</h1>
                <p>Tienes una reserva para hoy</p>
              </div>
              <div class="content">
                <p>Hola <strong>{cliente_nombre}</strong>,</p>
                <p>Te recordamos que tienes una reserva <strong>para hoy</strong>:</p>
                
                <div class="info-box">
                  <div class="info-row">
                    <span class="label">📅 Fecha:</span> {reserva_info['fecha']}
                  </div>
                  <div class="info-row">
                    <span class="label">🕐 Horario:</span> {reserva_info['horario']}
                  </div>
                  <div class="info-row">
                    <span class="label">🏟️ Cancha:</span> {reserva_info['cancha']}
                  </div>
                  <div class="info-row">
                    <span class="label">⚽ Deporte:</span> {reserva_info.get('deporte', 'N/A')}
                  </div>
                  <div class="info-row">
                    <span class="label">💰 Monto:</span> ${reserva_info['monto']}
                  </div>
                  {f'<div class="info-row"><span class="label">🔧 Servicios:</span> {reserva_info["servicios"]}</div>' if reserva_info.get('servicios') else ''}
                </div>
                
                <p><strong>Por favor, confirma tu asistencia o cancela si no podrás asistir:</strong></p>
                
                <div class="buttons">
                  <a href="{confirm_url}" class="btn btn-confirm">✅ Confirmar Asistencia</a>
                  <a href="{cancel_url}" class="btn btn-cancel">❌ Cancelar Reserva</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  <em>Si no confirmas tu reserva, se mantendrá como pendiente. 
                  La cancelación debe realizarse con al menos 2 horas de anticipación.</em>
                </p>
              </div>
              <div class="footer">
                <p>Este es un mensaje automático, por favor no responder.</p>
                <p>© 2025 Sistema de Reservas de Canchas</p>
              </div>
            </div>
          </body>
        </html>
        """
        
        # Versión texto plano
        text = f"""
        Recordatorio de Reserva
        
        Hola {cliente_nombre},
        
        Te recordamos que tienes una reserva para dentro de 6 horas:
        
        Fecha: {reserva_info['fecha']}
        Horario: {reserva_info['horario']}
        Cancha: {reserva_info['cancha']}
        Monto: ${reserva_info['monto']}
        
        Por favor confirma o cancela tu reserva:
        
        Confirmar: {confirm_url}
        Cancelar: {cancel_url}
        
        Este es un mensaje automático.
        """
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Enviar email usando SSL o TLS según configuración
        if SMTP_USE_SSL:
            # Usar SSL (puerto 465)
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # Usar TLS (puerto 587)
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        
        print(f"✅ Email de recordatorio enviado a {cliente_email}")
        return True
        
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        return False
