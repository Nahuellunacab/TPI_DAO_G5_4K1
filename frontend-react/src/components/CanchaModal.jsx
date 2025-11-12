import React, { useEffect, useState } from 'react'
import SmartImage from './SmartImage'

export default function CanchaModal({ idCancha, onClose }){
  const [cancha, setCancha] = useState(null)
  const [reservas, setReservas] = useState([])
  const [deportesMap, setDeportesMap] = useState({})
  const [estadosMap, setEstadosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    if (!idCancha) return
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const [cRes, rRes, dRes, eRes] = await Promise.all([
          fetch(`/api/canchas/${idCancha}`),
          fetch(`/api/canchas/${idCancha}/reservas-resumen`),
          fetch('/api/deportes'),
          fetch('/api/estado-canchas')
        ])
        if (!cRes.ok) throw new Error('No se pudo cargar la cancha')
  if (!rRes.ok) throw new Error('No se pudieron cargar las reservas (resumen)')
        const cjson = await cRes.json()
        const rjson = await rRes.json()
        const djson = dRes.ok ? await dRes.json() : []
        const ejson = eRes.ok ? await eRes.json() : []
        const dmap = {}
        for(const d of djson) dmap[String(d.idDeporte)] = d.nombre
        const emap = {}
        for(const e of ejson) emap[String(e.idEstado)] = e.nombre
        if (!mounted) return
        setCancha(cjson)
        setReservas(rjson)
        setDeportesMap(dmap)
        setEstadosMap(emap)
      }catch(e){
        console.error('CanchaModal load', e)
        if (mounted) setError(String(e))
      }finally{
        if (mounted) setLoading(false)
      }
    }
    load()
    return ()=>{ mounted = false }
  }, [idCancha])

  // If cancha is loaded but maps are missing entries, try fetching estados/deportes again
  useEffect(()=>{
    if (!cancha) return
    const keyE = String(cancha.estado)
    const keyD = String(cancha.deporte)
    // if both maps already have the keys, nothing to do
    if ((keyE && estadosMap[keyE]) && (keyD && deportesMap[keyD])) return

    let mounted = true
    async function refetchMaps(){
      try{
        const [dRes, eRes] = await Promise.all([fetch('/api/deportes'), fetch('/api/estado-canchas')])
        const djson = dRes.ok ? await dRes.json() : []
        const ejson = eRes.ok ? await eRes.json() : []
        const dmap = {}
        for(const d of djson) dmap[String(d.idDeporte)] = d.nombre
        const emap = {}
        for(const e of ejson) emap[String(e.idEstado)] = e.nombre
        if (!mounted) return
        // merge with existing maps to avoid overwriting
        setDeportesMap(prev => ({...dmap, ...prev}))
        setEstadosMap(prev => ({...emap, ...prev}))
      }catch(e){ console.error('refetchMaps', e) }
    }
    refetchMaps()
    return ()=>{ mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancha])

  function parseDate(s){
    try{ return new Date(s) }catch(e){ return null }
  }

  function startOfWeek(d){
    // Monday as first day
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = copy.getDay() || 7 // Sunday -> 7
    copy.setDate(copy.getDate() - (day - 1))
    copy.setHours(0,0,0,0)
    return copy
  }

  function endOfWeek(d){
    const s = startOfWeek(d)
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    e.setHours(23,59,59,999)
    return e
  }

  // Compute total unique reservations and unique reservations in current week.
  // The API returns detalle-level rows (one per DetalleReserva). We prefer
  // to count unique Reservation IDs (idReserva) so a multi-turn booking that
  // creates several detalles for the same reserva is counted once.
  let weekCount = 0
  let totalCount = 0
  try{
    const now = new Date()
    const s = startOfWeek(now)
    const e = endOfWeek(now)
    const seen = new Set()
    const seenWeek = new Set()
    for(const r of reservas){
      // prefer idReserva if available, otherwise fall back to idDetalle
      const key = r && (r.idReserva !== undefined && r.idReserva !== null) ? String(r.idReserva) : (r && r.idDetalle ? `d:${r.idDetalle}` : null)
      if (!key) continue
      // total unique
      if (!seen.has(key)){
        seen.add(key)
      }
      // week unique
      const d = r && r.fechaReservada ? new Date(r.fechaReservada) : null
      if (d && d >= s && d <= e){
        if (!seenWeek.has(key)){
          seenWeek.add(key)
        }
      }
    }
    totalCount = seen.size
    weekCount = seenWeek.size
  }catch(e){ /* ignore */ }

  return (
    <div style={{position:'fixed', inset:0, zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.5)'}} onClick={onClose}></div>
      <div style={{background:'#fff', width:'min(920px,95%)', maxHeight:'90vh', overflowY:'auto', borderRadius:8, boxShadow:'0 8px 40px rgba(0,0,0,0.25)', position:'relative'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, borderBottom:'1px solid #eee'}}>
          <h3 style={{margin:0}}>{cancha ? cancha.nombre : 'Detalles de Cancha'}</h3>
          <div>
            <button onClick={onClose} style={{border:'none', background:'transparent', fontSize:18, cursor:'pointer'}}>✕</button>
          </div>
        </div>

        <div style={{padding:16}}>
          {loading ? (
            <p>Cargando...</p>
          ) : error ? (
            <div style={{color:'red'}}>Error: {String(error)}</div>
          ) : (
            <>
              <div style={{display:'flex', gap:16, alignItems:'flex-start'}}>
                <div style={{width:320, flexShrink:0}}>
                  {(() => {
                    const name = cancha && cancha.nombre ? String(cancha.nombre).replace(/\s+/g,'') : ''
                    const sport = cancha && (cancha.deporteNombre || cancha.deporte) ? String(cancha.deporteNombre || cancha.deporte).replace(/\s+/g,'') : ''
                    const candidates = []
                    if (name){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${name}.${ext}`)) }
                    const lower = name.toLowerCase()
                    if (name && lower !== name){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${lower}.${ext}`)) }
                    if (sport){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${sport}.${ext}`)) }
                    // SmartImage will itself fallback to placeholder when candidates are exhausted
                    return (<SmartImage candidates={candidates} alt={cancha && cancha.nombre} style={{width:'100%', height:200, objectFit:'cover', borderRadius:6}} />)
                  })()}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:'4px 0'}}><strong>Nombre:</strong> {cancha.nombre}</p>
                  <p style={{margin:'4px 0'}}><strong>Deporte:</strong> {cancha && (cancha.deporteNombre || deportesMap[String(cancha.deporte)] || cancha.deporte)}</p>
                  <p style={{margin:'4px 0'}}><strong>Precio hora:</strong> {cancha.precioHora ? `$${cancha.precioHora}` : 'N/D'}</p>
                  <p style={{margin:'4px 0'}}><strong>Estado:</strong> {cancha && (cancha.estadoNombre || estadosMap[String(cancha.estado)] || cancha.estado)}</p>
                  <p style={{margin:'12px 0 4px'}}><strong>Reservas</strong></p>
                  <ul>
                    <li>Total: {totalCount}</li>
                    <li>Esta semana: {weekCount}</li>
                  </ul>
                </div>
              </div>

              <div style={{marginTop:12}}>
                <h4 style={{margin:'8px 0'}}>Reservas</h4>
                <div style={{maxHeight:240, overflowY:'auto', border:'1px solid #eee', borderRadius:6, padding:8}}>
                  {reservas.length === 0 ? <div>No hay reservas próximas</div> : (
                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{textAlign:'left'}}><th>Fecha</th><th>Cliente</th><th>Servicios</th><th>Monto</th></tr>
                      </thead>
                      <tbody>
                        {reservas.map((r,i)=> (
                          <tr key={r.idReserva || i} style={{borderTop:'1px solid #f3f3f3'}}>
                            <td style={{padding:'6px 8px'}}>{(() => {
                                try{
                                  const d = new Date(r.fechaReservada)
                                  return d.toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
                                }catch(e){ return r.fechaReservada }
                              })()}</td>
                            <td style={{padding:'6px 8px'}}>{r.cliente || '-'}</td>
                            <td style={{padding:'6px 8px'}}>{Array.isArray(r.servicios) ? r.servicios.join(', ') : (r.servicios || '-')}</td>
                            <td style={{padding:'6px 8px'}}>{r.monto !== undefined && r.monto !== null ? `$${Number(r.monto).toFixed(2)}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
