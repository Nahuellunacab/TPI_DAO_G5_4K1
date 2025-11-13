import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'
import { parseLocalDate, toYMD } from '../utils/dateUtils'

export default function MisReservas(){
  const navigate = useNavigate()
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
          navigate('/login')
          return
        }
        const idCliente = raw.idCliente
        const res = await fetch(`/api/clientes/${idCliente}/reservas`)
        if (!res.ok){ setError('No se pudieron obtener reservas'); setLoading(false); return }
        const data = await res.json()
        setReservas(data)

        // fetch cancha info for all distinct canchas and servicios
        const canchaIds = new Set()
        const cxsIds = new Set()
        for(const r of data){
          if (Array.isArray(r.detalles)){
            for(const d of r.detalles){ if (d.idCancha) canchaIds.add(d.idCancha) }
          }
        }
        // Also fetch deportes to choose a sensible image when the Cancha
        // table doesn't store an explicit image field (legacy schema).
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

  const map = {}
        await Promise.all(Array.from(canchaIds).map(async id => {
          try{
            const cRes = await fetch(`/api/canchas/${id}`)
            if (cRes.ok){
              const cjson = await cRes.json()
              // prefer explicit cancha.imagen if present; otherwise derive from deporte
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

        // collect idCxS values from detalles to fetch servicio descriptions
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

  // code-based asset names (in case assets were renamed to codes like t1,t2,f1...)
  const CODE_MAP = {
    futbol: ['f1','f2'],
    tenis: ['t1','t2'],
    padel: ['p1','p2'],
    hockey: ['h1','h2'],
    volley: ['v1','v2'],
    basquet: ['b1','b2']
  }

  // Use shared parseLocalDate from utils to avoid timezone shifts

  function imageCandidatesForCancha(c){
    const list = []
    try{
      if (c && c.nombre){
        const safe = String(c.nombre).trim().replace(/\s+/g,'')
        if (safe){ ['jpg','jpeg','png'].forEach(ext => list.push(`/assets/${safe}.${ext}`)) }
        const low = safe.toLowerCase()
        if (low !== safe){ ['jpg','jpeg','png'].forEach(ext => list.push(`/assets/${low}.${ext}`)) }
      }
    }catch(e){/* ignore */}

    try{
      const deporteName = c && c.deporte ? (deportesMap[c.deporte] || '') : ''
      const key = String(deporteName).toLowerCase()
      const normalized = key.normalize ? key.normalize('NFD').replace(/[^\w\s-]/g,'') : key
      if (normalized && CODE_MAP[normalized]){
        const codes = CODE_MAP[normalized]
        for(const code of codes){
          list.push(`/assets/${code}.jpg`, `/assets/${code}.jpeg`, `/assets/${code}.png`)
          const up = String(code).toUpperCase()
          if (up !== code) list.push(`/assets/${up}.jpg`, `/assets/${up}.jpeg`, `/assets/${up}.png`)
        }
      }
    }catch(e){/* ignore */}

    // final fallback(s)
    list.push('/assets/placeholder.jpg')
    return list
  }

  if (loading) return (<div style={{padding:40,textAlign:'center'}}>Cargando reservas...</div>)
  if (error) return (<div style={{padding:40,color:'crimson',textAlign:'center'}}>Error: {error}</div>)

  return (
    <div className="reservas-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/dashboard" className="nav-link btn-reservas">Reservar</Link>
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
            const img = cancha ? (cancha._imageForUi || cancha.imagen || '/assets/placeholder.jpg') : '/assets/placeholder.jpg'
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
                  {/* Use fixed-size left thumbnail with object-fit cover for consistent look */}
                  <SmartImage candidates={imageCandidatesForCancha(cancha).concat([img])} alt={cancha?cancha.nombre:'Cancha'} className="thumb-img" />
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
                            // Open edit modal for this reserva (edit fechaReservada)
                            setEditingReserva(r)
                            // normalize date to yyyy-mm-dd for input[type=date]
                            try{ const d = parseLocalDate(r.fechaReservada); if (!isNaN(d)) setEditFecha(toYMD(d)); else setEditFecha(r.fechaReservada) }catch(e){ setEditFecha(r.fechaReservada) }
                            setModalError(null)
                            setShowEditModal(true)
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

          <div style={{display:'flex', justifyContent:'center', marginTop:28}}>
            <Link to="/dashboard" className="btn btn-outline btn-back">Volver</Link>
          </div>
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

