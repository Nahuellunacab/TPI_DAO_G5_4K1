import sqlite3
import os

# Probar ambas bases de datos
db_paths = [
    os.path.join(os.path.dirname(__file__), '..', 'database', 'mapeoCanchas.db'),
    os.path.join(os.path.dirname(__file__), '..', 'database', 'DatabaseCanchas.db')
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"Base de datos no encontrada: {db_path}")
        continue
    
    print(f"\n{'='*60}")
    print(f"Base de datos: {os.path.basename(db_path)}")
    print('='*60)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ver si existe la tabla Partido
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Partido'")
    if cursor.fetchone():
        print("\nColumnas de la tabla Partido:")
        cursor.execute("PRAGMA table_info(Partido)")
        columns = cursor.fetchall()
        
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # Ver cuántos registros hay
        cursor.execute("SELECT COUNT(*) FROM Partido")
        count = cursor.fetchone()[0]
        print(f"\nNúmero de partidos: {count}")
    else:
        print("  La tabla Partido NO existe")

    conn.close()
