import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Login(){
  const [showModal, setShowModal] = useState(false)
  const [tipos, setTipos] = useState([])
  const [loadingTipos, setLoadingTipos] = useState(true)
  const [tiposError, setTiposError] = useState(null)

  useEffect(() => {
    // Cargar tipos de documento para el select
    fetch('/api/tipos-documento')
      .then(r => r.json())
      .then(data => {
        console.log('tipos-documento response:', data)
        setTipos(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error('error fetching tipos-documento', err)
        setTipos([])
        setTiposError(err && err.message ? err.message : String(err))
      })
      .finally(() => setLoadingTipos(false))
  }, [])

  function handleSubmit(e){
    e.preventDefault()
    const fd = new FormData(e.target)
    alert('Login placeholder: ' + fd.get('usuario'))
    // TODO: POST to /api/login
  }

  async function handleRegister(e){
    e.preventDefault()
    const f = new FormData(e.target)
    const usuario = f.get('usuario')
    const contrasena = f.get('contrasena')
    const tipo = parseInt(f.get('idTipoDoc'), 10)
    const numeroDoc = f.get('numeroDoc')
    const nombre = f.get('nombre')
    const apellido = f.get('apellido')
    const telefono = f.get('telefono')
    const mail = f.get('mail')

    if(!usuario || !contrasena){
      alert('Ingrese usuario y contraseña')
      return
    }

    try{
      // 1) Crear usuario con permiso = 2
      const uResp = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({usuario, contrasena, permiso: 2})
      })
      if(!uResp.ok){
        const err = await uResp.json().catch(()=>({}));
        throw new Error(err.error || 'No se pudo crear usuario')
      }
      const uData = await uResp.json()

      // 2) Crear cliente con idUsuario
      const clientePayload = {
        idTipoDoc: tipo,
        numeroDoc: numeroDoc ? Number(numeroDoc) : null,
        nombre,
        apellido,
        telefono,
        mail,
        idUsuario: uData.idUsuario
      }

      const cResp = await fetch('/api/clientes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(clientePayload)
      })
      if(!cResp.ok){
        const err = await cResp.json().catch(()=>({}));
        throw new Error(err.error || 'No se pudo crear cliente')
      }

      alert('Registro exitoso! Ya puedes iniciar sesión')
      setShowModal(false)
    }catch(err){
      console.error(err)
      alert('Error: ' + (err.message || err))
    }
  }

  return (
    <div className="login-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <Link to="/" className="nav-link">Canchas</Link>
            <a className="nav-link" href="#">Contactanos</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="login-bg">
          <img src="/assets/hero.jpg" alt="bg" className="login-bg-img" />
          <div className="login-overlay" />

          <div className="login-hero-content container">
            <h1 className="login-title">BIENVENIDO!</h1>
            <form className="login-form" onSubmit={handleSubmit}>
              <input name="usuario" className="login-input" placeholder="USUARIO" />
              <input name="contrasena" type="password" className="login-input" placeholder="CONTRASEÑA" />
              <div className="login-actions">
                <button className="btn btn-outline" type="submit">INICIAR SESIÓN</button>
                <button className="btn btn-primary" type="button" onClick={()=>setShowModal(true)}>REGISTRARME</button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Crear Cuenta</h2>
            <form className="register-form" onSubmit={handleRegister}>
              <div className="row">
                <label>Usuario</label>
                <input name="usuario" required />
              </div>
              <div className="row">
                <label>Contraseña</label>
                <input name="contrasena" type="password" required />
              </div>
              <div className="row">
                <label>Tipo Documento</label>
                {loadingTipos ? (
                  <div>Cargando...</div>
                ) : tiposError ? (
                  <div style={{color:'crimson'}}>Error cargando tipos: {tiposError}</div>
                ) : tipos.length === 0 ? (
                  <div>No hay tipos disponibles</div>
                ) : (
                  <select name="idTipoDoc" defaultValue={tipos[0]?.idTipoDoc || ''} required>
                    <option value="">Seleccione...</option>
                    {tipos.map(t => (
                      <option key={t.idTipoDoc} value={t.idTipoDoc}>{t.nombre}</option>
                    ))}
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
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
