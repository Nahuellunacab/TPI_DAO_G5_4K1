import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'
import CanchaModal from '../components/CanchaModal'
import ConfirmModal from '../components/ConfirmModal'
import Notify from '../components/Notify'
import NewCanchaModalNice from '../components/NewCanchaModalNice'

const SPORT_IMAGES = {
  futbol: '/assets/futbol.jpg',
  tenis: '/assets/tenis.jpeg',
  padel: '/assets/padel.jpg',
  hockey: '/assets/hockey.jpg',
  volley: '/assets/voleyCerrado.jpeg',
  basquet: '/assets/basquet.jpeg'
}

// code-based asset names (in case assets were renamed to codes like t1,t2,f1...)
const CODE_MAP = {
  futbol: ['f1','f2'],
  tenis: ['t1','t2'],
  padel: ['p1','p2'],
  hockey: ['h1','h2'],
  volley: ['v1','v2'],
  basquet: ['b1','b2']
}

export default function Canchas(){
  const [canchas, setCanchas] = useState([])
  const [deportesMap, setDeportesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [activeCanchaId, setActiveCanchaId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [notify, setNotify] = useState(null)
  const [showNewCancha, setShowNewCancha] = useState(false)
  const nav = useNavigate()

  // Check if user is admin (permisos === 3)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      // Only allow admin users (permisos === 3)
      if (!u || Number(u.permisos) !== 3) {
        nav('/dashboard')
        return
      }
      setIsAdmin(true)
    }catch(e){
      nav('/dashboard')
    }
  }, [nav])

  useEffect(()=>{
    async function load(){
      try{
        const [cRes, dRes] = await Promise.all([
          fetch('/api/canchas'),
          fetch('/api/deportes')
        ])
    if (!cRes.ok) throw new Error('No se pudieron obtener canchas')
    if (!dRes.ok) throw new Error('No se pudieron obtener deportes')
    const rows = await cRes.json()
    const deportes = await dRes.json()
    const map = {}
    for(const d of deportes) map[String(d.idDeporte)] = d.nombre
    setDeportesMap(map)
    setCanchas(rows)
      }catch(e){
        console.error('load canchas', e)
        setCanchas([])
      }finally{ setLoading(false) }
    }
    load()
  },[])

  function imageCandidatesForCancha(c){
    const list = []
      // Prefer the backend-served image endpoint for this cancha (will resolve uploads/assets/remote)
      try{ if (c && c.idCancha) list.push(`/api/canchas/${c.idCancha}/imagen`) }catch(e){}
      // If the cancha record has an explicit imagen string, keep it as a candidate too
      try{ if (c && c.imagen) list.push(c.imagen) }catch(e){}
    try{
      const raw = String(c.nombre || '').trim()
      if (raw){
        const safe = raw.replace(/\s+/g, '')
        list.push(`/assets/${safe}.jpg`, `/assets/${safe}.jpeg`, `/assets/${safe}.png`)
        const low = safe.toLowerCase()
        if (low !== safe) list.push(`/assets/${low}.jpg`, `/assets/${low}.jpeg`)
      }
    }catch(e){/* ignore */}
    // sport-image fallback
    try{
      const nombreDeporte = deportesMap[String(c.deporte)] || ''
      const key = String(nombreDeporte).toLowerCase()
      // try code-based asset names for known deportes
      const normalized = key.normalize('NFD').replace(/[^\w\s-]/g,'')
      if (normalized && CODE_MAP[normalized]){
        const codes = CODE_MAP[normalized]
        for(const code of codes){
          list.push(`/assets/${code}.jpg`, `/assets/${code}.jpeg`, `/assets/${code}.png`)
          // also try uppercase variant (assets folder may use uppercase filenames)
          const up = String(code).toUpperCase()
          if (up !== code) list.push(`/assets/${up}.jpg`, `/assets/${up}.jpeg`, `/assets/${up}.png`)
        }
      }
      if (key && SPORT_IMAGES[key]) list.push(SPORT_IMAGES[key])
    }catch(e){/* ignore */}
    // final fallback(s)
    list.push('/assets/placeholder.jpg')
    // remove duplicates while preserving order
    return Array.from(new Set(list))
  }

  return (
    <div className="canchas-root">
      <header className="site-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
          </div>
          <nav className="nav">
               <div className="header-actions">
               <Link to="/dashboard" className="nav-link btn-calendar">Calendario</Link>
               <Link to="/proximas-reservas" className="nav-link btn-reservas">Próximas Reservas</Link>
               {isAdmin && (
                 <>
                   <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
                   <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
                   <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                   <Link to="/pagos" className="nav-link btn-perfil">Ingresos</Link>
                   <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
                 </>
               )}
               <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
               <button
                 className="btn btn-logout"
                 onClick={() => {
                   try { localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('auth'); sessionStorage.removeItem('token') } catch(e) {}
                   nav('/');
                 }}
               >Cerrar Sesión</button>
             </div>
           </nav>
        </div>
      </header>

      <main className="container" style={{padding:20}}>
        <h2 style={{marginTop:12}}>Listado de canchas</h2>
        {loading ? (
          <p>Cargando canchas...</p>
        ) : (
          <div className="sports-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20}}>
            {canchas.map(c => (
              <article
                key={c.idCancha}
                className="sport-card"
                onMouseEnter={() => setHoveredId(c.idCancha)}
                onMouseLeave={() => setHoveredId(null)}
                style={{overflow:'hidden'}}
              >
                <div className="sport-media" style={{position:'relative'}}>
                  <SmartImage candidates={imageCandidatesForCancha(c)} alt={c.nombre} className="thumb-centered" />

                  {/* overlay that darkens on hover and shows action buttons */}
                  <div
                    style={{
                      position:'absolute',
                      inset:0,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8,
                      background: hoveredId === c.idCancha ? 'rgba(0,0,0,0.45)' : 'transparent',
                      color: '#fff',
                      transition: 'background 160ms ease'
                    }}
                  >
                    {hoveredId === c.idCancha && (
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn btn-reserve" onClick={() => setActiveCanchaId(c.idCancha)} style={{background:'#fff', color:'#333'}}>Ver detalles</button>
                        <button
                          className="btn btn-outline"
                          style={{background: c.estado === 2 ? '#2ecc71' : '#c0392b', color:'#fff', border:'none', padding:'8px 12px', borderRadius:6, cursor:'pointer'}}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                          onClick={()=> setConfirmTarget({ id: c.idCancha, nombre: c.nombre, action: c.estado === 2 ? 'enable' : 'disable' }) }
                        >{c.estado === 2 ? 'Habilitar' : 'Inhabilitar'}</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sport-body" style={{padding:'8px 12px'}}>
                  <h3 style={{margin:0, fontSize:16}}>{c.nombre}</h3>
                  <p style={{margin:'6px 0 6px', color:'#666', fontSize:13}}>{deportesMap[String(c.deporte)] || 'Deporte'}</p>
                  <p style={{margin:0, fontSize:13}}>{c.precioHora ? `Precio: $${c.precioHora}` : 'Precio no disponible'}</p>
                </div>
              </article>
            ))}
            {/* Add-card: frame to create a new cancha (placed inside the same grid so it matches thumbnails) */}
            <article 
              className="sport-card" 
              style={{
                display:'flex',
                flexDirection:'column',
                cursor:'pointer',
                border:'none',
                background:'linear-gradient(135deg, #19350C 0%, #687D31 100%)',
                transition:'all 0.3s',
                position:'relative',
                overflow:'hidden'
              }}
              onClick={()=>setShowNewCancha(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                justifyContent:'center',
                flex:1,
                minHeight:'280px',
                padding:'20px'
              }}>
                <div style={{
                  fontSize:80,
                  fontWeight:200,
                  lineHeight:1,
                  color:'white',
                  opacity:0.9,
                  marginBottom:16
                }}>+</div>
                <h3 style={{
                  margin:0,
                  fontSize:18,
                  color:'white',
                  fontWeight:600,
                  letterSpacing:'0.5px'
                }}>Agregar Cancha</h3>
              </div>
            </article>
          </div>
        )}
        {activeCanchaId && (
          <CanchaModal idCancha={activeCanchaId} onClose={() => setActiveCanchaId(null)} />
        )}
        {showNewCancha && (
          <NewCanchaModalNice open={showNewCancha} onClose={()=>setShowNewCancha(false)} onCreated={(c)=>{ setCanchas(prev=>[c,...prev]); setNotify({type:'success', title:'Cancha creada', message:`La cancha "${c.nombre}" fue creada.`}) }} />
        )}
        <ConfirmModal
          open={!!confirmTarget}
          title={confirmTarget && confirmTarget.action === 'enable' ? 'Habilitar cancha' : 'Inhabilitar cancha'}
          message={confirmTarget ? (confirmTarget.action === 'enable' ? `¿Confirma habilitar la cancha "${confirmTarget.nombre}"? Esto cambiará su estado a "activa".` : `¿Confirma inhabilitar la cancha "${confirmTarget.nombre}"? Esto cambiará su estado a "en mantenimiento".`) : ''}
          confirmText={confirmTarget && confirmTarget.action === 'enable' ? 'Habilitar' : 'Inhabilitar'}
          cancelText="Cancelar"
          onCancel={() => setConfirmTarget(null)}
          onConfirm={async ()=>{
            if (!confirmTarget) return
            const id = confirmTarget.id
            const newEstado = confirmTarget.action === 'enable' ? 1 : 2
            try{
              const r = await fetch(`/api/canchas/${id}`, {method:'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({estado: newEstado})})
              if (!r.ok) throw new Error('Error al cambiar estado')
              setCanchas(prev => prev.map(x => x.idCancha === id ? {...x, estado: newEstado} : x))
              setConfirmTarget(null)
              setNotify({ type:'success', title: newEstado === 2 ? 'Cancha inhabilitada' : 'Cancha habilitada', message:`La cancha "${confirmTarget.nombre}" fue actualizada.` })
            }catch(e){ console.error(e); setNotify({ type:'error', title:'Error', message:'No se pudo cambiar el estado de la cancha' }); setConfirmTarget(null) }
          }}
        />
        <Notify open={!!notify} type={notify?.type} title={notify?.title} message={notify?.message} onClose={() => setNotify(null)} />
      </main>
    </div>
  )
}
