import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'

// Centralizar la lista de deportes y sus imágenes para que coincida con assets
const SPORT_DATA = {
  futbol: { title: 'Futbol', imgs: ['/assets/futbol.jpg','/assets/futbolCerrado.jpeg'] },
  tenis: { title: 'Tenis', imgs: ['/assets/tenis.jpeg', '/assets/tenisCerrado.jpeg'] },
  padel: { title: 'Padel', imgs: ['/assets/padel.jpg', '/assets/padelCerrado.jpeg'] },
  hockey: { title: 'Hockey', imgs: ['/assets/hockey.jpg'] },
  volley: { title: 'Volley', imgs: ['/assets/voleyCerrado.jpeg','/assets/volleyPlaya.jpeg'] },
  basquet: { title: 'Basquet', imgs: ['/assets/basquet.jpeg','/assets/basquetCerrado.jpeg'] }
}

// Mapping to match DB naming convention: left image -> code[0] (F1), right -> code[1] (F2)
// We'll include uppercase variants when building candidates.
const CANCHA_CODE_MAP = {
  futbol: ['F1', 'F2'],
  tenis: ['T1', 'T2'],
  padel: ['P1', 'P2'],
  hockey: ['H1', 'H2'],
  volley: ['V1', 'V2'],
  basquet: ['B1', 'B2']
}

