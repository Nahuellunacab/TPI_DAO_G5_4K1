"""
Script para inicializar estados de pago y métodos de pago en la base de datos
"""
import sys
from pathlib import Path

# Agregar el directorio raíz al path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ahora importar
from backend.services.pago_service import inicializar_estados_y_metodos

if __name__ == '__main__':
    print("Inicializando estados y métodos de pago...")
    resultado = inicializar_estados_y_metodos()
    print(resultado)
    print("\n✅ Inicialización completada!")
