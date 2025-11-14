import { useState, useEffect } from 'react';
import Notify from './Notify';
import { validarPrecio, validarSeleccion } from '../utils/validations';
import '../styles.css';

/**
 * Modal para registrar pagos de reservas
 * Permite seleccionar método de pago e ingresar detalles adicionales
 */
export default function PagoModal({ isOpen, onClose, reserva, onPagoCreado }) {
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState({ open: false, type: 'success', title: '', message: '' });
  const [errores, setErrores] = useState({});
  const [formData, setFormData] = useState({
    idMetodoPago: '',
    monto: reserva?.monto || 0,
    detalles: ''
  });

  useEffect(() => {
    if (isOpen) {
      cargarMetodosPago();
      // Actualizar el monto cuando cambia la reserva
      if (reserva) {
        setFormData(prev => ({ ...prev, monto: reserva.monto }));
      }
    }
  }, [isOpen, reserva]);

  const cargarMetodosPago = async () => {
    try {
      const response = await fetch('/api/metodos-pago');
      if (response.ok) {
        const data = await response.json();
        setMetodosPago(data);
      }
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrores({});
    
    // Validar método de pago
    const validacionMetodo = validarSeleccion(formData.idMetodoPago, 'un método de pago');
    if (!validacionMetodo.valido) {
      setNotify({
        open: true,
        type: 'error',
        title: 'ERROR',
        message: validacionMetodo.mensaje
      });
      setErrores({ idMetodoPago: validacionMetodo.mensaje });
      return;
    }
    
    // Validar monto
    const validacionMonto = validarPrecio(formData.monto, 0.01);
    if (!validacionMonto.valido) {
      setNotify({
        open: true,
        type: 'error',
        title: 'ERROR',
        message: validacionMonto.mensaje
      });
      setErrores({ monto: validacionMonto.mensaje });
      return;
    }

    setLoading(true);

    try {
      const pagoData = {
        idReserva: reserva.idReserva,
        idMetodoPago: parseInt(formData.idMetodoPago),
        monto: parseFloat(formData.monto),
        detalles: formData.detalles ? { observaciones: formData.detalles } : null
      };

      const response = await fetch('/api/pagos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoData)
      });

      if (response.ok) {
        const pago = await response.json();
        
        // Resetear formulario
        setFormData({ idMetodoPago: '', monto: 0, detalles: '' });
        
        // Notificar al componente padre
        if (onPagoCreado) {
          onPagoCreado(pago);
        }
        
        // Mostrar notificación de éxito
        setNotify({
          open: true,
          type: 'success',
          title: 'PAGO REGISTRADO EXITOSAMENTE',
          message: 'El pago ha sido registrado correctamente en el sistema'
        });
        
        // Cerrar modal después de 1.5 segundos
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setNotify({
          open: true,
          type: 'error',
          title: 'ERROR',
          message: error.error || 'No se pudo registrar el pago'
        });
      }
    } catch (error) {
      console.error('Error al crear pago:', error);
      setNotify({
        open: true,
        type: 'error',
        title: 'ERROR DE CONEXIÓN',
        message: 'No se pudo conectar con el servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <>
      <Notify 
        open={notify.open} 
        type={notify.type} 
        title={notify.title} 
        message={notify.message} 
        onClose={() => setNotify({ ...notify, open: false })} 
      />
      
      <div className="notify-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="notify-box" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <h3 className="notify-title" style={{textTransform:'uppercase'}}>💳 Registrar Pago</h3>
          <button onClick={onClose} style={{border:'none', background:'transparent', color:'rgba(255,255,255,0.9)', fontSize:18, cursor:'pointer'}}>✕</button>
        </div>

        <div>
          {reserva && (
            <div style={{ 
              background: 'rgba(123, 61, 240, 0.15)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid rgba(123, 61, 240, 0.3)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#c4b5fd', fontSize: '14px', fontWeight: '600' }}>
                📋 INFORMACIÓN DE LA RESERVA
              </h4>
              <p style={{ margin: '4px 0', fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Reserva #:</strong> {reserva.idReserva}
              </p>
              {reserva.cliente && (
                <p style={{ margin: '4px 0', fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                  <strong>Cliente:</strong> {reserva.cliente.nombre} {reserva.cliente.apellido}
                </p>
              )}
              <p style={{ margin: '4px 0', fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Fecha:</strong> {new Date(reserva.fechaReservada).toLocaleDateString('es-AR')}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: '#a78bfa', fontWeight: 'bold' }}>
                <strong>Monto Total:</strong> ${reserva.monto?.toFixed(2) || '0.00'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="idMetodoPago" style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '13px', 
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                Método de Pago <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="idMetodoPago"
                name="idMetodoPago"
                value={formData.idMetodoPago}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: errores.idMetodoPago ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.2)',
                  fontSize: '14px',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'rgba(255,255,255,0.95)',
                  outline: 'none'
                }}
              >
                <option value="" style={{ background: '#1f1f1f', color: '#fff' }}>-- Seleccione un método --</option>
                {metodosPago.map(metodo => (
                  <option key={metodo.idMetodoPago} value={metodo.idMetodoPago} style={{ background: '#1f1f1f', color: '#fff' }}>
                    {metodo.descripcion}
                  </option>
                ))}
              </select>
              {errores.idMetodoPago && (
                <small style={{color:'#f87171', fontSize:12, marginTop:4, display:'block'}}>{errores.idMetodoPago}</small>
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="monto" style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '13px', 
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                Monto <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="number"
                id="monto"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: errores.monto ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.2)',
                  fontSize: '14px',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'rgba(255,255,255,0.95)',
                  outline: 'none'
                }}
              />
              {errores.monto && (
                <small style={{color:'#f87171', fontSize:12, marginTop:4, display:'block'}}>{errores.monto}</small>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="detalles" style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '13px', 
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                Observaciones (opcional)
              </label>
              <textarea
                id="detalles"
                name="detalles"
                value={formData.detalles}
                onChange={handleChange}
                rows="3"
                placeholder="Ej: Últimos 4 dígitos de tarjeta, número de transferencia, etc."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '14px',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'rgba(255,255,255,0.95)',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            <div className="notify-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="notify-btn close"
                style={{
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="notify-btn"
                style={{
                  background: loading ? 'rgba(123, 61, 240, 0.5)' : 'linear-gradient(180deg,#7b3df0,#5527c8)', 
                  border: '2px solid rgba(255,255,255,0.12)', 
                  padding: '8px 14px', 
                  boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳ Procesando...' : '💰 Registrar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
