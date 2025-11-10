import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Props:
// - show: boolean
// - onClose: () => void
// - createUser: boolean (default: true) -> if true, creates /api/usuarios then /api/clientes; otherwise only /api/clientes
// - onSuccess: (clienteData) => void  optional callback
export default function RegisterModal({ show, onClose, createUser = true, onSuccess }){
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/tipos-documento')
        if(!mounted) return
        if(!res.ok) throw new Error('No se pudieron cargar los tipos')
        const data = await res.json()
        setTipos(Array.isArray(data) ? data : [])
      }catch(e){
        setError(e.message || String(e))
      }finally{ if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [])

  if(!show) return null

  async function handleSubmit(e){
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.target)
    const payloadCliente = {
      idTipoDoc: fd.get('idTipoDoc') ? Number(fd.get('idTipoDoc')) : null,
      numeroDoc: fd.get('numeroDoc') ? Number(fd.get('numeroDoc')) : null,
      nombre: fd.get('nombre') || '',
      apellido: fd.get('apellido') || '',
      telefono: fd.get('telefono') || '',
      mail: fd.get('mail') || ''
    }

    try{
      let idUsuario = null
      if(createUser){
        const usuario = fd.get('usuario')
        const contrasena = fd.get('contrasena')
        if(!usuario || !contrasena) throw new Error('Usuario y contraseña requeridos')
        const uResp = await fetch('/api/usuarios', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ usuario, contrasena, permiso: 2 })
        })
        if(!uResp.ok){
          const err = await uResp.json().catch(()=>({}));
          throw new Error(err.error || 'No se pudo crear usuario')
        }
        const uData = await uResp.json()
        idUsuario = uData.idUsuario
      }

      // now create cliente
      const clientePayload = { ...payloadCliente }
      if(idUsuario) clientePayload.idUsuario = idUsuario

      const cResp = await fetch('/api/clientes', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(clientePayload)
      })
      if(!cResp.ok){
        const err = await cResp.json().catch(()=>({}));
        throw new Error(err.error || 'No se pudo crear cliente')
      }
      const cData = await cResp.json()

      // If createUser === false (client-only flow), persist session and navigate (previous Home behavior)
      try{
        localStorage.setItem('user', JSON.stringify({ idCliente: cData.idCliente, nombre: cData.nombre, apellido: cData.apellido }))
      }catch(e){ /* ignore */ }

      setSubmitting(false)
      if(onSuccess) onSuccess(cData)
      // Default behavior: close modal and navigate to dashboard when client-only
      onClose && onClose()
      if(!createUser){ navigate('/dashboard') }
    }catch(err){
      console.error(err)
      alert('Error al registrar: ' + (err.message || String(err)))
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose && onClose()}>
      <div className="modal modal-register" onClick={e => e.stopPropagation()}>
        <div className="modal-banner" />
        <div className="modal-body">
          <h2>{createUser ? 'Crear Cuenta' : 'Registro de Cliente'}</h2>
          <form className="register-form" onSubmit={handleSubmit}>
            {createUser && (
              <>
                <div className="row">
                  <label>Usuario</label>
                  <input name="usuario" required />
                </div>
                <div className="row">
                  <label>Contraseña</label>
                  <input name="contrasena" type="password" required />
                </div>
              </>
            )}

            <div className="row">
              <label>Tipo Documento</label>
              {loading ? (
                <div>Cargando...</div>
              ) : error ? (
                <div style={{color:'crimson'}}>Error cargando tipos: {error}</div>
              ) : tipos.length === 0 ? (
                <div>No hay tipos disponibles</div>
              ) : (
                <select name="idTipoDoc" defaultValue={tipos[0]?.idTipoDoc || ''} required>
                  <option value="">Seleccione...</option>
                  {tipos.map(t => (<option key={t.idTipoDoc} value={t.idTipoDoc}>{t.nombre}</option>))}
                </select>
              )}
            </div>

            <div className="row">
              <label>Número Documento</label>
              <input name="numeroDoc" type="number" />
            </div>
            <div className="row">
              <label>Nombre</label>
              <input name="nombre" />
            </div>
            <div className="row">
              <label>Apellido</label>
              <input name="apellido" />
            </div>
            <div className="row">
              <label>Teléfono</label>
              <input name="telefono" />
            </div>
            <div className="row">
              <label>Email</label>
              <input name="mail" type="email" />
            </div>

            <div className="actions">
              <button type="button" className="btn btn-outline" onClick={() => onClose && onClose()}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : (createUser ? 'Crear cuenta' : 'Registrarme')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
