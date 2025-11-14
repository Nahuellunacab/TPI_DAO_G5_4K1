@echo off
REM Script para configurar el Programador de Tareas de Windows
REM Ejecutar como Administrador

echo ========================================
echo Configurando Recordatorios de Reservas
echo ========================================
echo.

REM Obtener la ruta actual
set SCRIPT_DIR=%~dp0
set PYTHON_SCRIPT=%SCRIPT_DIR%backend\reservation_scheduler.py
set TASK_NAME=RecordatoriosReservas

echo Ruta del proyecto: %SCRIPT_DIR%
echo Script Python: %PYTHON_SCRIPT%
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en el PATH
    echo Por favor instala Python y vuelve a ejecutar este script
    pause
    exit /b 1
)

echo Python detectado correctamente
echo.

REM Crear la tarea programada - se ejecuta diariamente a las 00:00
echo Creando tarea programada...
schtasks /create /tn "%TASK_NAME%" /tr "python \"%PYTHON_SCRIPT%\"" /sc daily /st 00:00 /sd 01/01/2025 /ru SYSTEM /f

if errorlevel 1 (
    echo.
    echo ERROR: No se pudo crear la tarea programada
    echo Asegurate de ejecutar este script como Administrador
    pause
    exit /b 1
)

echo.
echo ========================================
echo Tarea creada exitosamente!
echo ========================================
echo.
echo La tarea "%TASK_NAME%" se ejecutará diariamente a las 00:00
echo.
echo Para administrar la tarea:
echo 1. Abre "Programador de tareas" (taskschd.msc)
echo 2. Busca "%TASK_NAME%"
echo 3. Puedes modificar horarios, ejecutar manualmente, etc.
echo.
echo IMPORTANTE: Configura las variables de entorno en:
echo - Panel de Control ^> Sistema ^> Configuración avanzada ^> Variables de entorno
echo.
echo Variables necesarias:
echo   SMTP_SERVER=smtp.gmail.com
echo   SMTP_PORT=587
echo   SMTP_USER=tu-email@gmail.com
echo   SMTP_PASSWORD=tu-contraseña-de-aplicación
echo   FROM_EMAIL=tu-email@gmail.com
echo   BASE_URL=http://localhost:5000
echo.
echo Para más información, lee RECORDATORIOS_EMAIL.md
echo.
pause
