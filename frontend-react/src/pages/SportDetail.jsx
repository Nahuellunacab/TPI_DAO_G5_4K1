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
  const [deportes, setDeportes] = useState([])
  const [estadosMap, setEstadosMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [canchasRes, deportesRes, estadosRes] = await Promise.all([
          fetch('/api/canchas'),
          fetch('/api/deportes'),
          fetch('/api/estado-canchas')
        ])
        
        if (!canchasRes.ok) throw new Error('No se pudo obtener canchas')
        const rows = await canchasRes.json()
        setCanchas(rows)
        
        // Cargar deportes
        if (deportesRes.ok) {
          const deportesData = await deportesRes.json()
          setDeportes(deportesData)
        }
        
        // try to build estados map if the response contains estado names
        try{
          if (estadosRes.ok){
            const er = await estadosRes.json()
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

  // Obtener el ID del deporte según el slug
  const deporteData = deportes.find(d => d.nombre && d.nombre.toLowerCase() === (data?.title || '').toLowerCase())
  const idDeporte = deporteData ? deporteData.idDeporte : null

  // Filtrar canchas por deporte
  const canchasFiltradas = idDeporte 
    ? canchas.filter(c => Number(c.deporte) === Number(idDeporte))
    : []

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

  // Label mapping for overlays: intenta detectar por nombre de cancha o descripción
  function getCoverLabel(cancha) {
    try {
      // Primero intentar usar directamente la descripción de la base de datos
      const desc = (cancha.descripcion || '').trim().toLowerCase()
      
      // Si la descripción es exactamente "techada" o "sin techar", usarla directamente
      if (desc === 'techada' || desc === 'sin techar' || desc === 'playero') {
        return desc
      }
      
      // Si no, buscar palabras clave en descripción y nombre
      const nombre = (cancha.nombre || '').toLowerCase()
      
      // Casos especiales
      if (nombre.includes('playero') || desc.includes('playero') || nombre.includes('playa')) {
        return 'playero'
      }
      if (nombre.includes('tech') || desc.includes('tech') || nombre.includes('cerrad') || desc.includes('cerrad')) {
        return 'techada'
      }
      if (nombre.includes('cubiert') || desc.includes('cubiert')) {
        return 'techada'
      }
      
      // Por defecto
      return 'sin techar'
    } catch(e) {
      return 'sin techar'
    }
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

  function candidatesForCanchaAsset(c){
    const list = []
    
    // Prefer the backend-served image endpoint for this cancha (will resolve uploads/assets/remote)
    try{ 
      if (c && c.idCancha) {
        list.push(`/api/canchas/${c.idCancha}/imagen`)
      }
    }catch(e){/* ignore */}
    
    // If the cancha record has an explicit imagen string, keep it as a candidate too
    try{ 
      if (c && c.imagen) {
        list.push(c.imagen)
      }
    }catch(e){/* ignore */}
    
    // Intentar con el nombre de la cancha
    try{
      if (c && c.nombre){
        const safe = String(c.nombre).trim().replace(/\s+/g,'')
        list.push(`/assets/${safe}.jpg`, `/assets/${safe}.jpeg`, `/assets/${safe}.png`)
        const low = safe.toLowerCase()
        if (low !== safe) {
          list.push(`/assets/${low}.jpg`, `/assets/${low}.jpeg`, `/assets/${low}.png`)
        }
      }
    }catch(e){/* ignore */}
    
    // Fallback a imágenes genéricas del deporte
    const imgs = data?.imgs || []
    imgs.forEach(img => list.push(img))
    
    // También intentar con códigos del deporte
    try{
      const codes = CANCHA_CODE_MAP[slug] || []
      codes.forEach(code => {
        list.push(`/assets/${code}.jpg`, `/assets/${code}.jpeg`, `/assets/${code}.png`)
        // also try uppercase variant (assets folder may use uppercase filenames)
        const up = String(code).toUpperCase()
        if (up !== code) {
          list.push(`/assets/${up}.jpg`, `/assets/${up}.jpeg`, `/assets/${up}.png`)
        }
      })
    }catch(e){/* ignore */}
    
    list.push('/assets/placeholder.jpg')
    
    // remove duplicates while preserving order
    return Array.from(new Set(list))
  }

  return (
    <div className="sport-detail-root">
      <header className="site-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
          </div>
          <div className="header-actions">
            <Link to="/mis-reservas" className="nav-link btn-reservas">Mis Reservas</Link>
            <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
          </div>
        </div>
      </header>

      <main className="container sport-detail-main">
        <h1 className="sport-title">{data.title}</h1>

        {loading ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>Cargando canchas...</div>
        ) : canchasFiltradas.length === 0 ? (
          <div style={{textAlign: 'center', padding: '2rem', color: '#666'}}>
            No hay canchas disponibles para este deporte.
          </div>
        ) : (
          <div className="sport-gallery" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {canchasFiltradas.map((cancha, index) => (
              <div key={cancha.idCancha} className="photo-col" style={{
                gridColumn: canchasFiltradas.length % 2 !== 0 && index === canchasFiltradas.length - 1 ? 'span 1' : 'auto'
              }}>
                <SmartImage candidates={candidatesForCanchaAsset(cancha)} alt={cancha.nombre || data.title} className="thumb-centered" />
                <div className="media-overlay">
                  <div className="overlay-content">
                    <h4 className="overlay-title">{cancha.nombre || `Cancha ${index + 1}`}</h4>
                    <p className="overlay-subtitle" style={{fontSize: '0.9rem', margin: '0.25rem 0'}}>
                      {getCoverLabel(cancha)}
                    </p>
                    <p className="overlay-price">{cancha.precioHora ? `$${cancha.precioHora} por turno` : 'Precio no disponible'}</p>
                    <div className="overlay-actions">
                      {isInMaintenance(cancha) ? (
                        <div style={{color:'#fff', fontWeight: 'bold'}}>En mantenimiento</div>
                      ) : (
                        <Link to={`/reservas?idCancha=${cancha.idCancha}`} className="btn btn-reserve">Reservar</Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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

