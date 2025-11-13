"""
Script de migración para actualizar la tabla Pago y crear las nuevas columnas
"""
import sqlite3

def migrar_tabla_pago():
    conn = sqlite3.connect('database/DatabaseCanchas.db')
    cursor = conn.cursor()
    
    try:
        print("=== Iniciando migración de tabla Pago ===\n")
        
        # 1. Agregar columna 'comprobante' si no existe
        try:
            cursor.execute("ALTER TABLE Pago ADD COLUMN comprobante TEXT")
            print("✅ Columna 'comprobante' agregada")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("⚠️ Columna 'comprobante' ya existe")
            else:
                print(f"❌ Error al agregar 'comprobante': {e}")
        
        # 2. Agregar columna 'detalles' si no existe
        try:
            cursor.execute("ALTER TABLE Pago ADD COLUMN detalles TEXT")
            print("✅ Columna 'detalles' agregada")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("⚠️ Columna 'detalles' ya existe")
            else:
                print(f"❌ Error al agregar 'detalles': {e}")
        
        # 3. Agregar columna 'idEmpleado' si no existe
        try:
            cursor.execute("ALTER TABLE Pago ADD COLUMN idEmpleado INTEGER")
            print("✅ Columna 'idEmpleado' agregada")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("⚠️ Columna 'idEmpleado' ya existe")
            else:
                print(f"❌ Error al agregar 'idEmpleado': {e}")
        
        # 4. Renombrar 'montoFinal' a 'monto' si existe
        cursor.execute("PRAGMA table_info(Pago)")
        columnas = [col[1] for col in cursor.fetchall()]
        
        if 'montoFinal' in columnas and 'monto' not in columnas:
            print("\n⚠️ Necesito renombrar 'montoFinal' a 'monto'. Esto requiere recrear la tabla...")
            # En SQLite, renombrar columna requiere recrear la tabla
            # Por simplicidad, vamos a crear un alias en el modelo
            print("ℹ️  Usaremos 'montoFinal' en lugar de renombrar")
        
        conn.commit()
        print("\n✅ Migración completada exitosamente!")
        
        # Mostrar estructura final
        print("\n=== Estructura final de tabla Pago ===")
        cursor.execute("PRAGMA table_info(Pago)")
        for row in cursor.fetchall():
            print(f"  {row[1]}: {row[2]}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    migrar_tabla_pago()