export default function SportDetail(){
  const { slug } = useParams()
  const navigate = useNavigate()
  const data = SPORT_DATA[slug]
  const [canchas, setCanchas] = useState([])
  const [estadosMap, setEstadosMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/canchas')
        if (!res.ok) throw new Error('No se pudo obtener canchas')
        const rows = await res.json()
        setCanchas(rows)
        // try to build estados map if the response contains estado names
        try{
          const eRes = await fetch('/api/estado-canchas')
          if (eRes.ok){
            const er = await eRes.json()
            const emap = {}
            for(const ee of er) emap[String(ee.idEstado || ee.idEstadoCancha || ee.id || ee.idestado)] = ee.nombre || ee.name
            setEstadosMap(emap)
          }
        }catch(e){/* ignore */}
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Find cancha by sport + index (0 = left / first, 1 = right / second)
  function findCanchaForSlugIndex(slug, index) {
    const codes = CANCHA_CODE_MAP[slug] || []
    const code = codes[index] || codes[0] || null
    if (!code) return null
    return canchas.find(c => c.nombre && c.nombre.toString().toLowerCase() === code.toLowerCase()) || null
  }

  // Helper: determine whether a cancha is in maintenance
  function isInMaintenance(c) {
    try{
      if (!c) return false
      // numeric state check (common from API)
      if (c.estado === 2 || String(c.estado) === '2') return true
      // name-based check using provided estadoNombre or map
      const name = c.estadoNombre || estadosMap[String(c.estado)] || ''
      if (name && String(name).toLowerCase().indexOf('mantenimiento') >= 0) return true
    }catch(e){ /* ignore */ }
    return false
  }

  const canchaLeft = canchas.length ? findCanchaForSlugIndex(slug, 0) : null
  const canchaRight = canchas.length ? findCanchaForSlugIndex(slug, 1) : null

  // Label mapping for overlays: left=sin techar, right=techada by default.
  // Special case: volley -> left techada, right playero.
  function getCoverLabel(slug, index) {
    const s = (slug || '').toString().toLowerCase()
    if (s === 'volley') return index === 0 ? 'techada' : 'playero'
    return index === 0 ? 'sin techar' : 'techada'
  }

  if(!data){
    return (
      <div style={{padding:40}}>
        <h2>Deporte no encontrado</h2>
        <p>El deporte solicitado no existe.</p>
        <Link to="/dashboard" className="btn btn-outline btn-back">volver</Link>
      </div>
    )
  }

  const imgs = data.imgs || []

  function candidatesForCanchaAsset(c, fallbackIndex=0){
    const list = []
    try{
      if (c && c.nombre){
        const safe = String(c.nombre).trim().replace(/\s+/g,'')
        list.push(`/assets/${safe}.jpg`, `/assets/${safe}.jpeg`, `/assets/${safe}.png`)
        const low = safe.toLowerCase()
        if (low !== safe) list.push(`/assets/${low}.jpg`)
      }
    }catch(e){/* ignore */}
    if (imgs[fallbackIndex]) list.push(imgs[fallbackIndex])
    // Also try canonical code-based asset names for the sport (e.g. t1, t2, f1)
    try{
      const codes = CANCHA_CODE_MAP[slug] || []
      const code = codes[fallbackIndex]
      if (code){ list.unshift(`/assets/${code}.jpg`, `/assets/${code}.jpeg`, `/assets/${code}.png`) }
    }catch(e){}
    list.push('/assets/placeholder.jpg')
    return list
  }

  return (
    <div className="sport-detail-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <div className="header-actions">
            <Link to="/mis-reservas" className="nav-link btn-reservas">Mis Reservas</Link>
            <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
          </div>
        </div>
      </header>

      <main className="container sport-detail-main">
        <h1 className="sport-title">{data.title}</h1>

        <div className="sport-gallery">
                  {data.title.toLowerCase() === 'hockey' ? (
            <div className="single-photo">
              <SmartImage candidates={candidatesForCanchaAsset(canchaLeft, 0)} alt={data.title} className="thumb-centered" />
              <div className="media-overlay">
                <div className="overlay-content">
                  <h4 className="overlay-title">{getCoverLabel(slug, 0)}</h4>
                  <p className="overlay-price">{canchaLeft ? `${canchaLeft.precioHora} por turno` : 'Precio no disponible'}</p>
                  <div className="overlay-actions">
                      {(() => {
                          try{
                            if (isInMaintenance(canchaLeft)) return (<div style={{color:'#fff'}}>En mantenimiento</div>)
                          }catch(e){}
                          return (<Link to={canchaLeft && canchaLeft.idCancha ? `/reservas?idCancha=${canchaLeft.idCancha}` : '/reservas'} className="btn btn-reserve">Reservar</Link>)
                        })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="photo-col">
                <SmartImage candidates={candidatesForCanchaAsset(canchaLeft, 0)} alt={data.title} className="thumb-centered" />
                <div className="media-overlay">
                  <div className="overlay-content">
                    <h4 className="overlay-title">{getCoverLabel(slug, 0)}</h4>
                    <p className="overlay-price">{canchaLeft ? `${canchaLeft.precioHora} por turno` : 'Precio no disponible'}</p>
                    <div className="overlay-actions">
                      {(() => {
                        try{
                          if (isInMaintenance(canchaLeft)) return (<div style={{color:'#fff'}}>En mantenimiento</div>)
                        }catch(e){}
                        return (<Link to={canchaLeft && canchaLeft.idCancha ? `/reservas?idCancha=${canchaLeft.idCancha}` : '/reservas'} className="btn btn-reserve">Reservar</Link>)
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="photo-col">
                <SmartImage candidates={candidatesForCanchaAsset(canchaRight, 1)} alt={data.title + ' 2'} className="thumb-centered" />
                <div className="media-overlay">
                  <div className="overlay-content">
                    <h4 className="overlay-title">{getCoverLabel(slug, 1)}</h4>
                    <p className="overlay-price">{canchaRight ? `${canchaRight.precioHora} por turno` : 'Precio no disponible'}</p>
                    <div className="overlay-actions">
                      {(() => {
                        try{
                          const estadoKey = canchaRight && (canchaRight.estadoNombre || canchaRight.estado) ? String(canchaRight.estadoNombre ? (canchaRight.estadoNombre) : (estadosMap[String(canchaRight.estado)] || canchaRight.estado)).toLowerCase() : ''
                          if (estadoKey && estadoKey.indexOf('en mantenimiento') >= 0) return (<div style={{color:'#fff'}}>En mantenimiento</div>)
                        }catch(e){}
                        return (<Link to={canchaRight && canchaRight.idCancha ? `/reservas?idCancha=${canchaRight.idCancha}` : '/reservas'} className="btn btn-reserve">Reservar</Link>)
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="detail-actions">
          <Link to="/dashboard" className="btn btn-outline btn-back">volver</Link>
          <button
            className="btn btn-logout"
            onClick={() => {
              // clear possible auth data and return to home
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('auth')
              sessionStorage.removeItem('token')
              navigate('/')
            }}
          >Cerrar Sesión</button>
        </div>
      </main>
    </div>
  )
}

