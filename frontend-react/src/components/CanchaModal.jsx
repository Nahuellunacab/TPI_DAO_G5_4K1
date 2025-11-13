import React, { useEffect, useState } from 'react'
import SmartImage from './SmartImage'
import Notify from './Notify'
import { parseLocalDate, toYMD } from '../utils/dateUtils'

export default function CanchaModal({ idCancha, onClose }){
  const [cancha, setCancha] = useState(null)
  const [reservas, setReservas] = useState([])
  const [deportesMap, setDeportesMap] = useState({})
  const [estadosMap, setEstadosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')
  const [deporteEdit, setDeporteEdit] = useState('')
  const [precioEdit, setPrecioEdit] = useState('')
  const [estadoEdit, setEstadoEdit] = useState(1)
  const [fileEdit, setFileEdit] = useState(null)
  const [previewEditUrl, setPreviewEditUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notify, setNotify] = useState(null)

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

  // Ensure maps contain current cancha values
  useEffect(()=>{
    if (!cancha) return
    const keyE = String(cancha.estado)
    const keyD = String(cancha.deporte)
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
        setDeportesMap(prev => ({...prev, ...dmap}))
        setEstadosMap(prev => ({...prev, ...emap}))
      }catch(e){ console.error('refetchMaps', e) }
    }
    refetchMaps()
    return ()=>{ mounted = false }
  }, [cancha])

  useEffect(()=>{
    if (editing && cancha){
      setNombreEdit(cancha.nombre || '')
      setDeporteEdit(cancha.deporte || '')
      setPrecioEdit(cancha.precioHora || '')
      setEstadoEdit(cancha.estado || 1)
      setFileEdit(null)
      setPreviewEditUrl(cancha.imagen || null)
    }
  },[editing, cancha])

  // helper: start/end of week (Mon..Sun)
  function startOfWeek(d){
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = copy.getDay() || 7
    copy.setDate(copy.getDate() - (day - 1))
    copy.setHours(0,0,0,0)
    return copy
  }
  function endOfWeek(d){ const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e }

  // use parseLocalDate from utils

  // compute counts
  let weekCount = 0, totalCount = 0
  try{
    const now = new Date(); const s = startOfWeek(now); const e = endOfWeek(now)
    const seen = new Set(), seenWeek = new Set()
    for(const r of reservas){
      const key = r && (r.idReserva !== undefined && r.idReserva !== null) ? String(r.idReserva) : (r && r.idDetalle ? `d:${r.idDetalle}` : null)
      if (!key) continue
      if (!seen.has(key)) seen.add(key)
      const d = r && r.fechaReservada ? parseLocalDate(r.fechaReservada) : null
      if (d && d >= s && d <= e){ if (!seenWeek.has(key)) seenWeek.add(key) }
    }
    totalCount = seen.size; weekCount = seenWeek.size
  }catch(e){ /* ignore */ }

  async function handleSave(){
    setSaving(true)
    try{
      const upd = { nombre: nombreEdit, deporte: Number(deporteEdit)||cancha.deporte, precioHora: Number(precioEdit)||cancha.precioHora, estado: Number(estadoEdit)||cancha.estado }
      const r = await fetch(`/api/canchas/${idCancha}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(upd) })
      if (!r.ok) throw new Error('Error al guardar datos')
      if (fileEdit){ const fd = new FormData(); fd.append('foto', fileEdit); const up = await fetch(`/api/canchas/${idCancha}/foto`, { method:'POST', body: fd }); if (!up.ok){ const t = await up.text().catch(()=> 'error'); throw new Error(t) } }
      const fres = await fetch(`/api/canchas/${idCancha}`)
      if (fres.ok){ const j = await fres.json(); setCancha(j); setNotify({ type:'success', title:'Guardado', message:'La cancha se actualizó' }); setEditing(false) }
    }catch(e){ console.error(e); setNotify({ type:'error', title:'Error', message: String(e) }) }
    finally{ setSaving(false) }
  }

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
                    if (cancha && cancha.idCancha) candidates.push(`/api/canchas/${cancha.idCancha}/imagen`)
                    if (cancha && cancha.imagen) candidates.push(cancha.imagen)
                    if (name){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${name}.${ext}`)) }
                    const lower = name.toLowerCase()
                    if (name && lower !== name){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${lower}.${ext}`)) }
                    if (sport){ ['jpg','jpeg','png'].forEach(ext => candidates.push(`/assets/${sport}.${ext}`)) }
                    const uniq = Array.from(new Set(candidates))
                    return (
                      <div style={{width:'100%', height:260, overflow:'hidden', borderRadius:10}}>
                        <SmartImage candidates={uniq} alt={cancha && cancha.nombre} className="thumb-centered" style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                      </div>
                    )
                  })()}
                </div>

                <div style={{flex:1}}>
                  {!editing ? (
                    <>
                      <p style={{margin:'4px 0'}}><strong>Nombre:</strong> {cancha.nombre}</p>
                      <p style={{margin:'4px 0'}}><strong>Deporte:</strong> {cancha && (cancha.deporteNombre || deportesMap[String(cancha.deporte)] || cancha.deporte)}</p>
                      <p style={{margin:'4px 0'}}><strong>Precio hora:</strong> {cancha.precioHora ? `$${cancha.precioHora}` : 'N/D'}</p>
                      <p style={{margin:'4px 0'}}><strong>Estado:</strong> {cancha && (cancha.estadoNombre || estadosMap[String(cancha.estado)] || cancha.estado)}</p>
                    </>
                  ) : (
                    <div style={{display:'grid', gap:8}}>
                      <label>Nombre<input value={nombreEdit} onChange={e=>setNombreEdit(e.target.value)} /></label>
                      <label>Deporte
                        <select value={deporteEdit} onChange={e=>setDeporteEdit(e.target.value)}>
                          {Object.entries(deportesMap).map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                        </select>
                      </label>
                      <label>Precio por hora<input value={precioEdit} onChange={e=>setPrecioEdit(e.target.value)} /></label>
                      <label>Estado
                        <select value={estadoEdit} onChange={e=>setEstadoEdit(Number(e.target.value))}>
                          {Object.entries(estadosMap).map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                        </select>
                      </label>

                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <input id="cancha-file-input" type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ const f = e.target.files && e.target.files[0]; if (f){ setFileEdit(f); setPreviewEditUrl(URL.createObjectURL(f)) } }} />
                        <label htmlFor="cancha-file-input" className="btn btn-outline" style={{cursor:'pointer'}}>Seleccionar imagen</label>
                        <div style={{fontSize:13, color:'#555'}}>{fileEdit ? fileEdit.name : (previewEditUrl ? 'Imagen seleccionada' : <em style={{color:'#999'}}>Ningún archivo</em>)}</div>
                        {fileEdit || previewEditUrl ? <button type="button" className="btn btn-outline" onClick={()=>{ if (previewEditUrl && fileEdit){ URL.revokeObjectURL(previewEditUrl) } setFileEdit(null); setPreviewEditUrl(cancha.imagen || null) }}>Quitar</button> : null}
                      </div>
                    </div>
                  )}

                  <p style={{margin:'12px 0 4px'}}><strong>Reservas</strong></p>
                  <ul>
                    <li>Total: {totalCount}</li>
                    <li>Esta semana: {weekCount}</li>
                  </ul>

                  <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
                    {!editing ? (
                      <button className="btn btn-outline" onClick={()=>setEditing(true)}>Editar</button>
                    ) : (
                      <>
                        <button className="btn btn-outline" onClick={()=>{ setEditing(false); setFileEdit(null); setPreviewEditUrl(cancha.imagen || null) }}>Cancelar</button>
                        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>Guardar</button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{marginTop:12}}>
                <h4 style={{margin:'8px 0'}}>Reservas</h4>
                <div style={{maxHeight:240, overflowY:'auto', border:'1px solid #eee', borderRadius:6, padding:8}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{textAlign:'left'}}>
                        <th style={{padding:'6px 8px'}}>Fecha</th>
                        <th style={{padding:'6px 8px'}}>Horario</th>
                        <th style={{padding:'6px 8px'}}>Cliente</th>
                        <th style={{padding:'6px 8px'}}>Servicios</th>
                        <th style={{padding:'6px 8px'}}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservas.filter(r => {
                        try{ if (!r || !r.fechaReservada) return false; const d = parseLocalDate(r.fechaReservada); const today = new Date(); today.setHours(0,0,0,0); return d >= today }catch(e){ return false }
                      }).map((r,i)=> (
                        <tr key={r.idReserva || i} style={{borderTop:'1px solid #f3f3f3'}}>
                          <td style={{padding:'6px 8px'}}>{(() => { try{ const d = parseLocalDate(r.fechaReservada); return d.toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) }catch(e){ return r.fechaReservada } })()}</td>
                          <td style={{padding:'6px 8px'}}>{(() => { try{ const hi = r.horaInicio || r.hora || null; const hf = r.horaFin || null; if (hi && hf) return `${String(hi)} - ${String(hf)}`; if (hi) return String(hi); return '-' }catch(e){ return '-' } })()}</td>
                          <td style={{padding:'6px 8px'}}>{r.cliente || '-'}</td>
                          <td style={{padding:'6px 8px'}}>{Array.isArray(r.servicios) ? r.servicios.join(', ') : (r.servicios || '-')}</td>
                          <td style={{padding:'6px 8px'}}>{r.monto !== undefined && r.monto !== null ? `$${Number(r.monto).toFixed(2)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
      {notify ? <Notify {...notify} onClose={()=>setNotify(null)} /> : null}
    </div>
  )
}
