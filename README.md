# TPI_DAO_G5_4K1
Trabajo Práctico Integrador de materia Desarrollo de Aplicaciones con Objetos

## Stack 
Web? -> Flask + SQLite/MySQL + Flet o React

## Opcion de Stack  (gpt)

| Capa                             | Tecnología                                                       | Descripción y justificación                                                                                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lenguaje principal**           | **Python 3.12**                                                  | Lenguaje multiparadigma y de uso masivo, alineado con los resultados de aprendizaje RA1, RA2 y RA3 definidos por la cátedra. Permite aplicar programación orientada a objetos y patrones de diseño.                                                                                                |
| **Framework backend**            | **Flask**                                                        | Microframework liviano que facilita la creación de aplicaciones web modulares, con separación clara entre lógica de negocio, rutas y vistas. Permite integrar patrones de diseño como *Factory* y *Singleton* en la arquitectura.                                                                  |
| **Base de datos**                | **SQLite** (en etapa de desarrollo) / **MySQL** (en etapa final) | Sistema de base de datos relacional compatible con SQL estándar. Se utiliza para almacenar de forma persistente las entidades principales del dominio (Clientes, Canchas, Reservas, Pagos, etc.).                                                                                                  |
| **ORM**                          | **SQLAlchemy**                                                   | Biblioteca que facilita el mapeo objeto-relacional (ORM), permitiendo que cada clase de Python represente una tabla de la base de datos. Simplifica la implementación de la capa de persistencia y favorece la reutilización del código.                                                           |
| **Interfaz de usuario**          | **Flet (Python)**                                                | Framework moderno para construir interfaces web reactivas directamente desde Python, sin necesidad de JavaScript. Permite crear formularios de ABM, listados, filtros y gráficos interactivos, cumpliendo con la unidad 3 del programa.                                                            |
| **Gráficos y reportes**          | **Matplotlib / Pandas**                                          | Se emplean para generar reportes tabulares y gráficos estadísticos (por ejemplo, utilización mensual de canchas o canchas más reservadas), cumpliendo los requerimientos del caso de estudio.                                                                                                      |
| **Patrones de diseño aplicados** | *Singleton*, *Factory*, *Strategy*, *Iterator*                   | - *Singleton*: para la conexión a la base de datos.<br>- *Factory*: para la creación controlada de entidades (Reserva, Pago, Cliente, etc.).<br>- *Strategy*: para definir distintos métodos de pago o validaciones de reserva.<br>- *Iterator*: para recorrer colecciones de reservas o reportes. |

### Justificación general
El stack propuesto permite cumplir integralmente con los requerimientos del Trabajo Práctico Integrador, garantizando:
- La aplicación del paradigma orientado a objetos en todas las capas del sistema.
- La implementación de patrones de diseño GoF, tal como exige la unidad 4 del programa.
- La persistencia de datos en una base relacional, asegurando integridad y consistencia.
- La generación de interfaces gráficas y reportes estadísticos interactivos.
- Un diseño modular, escalable y fácilmente extensible (por ejemplo, para incluir pagos en línea o gestión de torneos).
En conclusión, el stack Python + Flask + SQLite/MySQL + Flet + SQLAlchemy ofrece un equilibrio ideal entre simplicidad, claridad arquitectónica y cumplimiento de las competencias técnicas requeridas por la materia.
