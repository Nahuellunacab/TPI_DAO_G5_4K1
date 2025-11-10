# Sistema de Gestión de Reservas de Canchas Deportivas

Este es el Trabajo Práctico Integrador para la materia "Desarrollo de Aplicaciones con Objetos". El proyecto es una aplicación web full-stack para la gestión y reserva de canchas deportivas.

## 📜 Descripción del Proyecto

La aplicación permite a los usuarios ver la disponibilidad de canchas, realizar reservas, y gestionarlas. El sistema está compuesto por un backend que gestiona la lógica de negocio y una interfaz de usuario web interactiva.

## 🚀 Stack de Tecnologías

- **Backend:**
  - **Python 3.12**
  - **Flask:** Como microframework para la API REST.
  - **SQLAlchemy:** Para el ORM y la interacción con la base de datos.
- **Frontend:**
  - **React:** Para construir la interfaz de usuario.
  - **Vite:** Como herramienta de construcción y servidor de desarrollo.
  - **FullCalendar:** Para la visualización de horarios y reservas.
- **Base de Datos:**
  - **SQLite:** Para el desarrollo local.

## 📋 Prerrequisitos

Asegúrate de tener instalados los siguientes programas en tu sistema:
- [Python 3.10+](https://www.python.org/downloads/)
- [Node.js 18.x+](https://nodejs.org/en/) (que incluye npm)
- [Git](https://git-scm.com/)

## ⚙️ Instalación y Puesta en Marcha

Sigue estos pasos para configurar el entorno de desarrollo local.

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd TPI_DAO_G5_4K1
```

### 2. Configuración del Backend (Python)

Desde la raíz del proyecto:

a. **Crear y activar el entorno virtual:**
   ```bash
   # Crear el entorno virtual
   python -m venv .venv

   # Activar en Windows (PowerShell)
   .\.venv\Scripts\activate

   # Activar en macOS/Linux
   source .venv/bin/activate
   ```

b. **Instalar las dependencias de Python:**
   ```bash
   pip install -r requirements.txt
   ```

c. **Inicializar la Base de Datos:**
   Este comando creará el archivo de la base de datos (`DatabaseCanchas.db`) y las tablas necesarias si no existen.
   ```bash
   python database/mapeoCanchas.py
   ```

### 3. Configuración del Frontend (React)

a. **Navegar al directorio del frontend:**
   ```bash
   cd frontend-react
   ```

b. **Instalar las dependencias de Node.js:**
   ```bash
   npm install
   ```

## ▶️ Cómo Ejecutar la Aplicación

Debes tener dos terminales abiertas: una para el backend y otra para el frontend.

1.  **Ejecutar el Backend (Servidor de Flask):**
    - Asegúrate de tener el entorno virtual de Python activado.
    - Desde la **raíz del proyecto**, ejecuta:
      ```bash
      python backend/app.py
      ```
    - El servidor backend estará corriendo en `http://127.0.0.1:5000`.

2.  **Ejecutar el Frontend (Servidor de Vite):**
    - En la otra terminal, navega al directorio `frontend-react`.
    - Ejecuta:
      ```bash
      npm run dev
      ```
    - La aplicación web estará disponible en `http://localhost:5173` (o la URL que indique Vite en la terminal).

## 📂 Estructura del Proyecto

```
TPI_DAO_G5_4K1/
├── backend/              # Contiene toda la lógica del servidor Flask y la API.
│   ├── app.py            # Punto de entrada de la aplicación Flask.
│   ├── database.py       # Configuración de la conexión a la BD.
│   └── models.py         # Modelos de datos de SQLAlchemy.
├── database/             # Scripts y archivos relacionados con la BD.
│   ├── mapeoCanchas.py   # Script para inicializar la BD.
│   └── DatabaseCanchas.db # Archivo de la base de datos SQLite (ignorado por Git).
├── frontend-react/       # Contiene la aplicación de React.
│   ├── src/              # Código fuente del frontend.
│   └── package.json      # Dependencias y scripts del frontend.
├── .gitignore            # Archivos y carpetas ignorados por Git.
├── requirements.txt      # Dependencias de Python para el backend.
└── README.md             # Este archivo.
```