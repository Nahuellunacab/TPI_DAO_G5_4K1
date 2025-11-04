import React from 'react'
import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <div className="home-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <a href="#" className="nav-link">Reservar</a>
            <a href="#" className="nav-link">Contactanos</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <img src="/assets/hero.jpg" alt="hero" className="hero-img" />
          <div className="hero-overlay" />
          <div className="hero-content container">
            <h1 className="title">GoField</h1>
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary">Reserva Ya</Link>
              <Link to="/login" className="btn btn-outline">Iniciar Sesión</Link>
            </div>
          </div>
        </section>
      </main>

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
