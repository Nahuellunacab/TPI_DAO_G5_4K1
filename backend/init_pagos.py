"""
Script para inicializar estados de pago y métodos de pago en la base de datos
"""
import sys
from pathlib import Path

# Agregar el directorio backend y raíz al path
BACKEND = Path(__file__).resolve().parent
ROOT = BACKEND.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

# Ahora importar
from services.pago_service import inicializar_estados_y_metodos

if __name__ == '__main__':
    print("Inicializando estados y métodos de pago...")
    try:
        resultado = inicializar_estados_y_metodos()
        print(resultado)
        print("\n✅ Inicialización completada!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
