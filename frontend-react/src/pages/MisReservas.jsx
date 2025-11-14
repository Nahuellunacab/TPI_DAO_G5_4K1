import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'
import { parseLocalDate, toYMD } from '../utils/dateUtils'

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

export default function MisReservas(){
  const navigate = useNavigate()
  // determine permisos from localStorage to adapt header labels
  let storedUser = null
  try{ const raw = localStorage.getItem('user'); storedUser = raw ? JSON.parse(raw) : null }catch(e){ storedUser = null }
  const permisos = storedUser ? Number(storedUser.permisos) : null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reservas, setReservas] = useState([])
  const [canchasMap, setCanchasMap] = useState({})
  const [deportesMap, setDeportesMap] = useState({})
  const [cxsMap, setCxsMap] = useState({})
  // Edit / Delete modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReserva, setEditingReserva] = useState(null)
  const [editFecha, setEditFecha] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingReserva, setDeletingReserva] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(()=>{
    fetchReservas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function fetchReservas(){
    setLoading(true)
    setError(null)
    try{
        const raw = (()=>{ try{ const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null }catch(e){ return null } })()
        if (!raw || !raw.idCliente){
          // If the current user is not a cliente (e.g. admin), do not force logout.
          // Redirecting to /login causes the visible "logged out" effect.
          // Better: redirect back to dashboard so admin stays in the app.
          navigate('/dashboard')
          return
        }
        const idCliente = raw.idCliente
        const res = await fetch(`/api/clientes/${idCliente}/reservas`)
        if (!res.ok){ setError('No se pudieron obtener reservas'); setLoading(false); return }
        const data = await res.json()
        setReservas(data)

        // fetch cancha info for all distinct canchas
        const canchaIds = new Set()
        for(const r of data){
          if (Array.isArray(r.detalles)){
            for(const d of r.detalles){ if (d.idCancha) canchaIds.add(d.idCancha) }
          }
        }

        // Fetch deportes for display names
        let deportesMap = {}
        try{
          const dres = await fetch('/api/deportes')
          if (dres.ok){
            const ddata = await dres.json()
            for(const dd of ddata){ deportesMap[dd.idDeporte] = dd.nombre }
          }
          setDeportesMap(deportesMap)
        }catch(e){}

        const map = {}
        await Promise.all(Array.from(canchaIds).map(async id => {
          try{
            const cRes = await fetch(`/api/canchas/${id}`)
            if (cRes.ok){
              const cjson = await cRes.json()
              map[id] = cjson
            }
          } catch(e){}
        }))
        setCanchasMap(map)

        // collect idCxS values from detalles to fetch servicio descriptions
        const cxsIds = new Set()
        for(const r of data){
          if (Array.isArray(r.detalles)){
            for(const d of r.detalles){ if (d.idCxS) cxsIds.add(d.idCxS) }
          }
        }

        const fetchedCxsMap = {}
        await Promise.all(Array.from(cxsIds).map(async id => {
          try{
            const res = await fetch(`/api/canchaxservicio/${id}`)
            if (res.ok){ fetchedCxsMap[id] = await res.json() }
          }catch(e){}
        }))
        // store service details map for rendering characteristics
        // normalize into an object in component state
        setCxsMap(fetchedCxsMap)
        setLoading(false)
      }catch(e){ console.error(e); setError(String(e)); setLoading(false) }
  }

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

  // Use shared parseLocalDate from utils to avoid timezone shifts

  if (loading) return (<div style={{padding:40,textAlign:'center'}}>Cargando reservas...</div>)
  if (error) return (<div style={{padding:40,color:'crimson',textAlign:'center'}}>Error: {error}</div>)

  return (
    <div className="reservas-root">
      <header className="site-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
          </div>
          <nav className="nav">
            <div className="header-actions">
              <Link to="/dashboard" className="nav-link btn-reservas">Volver</Link>
              <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={() => { try{ localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('auth'); } finally { navigate('/') } }} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:100}}>
        <h2 style={{textAlign:'center', marginBottom:20}}>Mis Reservas</h2>
        <div style={{display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center'}}>
          {reservas.length === 0 && (<div>No tenés reservas.</div>)}
          {reservas.map(r => {
            const dets = Array.isArray(r.detalles) ? r.detalles : []
            const canchaId = dets.length > 0 ? dets[0].idCancha : null
            const cancha = canchaId ? canchasMap[canchaId] : null
            const fecha = r.fechaReservada
            const inicio = dets.length>0 && dets[0].horaInicio ? dets[0].horaInicio : ''
            // Count distinct horarios reserved (each unique idHorario is one turno)
            const horarioIds = new Set()
            for (const d of dets){ if (d.idHorario) horarioIds.add(Number(d.idHorario)) }
            const turnos = horarioIds.size
            // build characteristics list (unique) excluding base servicio (precioAdicional == 0)
            const charSet = new Set()
            for (const d of dets){
              const pa = Number(d.precioAdicional || 0)
              if (pa && pa > 0){
                const svc = cxsMap && cxsMap[d.idCxS] && cxsMap[d.idCxS].servicio
                const name = (svc && (svc.descripcion || svc.nombre)) ? (svc.descripcion || svc.nombre) : (cxsMap[d.idCxS] && cxsMap[d.idCxS].servicio && cxsMap[d.idCxS].servicio.descripcion) || 'Servicio'
                charSet.add(name)
              }
            }
            const chars = Array.from(charSet)

            // parse fechaReservada (handle full ISO datetimes or plain dates) and format
            let fechaLabel = ''
            try{
              const dt = parseLocalDate(fecha)
              if (!isNaN(dt)){
                  fechaLabel = dt.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
              } else {
                fechaLabel = fecha
              }
            }catch(e){ fechaLabel = fecha }

            const deporteName = cancha && cancha.deporte ? (deportesMap[cancha.deporte] || '') : ''
            const canchaNombre = cancha && cancha.nombre ? cancha.nombre : `Cancha ${canchaId || ''}`

            const montoLabel = `$${Number(r.monto || 0).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}`

            return (
              <article key={r.idReserva} style={{width:'100%', maxWidth:640, background:'#f3efe9', borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.08)', overflow:'hidden', padding:0, display:'flex', alignItems:'stretch', minHeight:180}}>
                <div className="reserva-thumb">
                  <SmartImage candidates={imageCandidatesForCancha(cancha)} alt={cancha?cancha.nombre:'Cancha'} className="thumb-img" />
                </div>
                <div style={{flex:1, padding:'16px 18px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <h3 style={{margin:0,fontSize:18, lineHeight:1}}>{deporteName} <span style={{fontWeight:700}}>{canchaNombre}</span></h3>
                    </div>
                    <div style={{textAlign:'right', fontSize:12, color:'#222'}}>
                      <div style={{fontWeight:700}}>{fechaLabel}</div>
                      <div style={{fontSize:12,color:'#444', marginTop:6}}>{inicio}</div>
                    </div>
                  </div>

                  <div style={{marginTop:8, fontSize:13, color:'#333'}}>
                    <div><strong>Deporte:</strong> {deporteName}</div>
                    <div><strong>Cancha:</strong> {canchaNombre}</div>
                    <div><strong>Fecha reservada:</strong> {fechaLabel}</div>
                    <div><strong>Hora Inicio:</strong> {inicio} hs</div>
                    <div><strong>Turnos:</strong> {turnos}</div>
                    <div style={{marginTop:8}}><strong>Características:</strong></div>
                    <ul style={{marginTop:6, marginBottom:0, paddingLeft:20}}>
                      {chars.length === 0 && (<li style={{color:'#666'}}>Ninguna</li>)}
                      {chars.map((c, idx) => (<li key={idx}>{c}</li>))}
                    </ul>
                  </div>

                        <div style={{marginTop:12,fontSize:13,color:'#444', display:'flex', justifyContent:'flex-end'}}>
                          <div style={{textAlign:'right'}}><strong>Monto:</strong> {montoLabel}</div>
                        </div>
                        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
                          <button className="btn btn-outline" onClick={async ()=>{
                            // Navigate to reservas page with cancha and reserva id to highlight current slots
                            const dets = Array.isArray(r.detalles) ? r.detalles : []
                            const canchaId = dets.length > 0 ? dets[0].idCancha : null
                            if (canchaId){
                              navigate(`/reservas?cancha=${canchaId}&editReserva=${r.idReserva}`)
                            }
                          }}>Editar</button>
                          <button className="btn btn-danger" onClick={async ()=>{
                            // open custom delete confirmation modal
                            setDeletingReserva(r)
                            setDeleteError(null)
                            setShowDeleteModal(true)
                          }}>Eliminar</button>
                        </div>
                </div>
              </article>
            )
          })}
        </div>
      </main>
      
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
      {/* Edit modal */}
      {showEditModal && editingReserva && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Editar reserva #{editingReserva.idReserva}</h2>
            <div style={{marginTop:8}}>
              <label style={{display:'block', marginBottom:6}}>Fecha reservada</label>
              <input type="date" value={editFecha} onChange={e=>setEditFecha(e.target.value)} />
            </div>
            {modalError && <div style={{color:'crimson', marginTop:8}}>{modalError}</div>}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>{ setShowEditModal(false); setEditingReserva(null); setModalError(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={async ()=>{
                setModalSubmitting(true); setModalError(null)
                try{
                  const payload = { fechaReservada: editFecha }
                  const res = await fetch(`/api/reserva/${editingReserva.idReserva}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                  if (!res.ok){ const b = await res.json().catch(()=>({})); setModalError(b.error || 'Error al guardar cambios'); setModalSubmitting(false); return }
                  // refresh list
                  await fetchReservas()
                  setShowEditModal(false); setEditingReserva(null)
                }catch(e){ console.error(e); setModalError('Error comunicando con el servidor') }
                finally{ setModalSubmitting(false) }
              }} disabled={modalSubmitting}>{modalSubmitting ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {showDeleteModal && deletingReserva && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Confirmar eliminación</h2>
            <p style={{marginTop:8}}>¿Estás seguro que querés eliminar la reserva del <strong>{(() => { try{ const d = parseLocalDate(deletingReserva.fechaReservada); return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) }catch(e){ return deletingReserva.fechaReservada } })()}</strong>? Esta acción no se puede deshacer.</p>
            {deleteError && <div style={{color:'crimson', marginTop:8}}>{deleteError}</div>}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>{ setShowDeleteModal(false); setDeletingReserva(null); setDeleteError(null) }}>Cancelar</button>
              <button className="btn btn-danger" onClick={async ()=>{
                setDeleteSubmitting(true); setDeleteError(null)
                try{
                  const res = await fetch(`/api/reserva/${deletingReserva.idReserva}`, { method: 'DELETE' })
                  if (!res.ok){ const b = await res.json().catch(()=>({})); setDeleteError(b.error || 'Error al eliminar'); setDeleteSubmitting(false); return }
                  setShowDeleteModal(false); setDeletingReserva(null)
                  await fetchReservas()
                }catch(e){ console.error(e); setDeleteError('Error comunicando con el servidor') }
                finally{ setDeleteSubmitting(false) }
              }} disabled={deleteSubmitting}>{deleteSubmitting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

