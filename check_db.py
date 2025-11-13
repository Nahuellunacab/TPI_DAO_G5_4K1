import sqlite3

# Conectar a la base de datos
conn = sqlite3.connect('database/DatabaseCanchas.db')
cursor = conn.cursor()

# Ver estructura de Pago
print("=== Estructura de tabla Pago ===")
cursor.execute('PRAGMA table_info(Pago)')
for row in cursor.fetchall():
    print(row)

print("\n=== Estructura de tabla EstadoPago ===")
cursor.execute('PRAGMA table_info(EstadoPago)')
for row in cursor.fetchall():
    print(row)

print("\n=== Estructura de tabla MetodoPago ===")
cursor.execute('PRAGMA table_info(MetodoPago)')
for row in cursor.fetchall():
    print(row)

print("\n=== Estructura de tabla EstadoReserva ===")
cursor.execute('PRAGMA table_info(EstadoReserva)')
for row in cursor.fetchall():
    print(row)

print("\n=== Estructura de tabla EstadoCancha ===")
cursor.execute('PRAGMA table_info(EstadoCancha)')
for row in cursor.fetchall():
    print(row)

print("\n=== Estructura de tabla EstadoTorneo ===")
cursor.execute('PRAGMA table_info(EstadoTorneo)')
for row in cursor.fetchall():
    print(row)

conn.close()
