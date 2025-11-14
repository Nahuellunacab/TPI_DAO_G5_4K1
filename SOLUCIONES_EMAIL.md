# SOLUCIONES PARA ENVÍO DE EMAILS

## 🚀 OPCIÓN 1: Outlook/Hotmail (MÁS FÁCIL - RECOMENDADO)

### Ventajas:
- ✅ NO requiere contraseñas de aplicación
- ✅ Usa tu contraseña normal
- ✅ Configuración en 2 minutos

### Pasos:

1. **Crea una cuenta en Outlook** (si no tienes):
   - Ve a https://outlook.live.com
   - Clic en "Crear cuenta gratuita"
   - Completa el registro

2. **Configura en `backend/email_service.py` líneas 13-14:**
   ```python
   SMTP_USER = os.getenv('SMTP_USER', 'tuemail@outlook.com')  # Tu email de Outlook
   SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', 'TuContraseña123')  # Tu contraseña normal
   ```

3. **Prueba:**
   ```bash
   python test_email.py
   ```

---

## 📧 OPCIÓN 2: Gmail (Requiere pasos adicionales)

### Si quieres usar Gmail, necesitas:

1. **Activar verificación en 2 pasos**:
   - Ve a https://myaccount.google.com/security
   - Activa "Verificación en dos pasos"

2. **Generar contraseña de aplicación**:
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona App: "Correo"
   - Dispositivo: "Otro" → "Sistema Reservas"
   - Copia la contraseña de 16 caracteres

3. **Edita `backend/email_service.py` líneas 7-9:**
   ```python
   # OPCIÓN 1: Gmail
   SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
   SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
   ```

4. **Configura líneas 13-14:**
   ```python
   SMTP_USER = os.getenv('SMTP_USER', 'gofield78@gmail.com')
   SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', 'abcd efgh ijkl mnop')  # Contraseña de app
   ```

---

## ⚡ OPCIÓN 3: Servidor SMTP Local (Para desarrollo)

Si solo quieres probar localmente sin email real:

```bash
python -m smtpd -n -c DebuggingServer localhost:1025
```

En `email_service.py`:
```python
SMTP_SERVER = 'localhost'
SMTP_PORT = 1025
SMTP_USER = ''
SMTP_PASSWORD = ''
```

---

## 🎯 RECOMENDACIÓN

**USA OUTLOOK/HOTMAIL** - Es lo más simple y rápido.

Solo necesitas:
1. Una cuenta de Outlook (gratis)
2. Poner tu email y contraseña en el código
3. ¡Listo!
