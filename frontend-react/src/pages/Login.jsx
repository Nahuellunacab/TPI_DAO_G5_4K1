import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RegisterModal from '../components/RegisterModal'

export default function Login(){
  const [showModal, setShowModal] = useState(false)
  const [notify, setNotify] = useState({show:false, title:'', message:'', variant:'info'})

  function handleSubmit(e){
    e.preventDefault()
    const fd = new FormData(e.target)
    const usuario = fd.get('usuario')
    const contrasena = fd.get('contrasena')
    if(!usuario || !contrasena){
      alert('Ingrese usuario y contraseña')
      return
    }
    // Try a simple auth flow against backend users list (development only).
    // We fetch /api/usuarios, match usuario+contrasena (plain text) and then
    // try to find a Cliente linked to that usuario (idUsuario).
    (async ()=>{
      try{
        const uRes = await fetch('/api/usuarios')
        if (!uRes.ok) throw new Error('No se pudo leer usuarios')
        const users = await uRes.json()
        const match = Array.isArray(users) ? users.find(u => String(u.usuario) === String(usuario) && String(u.contrasena) === String(contrasena)) : null
        if (!match){
          alert('Usuario o contraseña incorrectos')
          return
        }
        // Find client for this user
        let cliente = null
        try{
          const cRes = await fetch('/api/clientes')
          if (cRes.ok){
            const clients = await cRes.json()
            cliente = Array.isArray(clients) ? clients.find(c => Number(c.idUsuario) === Number(match.idUsuario)) : null
          }
        }catch(e){ /* ignore */ }

        // Build session object and persist in localStorage
        const sessionObj = {
          idUsuario: match.idUsuario,
          usuario: match.usuario,
          permisos: match.permisos,
          // include cliente fields if present for easy access
          ...(cliente ? { idCliente: cliente.idCliente, nombre: cliente.nombre, apellido: cliente.apellido, numeroDoc: cliente.numeroDoc, idTipoDoc: cliente.idTipoDoc } : {})
        }
        try{ localStorage.setItem('user', JSON.stringify(sessionObj)); }catch(e){ console.warn('No se pudo guardar sesión', e) }
        navigate('/dashboard')
      }catch(err){
        console.error(err)
        alert('Error al iniciar sesión')
      }
    })()
  }

  const navigate = useNavigate()

  // onSuccess handler for the shared RegisterModal
  function handleRegisterSuccess(clienteData){
    setNotify({show:true, title: 'Registro exitoso', message: 'Ya puedes iniciar sesión', variant: 'success'})
    setShowModal(false)
  }

  function closeNotify(){ setNotify({show:false, title:'', message:'', variant:'info'}) }

  return (
    <div className="login-root">
      <header className="site-header">
        <div className="container header-inner">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <img src="/assets/logo.png" alt="logo" className="logo" />
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
            </Link>
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
      <RegisterModal show={showModal} onClose={() => setShowModal(false)} createUser={true} onSuccess={handleRegisterSuccess} />
      {notify.show && (
        <div className="notify-overlay" onClick={closeNotify}>
          <div className={`notify-box ${notify.variant || ''}`} onClick={e=>e.stopPropagation()}>
            <div className="notify-title">{notify.title}</div>
            <div className="notify-message">{notify.message}</div>
            <div className="notify-actions">
              <button className="notify-btn close" onClick={closeNotify} style={{marginRight:8}}>Cerrar</button>
              <button className="notify-btn" onClick={closeNotify}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="brand">
            <img src="/assets/logo.png" alt="logo" className="logo-small" />
            <span>GoField</span>
          </div>
          <div className="footer-links">
            <p style={{ margin: 0, color: '#666' }}>
              Contacto: <a href="mailto:gofield78@gmail.com" style={{ color: 'var(--verde-oscuro)', textDecoration: 'none' }}>gofield78@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
