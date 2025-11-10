# TPI DAO - Grupo 5 - 4K1

Trabajo Práctico Integrador para la materia "Desarrollo de Aplicaciones con Objetos".

## Estado Actual del Proyecto

El proyecto consiste en un backend desarrollado con Flask que expone una API REST para la gestión de un complejo de canchas.

Funcionalidades implementadas:
- **API Backend**: Creada con Flask y organizada en Blueprints.
- **Base de Datos**: Configuración con SQLAlchemy para conectarse a una base de datos SQLite. Incluye un *seed* inicial para la tabla `TipoDocumento`.
- **Endpoints de Clientes**: Se ha implementado el ABMC (CRUD) completo para la entidad `Cliente` bajo la ruta `/api/clientes`.
- **Endpoint de Health Check**: Una ruta `/api/health` para verificar el estado del servidor.
- **Testing**: Configuración inicial de pruebas con `pytest`, utilizando una base de datos en memoria para aislar los tests. Se incluye un test de ejemplo para el endpoint de health.

## Stack Tecnológico

- **Lenguaje**: Python 3.12
- **Framework Backend**: Flask
- **ORM**: SQLAlchemy
- **Base de Datos**: SQLite
- **Testing**: Pytest

## Cómo Ejecutar el Proyecto

### 1. Prerrequisitos

Asegúrate de tener instalado Python 3.10 o superior.

### 2. Configuración del Entorno

Se recomienda encarecidamente utilizar un entorno virtual para aislar las dependencias del proyecto.

```bash
# 1. Crea un entorno virtual en la raíz del proyecto
python -m venv venv

# 2. Activa el entorno virtual
# En Windows:
.\venv\Scripts\activate
# En macOS/Linux:
# source venv/bin/activate

# 3. Instala las dependencias necesarias
pip install Flask SQLAlchemy pytest
```

### 3. Ejecutar la Aplicación

Una vez que el entorno esté activado y las dependencias instaladas, puedes iniciar el servidor de desarrollo de Flask.

```bash
# Ejecuta el archivo principal de la aplicación
python backend/app.py
```

El servidor estará disponible en `http://127.0.0.1:5000`. La base de datos SQLite se creará automáticamente en la carpeta `database/` si no existe.

## Cómo Ejecutar las Pruebas

Para verificar que todo funciona correctamente, puedes ejecutar la suite de tests automatizados.

```bash
# Desde la raíz del proyecto, simplemente ejecuta pytest
pytest
```

Pytest descubrirá y ejecutará automáticamente todos los tests definidos en la carpeta `tests/`.
