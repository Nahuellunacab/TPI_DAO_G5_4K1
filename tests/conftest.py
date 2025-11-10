import pytest
from backend.app import create_app
from backend.models.base import Base, engine as real_engine
from sqlalchemy import event, create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope='session')
def app():
    """Fixture para crear y configurar la aplicación Flask para pruebas."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        # Usar una base de datos SQLite en memoria para las pruebas
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    })

    # Crear un nuevo motor de base de datos en memoria para las pruebas
    test_engine = create_engine(
        app.config["SQLALCHEMY_DATABASE_URI"],
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
    
    # Asegurar que la Base de SQLAlchemy use este motor de prueba
    Base.metadata.bind = test_engine
    
    # Crear todas las tablas en la base de datos en memoria
    Base.metadata.create_all(test_engine)

    # Reemplazar la SessionLocal de la aplicación con una que use el motor de prueba
    # Esto es crucial para que las operaciones de DB dentro de la app usen la DB de prueba
    app.session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    yield app

    # Limpiar después de las pruebas
    Base.metadata.drop_all(test_engine)
    test_engine.dispose() # Cerrar el motor de prueba

@pytest.fixture(scope='function')
def client(app):
    """Fixture para obtener un cliente de prueba de la aplicación Flask."""
    return app.test_client()

@pytest.fixture(scope='function')
def session(app):
    """Fixture para una sesión de base de datos por cada prueba."""
    # Conectar a la base de datos en memoria
    connection = app.session_local().bind.connect() # Usar el SessionLocal de la app de prueba
    transaction = connection.begin()
    session = app.session_local(bind=connection) # Usar el SessionLocal de la app de prueba

    # Configurar la sesión para que haga rollback después de cada prueba
    # Esto asegura que cada prueba comience con un estado de DB limpio
    @event.listens_for(session, "after_transaction_end")
    def reset_session(session, transaction):
        if transaction.nested and not transaction.parent.in_progress:
            # Si es una transacción anidada y la padre no está en progreso,
            # significa que la transacción anidada ha terminado, pero la padre
            # aún no. No hacer nada aquí.
            pass
        elif not transaction.nested:
            # Si no es anidada, o es la transacción padre, hacer rollback
            session.expire_all()
            transaction.rollback()
            connection.close()

    yield session

    # Cerrar la sesión y la conexión
    session.close()
    connection.close()
