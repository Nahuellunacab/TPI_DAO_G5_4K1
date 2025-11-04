import React from 'react'
import { Link } from 'react-router-dom'

export default function Login(){
  function handleSubmit(e){
    e.preventDefault()
    const fd = new FormData(e.target)
    alert('Login placeholder: ' + fd.get('usuario'))
    // TODO: POST to /api/login
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
                <Link className="btn btn-primary" to="/">REGISTRARME</Link>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
