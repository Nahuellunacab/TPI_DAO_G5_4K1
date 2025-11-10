import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import RegisterModal from '../components/RegisterModal'

export default function Home(){
  const [showRegister, setShowRegister] = useState(false)
  const [notify, setNotify] = useState({show:false, title:'', message:'', variant:'info'})

  function closeNotify(){ setNotify({show:false, title:'', message:'', variant:'info'}) }

  return (
    <div className="home-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
        </div>
      </header>

      <main>
        <section className="hero">
          <img src="/assets/hero.jpg" alt="hero" className="hero-img" />
          <div className="hero-overlay" />
          <div className="hero-content container">
            {/* logo above title */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
              <img src="/assets/logo.png" alt="logo" style={{width:84, height:84, objectFit:'contain'}} />
              <h1 className="title">GoField</h1>
            </div>
            <div className="hero-actions">
              <button onClick={()=>setShowRegister(true)} className="btn btn-primary">Registrarme</button>
              <Link to="/login" className="btn btn-outline">Iniciar Sesión</Link>
            </div>
          </div>
        </section>
      </main>

  <RegisterModal show={showRegister} onClose={() => setShowRegister(false)} createUser={true} onSuccess={() => { setShowRegister(false); setNotify({show:true, title:'Registro exitoso', message:'Ya puedes iniciar sesión', variant:'success'}) }} />

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
            <a href="#">Reservar</a>
            <a href="#">Contactanos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
