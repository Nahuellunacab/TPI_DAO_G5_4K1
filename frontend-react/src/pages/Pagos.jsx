import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles.css';

/**
 * Página de administración de pagos
 * Muestra todos los pagos, pendientes y permite cambiar estados
 */
export default function Pagos() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'pagados', 'pendientes'
  const [busqueda, setBusqueda] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar todos los pagos
      const resPagos = await fetch('/api/pagos/todos');
      if (resPagos.ok) {
        const dataPagos = await resPagos.json();
        setPagos(dataPagos);
      }

      // Cargar reservas pendientes de pago
      const resPendientes = await fetch('/api/pagos/pendientes');
      if (resPendientes.ok) {
        const dataPendientes = await resPendientes.json();
        setPagosPendientes(dataPendientes);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('❌ Error al cargar los datos de pagos');
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoPago = async (idPago, nuevoEstado) => {
    if (!confirm(`¿Confirmar cambio de estado a "${nuevoEstado}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/pagos/${idPago}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (response.ok) {
        alert('✅ Estado actualizado correctamente');
        cargarDatos();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('❌ Error de conexión');
    }
  };

  const pagosFiltrados = pagos.filter(pago => {
    // Filtro por estado
    if (filtro === 'pagados' && pago.estadoNombre !== 'Pagado') return false;
    if (filtro === 'pendientes' && pago.estadoNombre !== 'Pendiente') return false;

    // Filtro por búsqueda
    if (busqueda) {
      const search = busqueda.toLowerCase();
      const cliente = pago.cliente ? 
        `${pago.cliente.nombre} ${pago.cliente.apellido}`.toLowerCase() : '';
      const monto = pago.monto.toString();
      const metodo = (pago.metodoPagoNombre || '').toLowerCase();
      
      return cliente.includes(search) || monto.includes(search) || metodo.includes(search);
    }

    return true;
  });

  const calcularTotales = () => {
    const total = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const pagados = pagos
      .filter(p => p.estadoNombre === 'Pagado')
      .reduce((sum, p) => sum + (p.monto || 0), 0);
    // Solo contar reservas que NO tienen pago registrado
    const pendientes = pagosPendientes.reduce((sum, r) => sum + (r.monto || 0), 0);
    
    return { total, pagados, pendientes };
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>⏳ Cargando datos de pagos...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <header className="site-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
          </div>
          <nav className="nav">
            <div className="header-actions">
              <Link to="/dashboard" className="nav-link btn-calendar">Calendario</Link>
              <Link to="/proximas-reservas" className="nav-link btn-calendar">Próximas Reservas</Link>
              <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
              <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
              <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
              <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
              <Link to="/pagos" className="nav-link btn-perfil">Ingresos</Link>
              <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '120px', paddingBottom: '60px', maxWidth: '1400px', margin: '0 auto', padding: '120px 20px 60px' }}>
        <h1 style={{ marginBottom: '20px', color: '#1e293b' }}>💰 Gestión de Ingresos</h1>

      {/* Tarjeta de resumen */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '20px',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          minWidth: '300px'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 Total de Ingresos</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>
            ${totales.total.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            {pagos.length} pagos registrados
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div style={{ 
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filtrar:</label>
            <select 
              value={filtro} 
              onChange={(e) => setFiltro(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '14px'
              }}
            >
              <option value="todos">Todos</option>
              <option value="pagados">Pagados</option>
              <option value="pendientes">Pendientes</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="🔍 Buscar por cliente, monto o método..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            onClick={cargarDatos}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fecha Pago</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reserva</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Monto</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Método</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No hay pagos para mostrar
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map((pago) => (
                  <tr 
                    key={pago.idPago}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '12px' }}>#{pago.idPago}</td>
                    <td style={{ padding: '12px' }}>
                      {new Date(pago.fechaPago).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {pago.cliente ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>
                            {pago.cliente.nombre} {pago.cliente.apellido}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {pago.cliente.mail}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      #{pago.idReserva}
                      {pago.fechaReservada && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(pago.fechaReservada).toLocaleDateString('es-AR')}
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: '#059669'
                    }}>
                      ${pago.monto.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {pago.metodoPagoNombre || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: pago.estadoNombre === 'Pagado' ? '#d1fae5' :
                                   pago.estadoNombre === 'Pendiente' ? '#fef3c7' :
                                   pago.estadoNombre === 'Cancelado' ? '#fee2e2' :
                                   '#fce7f3',
                        color: pago.estadoNombre === 'Pagado' ? '#065f46' :
                               pago.estadoNombre === 'Pendiente' ? '#92400e' :
                               pago.estadoNombre === 'Cancelado' ? '#991b1b' :
                               '#9f1239'
                      }}>
                        {pago.estadoNombre}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              cambiarEstadoPago(pago.idPago, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            cursor: 'pointer',
                            background: 'white'
                          }}
                        >
                          <option value="" disabled>Cambiar estado</option>
                          <option value="Pagado">✅ Pagado</option>
                          <option value="Pendiente">⏳ Pendiente</option>
                          <option value="Cancelado">❌ Cancelado</option>
                          <option value="Reembolsado">↩️ Reembolsado</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección de reservas pendientes de pago */}
      {pagosPendientes.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ marginBottom: '20px', color: '#dc2626' }}>
            ⚠️ Reservas Pendientes de Pago ({pagosPendientes.length})
          </h2>
          
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#fef3c7', borderBottom: '2px solid #fde047' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Reserva</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosPendientes.map((reserva) => (
                    <tr 
                      key={reserva.idReserva}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '12px' }}>#{reserva.idReserva}</td>
                      <td style={{ padding: '12px' }}>
                        {reserva.cliente ? (
                          <div>
                            <div style={{ fontWeight: '500' }}>
                              {reserva.cliente.nombre} {reserva.cliente.apellido}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {reserva.cliente.mail}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {new Date(reserva.fechaReservada).toLocaleDateString('es-AR')}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#dc2626'
                      }}>
                        ${reserva.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
