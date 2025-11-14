import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ManagerCalendar from './ManagerCalendar'
import SmartImage from '../components/SmartImage'
// code-based asset names (match assets/ folder which uses codes like F1, T1...)
const CODE_MAP = {
  futbol: ['F1','F2'],
  tenis: ['T1','T2'],
  padel: ['P1','P2'],
  hockey: ['H1','H2'],
  volley: ['V1','V2'],
  basquet: ['B1','B2']
}

const SPORTS_VISUALS = [
  { title: 'Futbol', img: '/assets/futbol.jpg', subtitle: 'Canchas de futbol abiertas y techadas.' },
  { title: 'Tenis', img: '/assets/tenis.jpeg', subtitle: 'Canchas de tenis abiertas o techadas.' },
  { title: 'Padel', img: '/assets/padel.jpg', subtitle: 'Canchas de padel abiertas o techadas.' },
  { title: 'Hockey', img: '/assets/hockey.jpg', subtitle: 'Cancha de hockey sin techar.' },
  { title: 'Volley', img: '/assets/voleyCerrado.jpeg', subtitle: 'Cancha de volley techada o tipo playera abierta.' },
  { title: 'Basquet', img: '/assets/basquet.jpeg', subtitle: 'Canchas de basquet al aire libre o techadas.' }
]

export default function Dashboard(){
  const navigate = useNavigate()
  // Check user permissions
  let userPermisos = null
  try {
    const raw = localStorage.getItem('user')
    const u = raw ? JSON.parse(raw) : null
    if (u) {
      userPermisos = Number(u.permisos)
      // If user has permiso == 2 (manager) or 3 (admin), show manager calendar instead of sports grid
      if (userPermisos === 2 || userPermisos === 3){
        return <ManagerCalendar />
      }
    }
  } catch(e) {
    // ignore and fall back to normal dashboard
  }
  function handleLogout(){
    try {
      // Clear common auth storage keys if present
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('auth')
      sessionStorage.removeItem('token')
      // Optionally clear all (uncomment if desired)
      // localStorage.clear()
    } finally {
      // Navigate to home/login regardless of current page
      navigate('/')
    }
  }
  return (
    <div className="dashboard-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
              <Link to="/mis-reservas" className="nav-link btn-reservas">Mis Reservas</Link>
              {userPermisos === 3 && (
                <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
              )}
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container dashboard-main">
        <h2 className="dashboard-title">Elija el deporte para el que desea alquilar la cancha</h2>

        <div className="sports-grid">
          {SPORTS_VISUALS.map(s => {
            const slug = s.title.toLowerCase()
            return (
              <Link key={s.title} to={`/deporte/${slug}`} className="sport-card-link">
                <article className="sport-card">
                  <div className="sport-media">
                    {(() => {
                      const candidates = [s.img, `/assets/${slug}.jpg`, `/assets/${slug}.jpeg`]
                      const codes = CODE_MAP[slug] || []
                      for(const c of codes){ candidates.push(`/assets/${c}.jpg`, `/assets/${c}.jpeg`, `/assets/${c}.png`) }
                      candidates.push('/assets/placeholder.jpg')
                      return <SmartImage candidates={candidates} alt={s.title} className="thumb-centered" />
                    })()}
                  </div>
                  <div className="sport-body">
                    <h3>{s.title}</h3>
                    <p>{s.subtitle}</p>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>

        <div className="dashboard-footer">
          <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
        </div>
      </main>
    </div>
  )
}

