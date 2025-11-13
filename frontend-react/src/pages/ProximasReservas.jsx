import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'
import { parseLocalDate, toYMD } from '../utils/dateUtils'

export default function ProximasReservas(){
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reservas, setReservas] = useState([])
  const [canchasMap, setCanchasMap] = useState({})
  const [deportesMap, setDeportesMap] = useState({})
  const [cxsMap, setCxsMap] = useState({})
  const [editingReserva, setEditingReserva] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFecha, setEditFecha] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingReserva, setDeletingReserva] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Check permissions on mount
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || Number(u.permisos) !== 2){ 
        navigate('/dashboard')
        return
      }
    }catch(e){ 
      navigate('/dashboard')
      return
    }
    fetchReservas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchReservas(){
    setLoading(true)
    try{
      // Fetch all reservas from the system
      const res = await fetch('/api/reservas')
      if (!res.ok) throw new Error('No se pudieron obtener reservas')
      const allReservas = await res.json()

      // Filter by today's date and future time
      const now = new Date()
      const today = toYMD(now)
      const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight

      const futureReservas = allReservas.filter(r => {
        const fechaReservada = r.fechaReservada
        if (fechaReservada !== today) return false // Only today's reservations

        // Check if any detalle has a future hora
        const detalles = Array.isArray(r.detalles) ? r.detalles : []
        for (const d of detalles) {
          if (d.horaInicio) {
            try {
              const [hh, mm] = String(d.horaInicio).split(':').map(Number)
              const slotTime = hh * 60 + mm
              if (slotTime >= currentTime) return true
            } catch(e) { /* ignore */ }
          }
        }
        return false
      })

      setReservas(futureReservas)

      // Fetch cancha, deporte, and service info
      const canchaIds = new Set()
      const cxsIds = new Set()
      for(const r of futureReservas){
        if (Array.isArray(r.detalles)){
          for(const d of r.detalles){
            if (d.idCancha) canchaIds.add(d.idCancha)
            if (d.idCxS) cxsIds.add(d.idCxS)
          }
        }
      }

      // Fetch deportes
      const DEPORTE_IMAGE_MAP = {
        'Futbol': '/assets/futbol.jpg',
        'Tenis': '/assets/tenis.jpeg',
        'Padel': '/assets/padel.jpg',
        'Hockey': '/assets/hockey.jpg',
        'Volley': '/assets/voleyCerrado.jpeg',
        'Basquet': '/assets/basquet.jpeg',
      }

      let deportesMap = {}
      try{
        const dres = await fetch('/api/deportes')
        if (dres.ok){
          const ddata = await dres.json()
          for(const dd of ddata){ deportesMap[dd.idDeporte] = dd.nombre }
        }
        setDeportesMap(deportesMap)
      }catch(e){}

      // Fetch canchas
      const map = {}
      await Promise.all(Array.from(canchaIds).map(async id => {
        try{
          const cRes = await fetch(`/api/canchas/${id}`)
          if (cRes.ok){
            const cjson = await cRes.json()
            let img = '/assets/placeholder.jpg'
            if (cjson.imagen) img = cjson.imagen
            else if (cjson.deporte && deportesMap[cjson.deporte]){
              const dn = deportesMap[cjson.deporte]
              img = DEPORTE_IMAGE_MAP[dn] || `/assets/${dn.toLowerCase()}.jpg`
            }
            map[id] = { ...cjson, _imageForUi: img }
          }
        } catch(e){}
      }))
      setCanchasMap(map)

      // Fetch CxS
      const fetchedCxsMap = {}
      await Promise.all(Array.from(cxsIds).map(async id => {
        try{
          const res = await fetch(`/api/canchaxservicio/${id}`)
          if (res.ok){ fetchedCxsMap[id] = await res.json() }
        }catch(e){}
      }))
      setCxsMap(fetchedCxsMap)

      setLoading(false)
    }catch(e){ 
      console.error(e)
      setLoading(false)
    }
  }

  function imageCandidatesForCancha(c){
    const list = []
    // Prefer the backend-served image endpoint
    try{ 
      if (c && c.idCancha) {
        list.push(`/api/canchas/${c.idCancha}/imagen`)
      }
    }catch(e){}
    
    try{ 
      if (c && c.imagen) {
        list.push(c.imagen)
      }
    }catch(e){}
    
    try{
      if (c && c.nombre){
        const safe = String(c.nombre).trim().replace(/\s+/g,'')
        if (safe){ 
          ['jpg','jpeg','png'].forEach(ext => {
            list.push(`/assets/${safe}.${ext}`)
            const low = safe.toLowerCase()
            if (low !== safe) list.push(`/assets/${low}.${ext}`)
          })
        }
      }
    }catch(e){}

    list.push('/assets/placeholder.jpg')
    return Array.from(new Set(list))
  }

  function handleLogout(){
    try{ 
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('auth')
      sessionStorage.removeItem('token')
    }catch(e){}
    navigate('/')
  }

  if (loading) return (<div style={{padding:40,textAlign:'center'}}>Cargando reservas...</div>)

  return (
    <div style={{minHeight:'100vh', background:'#5a7d7c'}}>
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/dashboard" className="nav-link btn-calendar">Calendario</Link>
              <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:100, paddingBottom:60}}>
        <h1 style={{textAlign:'center', color:'#fff', fontSize:36, marginBottom:40}}>Próximas Reservas</h1>

        {/* Tab selector */}
        <div style={{textAlign:'center', marginBottom:30}}>
          <button 
            style={{
              background:'#d9d9d9', 
              border:'none', 
              padding:'10px 24px', 
              borderRadius:6,
              fontSize:14,
              fontWeight:600,
              cursor:'pointer'
            }}
          >
            Reservas por Cliente
          </button>
        </div>

        {/* Cards container */}
        <div style={{display:'flex', flexDirection:'column', gap:20, maxWidth:900, margin:'0 auto'}}>
          {reservas.length === 0 && (
            <div style={{textAlign:'center', color:'#fff', padding:40}}>
              No hay reservas próximas para hoy.
            </div>
          )}
          {reservas.map(r => {
            const dets = Array.isArray(r.detalles) ? r.detalles : []
            const canchaId = dets.length > 0 ? dets[0].idCancha : null
            const cancha = canchaId ? canchasMap[canchaId] : null
            const img = cancha ? (cancha._imageForUi || cancha.imagen || '/assets/placeholder.jpg') : '/assets/placeholder.jpg'
            const fecha = r.fechaReservada
            const inicio = dets.length>0 && dets[0].horaInicio ? dets[0].horaInicio : ''
            
            // Count turnos
            const horarioIds = new Set()
            for (const d of dets){ if (d.idHorario) horarioIds.add(Number(d.idHorario)) }
            const turnos = horarioIds.size
            
            // Build characteristics list
            const charSet = new Set()
            for (const d of dets){
              const pa = Number(d.precioAdicional || 0)
              if (pa && pa > 0){
                const svc = cxsMap && cxsMap[d.idCxS] && cxsMap[d.idCxS].servicio
                const name = (svc && (svc.descripcion || svc.nombre)) ? (svc.descripcion || svc.nombre) : 'Servicio'
                charSet.add(name)
              }
            }
            const chars = Array.from(charSet)

            // Format fecha
            let fechaLabel = ''
            try{
              const dt = parseLocalDate(fecha)
              if (!isNaN(dt)){
                fechaLabel = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
              } else {
                fechaLabel = fecha
              }
            }catch(e){ fechaLabel = fecha }

            const deporteName = cancha && cancha.deporte ? (deportesMap[cancha.deporte] || '') : ''
            const canchaNombre = cancha && cancha.nombre ? cancha.nombre : `Cancha ${canchaId || ''}`

            return (
              <article 
                key={r.idReserva} 
                style={{
                  background:'#f5f5f5',
                  borderRadius:12,
                  overflow:'hidden',
                  display:'flex',
                  alignItems:'stretch',
                  minHeight:200,
                  boxShadow:'0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {/* Left content */}
                <div style={{flex:1, padding:'20px 24px', display:'flex', flexDirection:'column'}}>
                  {/* Title row */}
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                    <h3 style={{margin:0, fontSize:20, fontWeight:700}}>
                      {canchaNombre} {deporteName && <span style={{fontWeight:400}}>({deporteName})</span>}
                    </h3>
                    <div style={{textAlign:'right', fontSize:16, fontWeight:700}}>
                      {fechaLabel} {inicio}hs
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{fontSize:14, color:'#333', marginBottom:12}}>
                    <div><strong>Deporte:</strong> {deporteName}</div>
                    <div><strong>Cancha:</strong> {canchaNombre}</div>
                    <div><strong>Fecha reservada:</strong> {fechaLabel}</div>
                    <div><strong>Hora Inicio:</strong> {inicio} hs</div>
                    <div><strong>Turnos:</strong> {turnos}</div>
                  </div>

                  {/* Características */}
                  <div style={{fontSize:14, marginBottom:16}}>
                    <strong>Características:</strong>
                    <ul style={{marginTop:4, paddingLeft:20, marginBottom:0}}>
                      {chars.length === 0 ? (
                        <li>iluminación</li>
                      ) : (
                        chars.map((c, idx) => <li key={idx}>{c}</li>)
                      )}
                      {chars.length > 0 && chars.every(c => !c.toLowerCase().includes('post')) && (
                        <li>comida post-partido [6 personas]</li>
                      )}
                    </ul>
                  </div>

                  {/* Buttons */}
                  <div style={{marginTop:'auto', display:'flex', gap:10}}>
                    <button 
                      className="btn"
                      style={{
                        background:'#5a7d7c',
                        color:'#fff',
                        border:'none',
                        padding:'8px 16px',
                        borderRadius:6,
                        cursor:'pointer',
                        fontSize:14,
                        fontWeight:600
                      }}
                      onClick={()=>{
                        setShowDeleteModal(true)
                        setDeletingReserva(r)
                        setDeleteError(null)
                      }}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="btn"
                      style={{
                        background:'#7fb8b6',
                        color:'#fff',
                        border:'none',
                        padding:'8px 16px',
                        borderRadius:6,
                        cursor:'pointer',
                        fontSize:14,
                        fontWeight:600
                      }}
                      onClick={()=>{
                        setEditingReserva(r)
                        try{ 
                          const d = parseLocalDate(r.fechaReservada)
                          if (!isNaN(d)) setEditFecha(toYMD(d))
                          else setEditFecha(r.fechaReservada)
                        }catch(e){ setEditFecha(r.fechaReservada) }
                        setModalError(null)
                        setShowEditModal(true)
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </div>

                {/* Right image */}
                <div style={{width:280, flexShrink:0, position:'relative', overflow:'hidden'}}>
                  <SmartImage 
                    candidates={imageCandidatesForCancha(cancha).concat([img])} 
                    alt={canchaNombre}
                    style={{
                      width:'100%',
                      height:'100%',
                      objectFit:'cover',
                      display:'block'
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>

        {/* footer button removed per design */}
      </main>

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
            <h2>Confirmar cancelación</h2>
            <p style={{marginTop:8}}>¿Estás seguro que querés cancelar esta reserva? Esta acción no se puede deshacer.</p>
            {deleteError && <div style={{color:'crimson', marginTop:8}}>{deleteError}</div>}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>{ setShowDeleteModal(false); setDeletingReserva(null); setDeleteError(null) }}>Cancelar</button>
              <button className="btn btn-danger" onClick={async ()=>{
                setDeleteSubmitting(true); setDeleteError(null)
                try{
                  const res = await fetch(`/api/reserva/${deletingReserva.idReserva}`, { method: 'DELETE' })
                  if (!res.ok){ const b = await res.json().catch(()=>({})); setDeleteError(b.error || 'Error al cancelar'); setDeleteSubmitting(false); return }
                  setShowDeleteModal(false); setDeletingReserva(null)
                  await fetchReservas()
                }catch(e){ console.error(e); setDeleteError('Error comunicando con el servidor') }
                finally{ setDeleteSubmitting(false) }
              }} disabled={deleteSubmitting}>{deleteSubmitting ? 'Cancelando...' : 'Confirmar cancelación'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
