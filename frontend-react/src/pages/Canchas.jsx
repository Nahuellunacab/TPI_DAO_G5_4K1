import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'
import CanchaModal from '../components/CanchaModal'

const SPORT_IMAGES = {
  futbol: '/assets/futbol.jpg',
  tenis: '/assets/tenis.jpeg',
  padel: '/assets/padel.jpg',
  hockey: '/assets/hockey.jpg',
  volley: '/assets/voleyCerrado.jpeg',
  basquet: '/assets/basquet.jpeg'
}

export default function Canchas(){
  const [canchas, setCanchas] = useState([])
  const [deportesMap, setDeportesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [activeCanchaId, setActiveCanchaId] = useState(null)
  const nav = useNavigate()

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
      if (key && SPORT_IMAGES[key]) list.push(SPORT_IMAGES[key])
    }catch(e){/* ignore */}
    // final fallback(s)
    list.push('/assets/placeholder.jpg')
    return list
  }

  return (
    <div className="canchas-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/canchas" className="nav-link">Canchas</Link>
              <Link to="/mis-reservas" className="nav-link btn-reservas">Próximas Reservas</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
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
                  <SmartImage candidates={imageCandidatesForCancha(c)} alt={c.nombre} style={{width:'100%', height:240, objectFit:'cover', display:'block'}} />

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
                          style={{background:'#c0392b', color:'#fff', border:'none', padding:'8px 12px', borderRadius:6, cursor:'pointer'}}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                          onClick={async ()=>{
                            if(!confirm(`Confirmar inhabilitar la cancha ${c.nombre}?`)) return
                            try{
                              const r = await fetch(`/api/canchas/${c.idCancha}`, {method:'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({estado: 2})})
                              if (!r.ok) throw new Error('Error al inhabilitar')
                              // optimistic update
                              setCanchas(prev => prev.map(x => x.idCancha === c.idCancha ? {...x, estado: 2} : x))
                              alert('Cancha inhabilitada')
                            }catch(e){ console.error(e); alert('No se pudo inhabilitar la cancha') }
                          }}
                        >Inhabilitar</button>
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
          </div>
        )}
        {activeCanchaId && (
          <CanchaModal idCancha={activeCanchaId} onClose={() => setActiveCanchaId(null)} />
        )}
      </main>
    </div>
  )
}
