import React, { useEffect, useState, useMemo } from 'react'
import { parseLocalDate, toYMD } from '../utils/dateUtils'
import { useLocation, Link, useNavigate } from 'react-router-dom'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

function startOfWeekMonday(d){
  // return Monday of the week containing date d
  const day = d.getDay() // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0,0,0,0)
  return monday
}

// Return services to show in the UI: if the list contains 'ninguno' but
// also other services, remove 'ninguno'. If 'ninguno' is the only service,
// keep it so the UI can indicate that state.
function visibleServices(arr){
  if (!Array.isArray(arr)) return []
  try{
    const filtered = arr.filter(s => { const d = (s && s.servicio && s.servicio.descripcion) ? String(s.servicio.descripcion).toLowerCase() : ''; return d !== 'ninguno' })
    return filtered.length > 0 ? filtered : arr
  }catch(e){ return arr }
}

// Services to show in the reservation modal: remove bar/kiosk and ball-rental options
function modalVisibleServices(arr){
  try{
    const vis = visibleServices(arr)
    const forbidden = ['pelot', 'pelota', 'pelotas', 'bar', 'kiosc', 'kiosko']
    return vis.filter(s => {
      try{
        const d = (s && s.servicio && s.servicio.descripcion) ? String(s.servicio.descripcion).toLowerCase() : ''
        for(const k of forbidden) if (d.indexOf(k) >= 0) return false
        return true
      }catch(e){ return true }
    })
  }catch(e){ return Array.isArray(arr) ? arr : [] }
}

function formatDayHeader(date){
  // e.g., 'Lun 10/11'
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(date)
  const parts = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit' }).format(date)
  return `${weekday} ${parts}`
}

function formatTimeRange(h){
  // The Horario table contains horaInicio/horaFin as simple 'HH:MM' strings
  // (legacy DB). If they are strings, just show them directly. If they are
  // Date/time objects, format them to locale time.
  const hiRaw = h.horaInicio
  const hfRaw = h.horaFin
  if (typeof hiRaw === 'string' && typeof hfRaw === 'string'){
    return `${hiRaw} - ${hfRaw}`
  }
  try{
    const hi = new Date(hiRaw)
    const hf = new Date(hfRaw)
    return `${hi.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${hf.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
  }catch(e){
    return `${String(hiRaw)} - ${String(hfRaw)}`
  }
}

function slotStartDate(date, horario){
  try{
    const d = new Date(date)
    if (!horario) return null
    if (typeof horario.horaInicio === 'string'){
      const parts = horario.horaInicio.split(':')
      const hours = Number(parts[0]) || 0
      const minutes = Number(parts[1]) || 0
      d.setHours(hours, minutes, 0, 0)
      return d
    }
    if (horario.horaInicio instanceof Date){
      d.setHours(horario.horaInicio.getHours(), horario.horaInicio.getMinutes(), 0, 0)
      return d
    }
    const parsed = new Date(horario.horaInicio)
    if (!isNaN(parsed)){
      d.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0)
      return d
    }
  }catch(e){
    return null
  }
  return null
}

function isSlotInPast(date, horario){
  try{
    const slotDate = slotStartDate(date, horario)
    if (!slotDate) return false
    return slotDate.getTime() < Date.now()
  }catch(e){
    return false
  }
}

function resolveDeporteNameFromCancha(cancha, deportesMap){
  try{
    if (!cancha) return ''
    const dfield = cancha.deporte
    if (dfield !== null && dfield !== undefined){
      if (typeof dfield === 'number') return deportesMap[dfield] || ''
      if (typeof dfield === 'string'){
        // if string contains only digits, treat as id
        if (/^\d+$/.test(dfield)){
          const id = Number(dfield)
          return deportesMap[id] || ''
        }
        // otherwise return string value
        return dfield
      }
      if (dfield && dfield.nombre) return dfield.nombre
    }
    if (cancha.deporteNombre) return cancha.deporteNombre
    return cancha.nombre || ''
  }catch(e){ return '' }
}

export default function Reservas(){
  const query = useQuery()
  const idCanchaParam = query.get('idCancha')
  const [idCancha, setIdCancha] = useState(idCanchaParam ? Number(idCanchaParam) : null)
  const [horarios, setHorarios] = useState([])
  const [events, setEvents] = useState([])
  const [estadosMap, setEstadosMap] = useState({})
  const [deportesMap, setDeportesMap] = useState({})
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    async function load(){
      try{
        const hres = await fetch('/api/horarios')
        if (hres.ok){
          const hrs = await hres.json()
          // ensure horarios are ordered by horaInicio (legacy format is 'HH:MM')
          // Be defensive: if horaInicio is a string like '09:00' parse hours/minutes,
          // otherwise fall back to Date parsing.
          hrs.sort((a,b)=>{
            try{
              if (typeof a.horaInicio === 'string' && typeof b.horaInicio === 'string'){
                const pa = a.horaInicio.split(':').map(x=>Number(x)||0)
                const pb = b.horaInicio.split(':').map(x=>Number(x)||0)
                return (pa[0]-pb[0]) || (pa[1]-pb[1])
              }
              return new Date(a.horaInicio) - new Date(b.horaInicio)
            }catch(e){ return 0 }
          })
          setHorarios(hrs)
        }
        else {
          const txt = await hres.text().catch(()=>hres.statusText||String(hres.status))
          setError(`Error al obtener horarios: ${hres.status} ${txt}`)
        }
      }catch(e){
        console.error('Error cargando horarios', e)
        setError(String(e))
      }
      await loadEventsForWeek(weekStart)
      // load EstadoCancha map to help detect 'techada' status for a cancha
      try{
        const r = await fetch('/api/estado-canchas')
        if (r.ok){
          const rows = await r.json()
          const m = {}
          for(const row of rows) m[row.idEstado] = row.nombre || ''
          setEstadosMap(m)
        }
      }catch(e){ /* ignore */ }
      // load deportes map (id -> nombre) so we can resolve deporte names
      try{
        const dr = await fetch('/api/deportes')
        if (dr.ok){
          const ddata = await dr.json()
          const dm = {}
          for(const dd of ddata) dm[dd.idDeporte] = dd.nombre || ''
          setDeportesMap(dm)
        }
      }catch(e){ /* ignore */ }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCancha])

  // When entering the page with an idCancha we no longer show a modal;
  // instead suggestions are computed and highlighted in the calendar.

  async function loadEventsForWeek(startDate){
    if (!idCancha) return
  const end = new Date(startDate)
  end.setDate(startDate.getDate() + 6)
  const qs = new URLSearchParams()
  qs.set('start', toYMD(startDate))
  qs.set('end', toYMD(end))
    try{
      const res = await fetch(`/api/canchas/${idCancha}/reservas?${qs.toString()}`)
      if (!res.ok) throw new Error('no events')
      const ev = await res.json()
      // ev is expected to be array of { idDetalle, idHorario, fechaReservada }
      setEvents(ev)
    }catch(e){
      console.error('Error cargando eventos', e)
      setError(String(e))
      setEvents([])
    }
  }

  function isOccupied(date, horario){
    // Determine occupancy by matching idHorario and fechaReservada
  const dateStr = toYMD(date)
    for(const ev of events){
      if (!ev) continue
      if ((ev.idHorario === null || ev.idHorario === undefined)) continue
      if (Number(ev.idHorario) === Number(horario.idHorario) && ev.fechaReservada === dateStr) return true
    }
    return false
  }

  function isSlotAllowed(date, horario){
    const dayIndex = date.getDay()
    const hi = String(horario.horaInicio || '').trim()
    const hf = String(horario.horaFin || '').trim()
    const isMidnightSlot = (hi === '00:00' && hf === '01:30')
    const allowedMidnight = isMidnightSlot && (dayIndex === 6 || dayIndex === 0)
    if (isSlotInPast(date, horario)) return false
    if (isMidnightSlot) return allowedMidnight
    if (dayIndex === 0) return false
    return true
  }

  // Compute suggestions of consecutive available horarios for the week
  function computeSuggestions(n){
    const out = []
    if (!displayHorarios || displayHorarios.length === 0) return out
    // iterate each day
    for(const d of weekDates){
      for(let i=0;i<displayHorarios.length;i++){
        // need n consecutive horarios starting at i
        if (i + n - 1 >= displayHorarios.length) break
        let ok = true
        const block = []
        for(let k=0;k<n;k++){
          const h = displayHorarios[i+k]
          if (!isSlotAllowed(d,h) || isOccupied(d,h)) { ok = false; break }
          block.push(h)
        }
        if (ok){
          out.push({ startDate: d, startHorarioIndex: i, horarios: block })
        }
      }
    }
    return out
  }

  function isSuggested(date, horario){
    if (!suggestions || suggestions.length === 0) return -1
  const dateStr = toYMD(date)
    for(let i=0;i<suggestions.length;i++){
      const s = suggestions[i]
    const sDate = toYMD(parseLocalDate(s.startDate))
      if (sDate !== dateStr) continue
      for(const h of s.horarios){ if (Number(h.idHorario) === Number(horario.idHorario)) return i }
    }
    return -1
  }

  // selection flow state
  const [tempPendingBlock, setTempPendingBlock] = useState(null)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState(null)

  function isSelected(date, horario){
    if (!selectedBlock) return false
  const dateStr = toYMD(date)
  const sDate = toYMD(parseLocalDate(selectedBlock.startDate))
    if (sDate !== dateStr) return false
    return selectedBlock.horarios.some(h => Number(h.idHorario) === Number(horario.idHorario))
  }

  function handleSuggestedClick(date, horario){
    const n = Number(requestedTurns) || 1
    const block = buildBlockFromStart(date, horario, n)
    if (!block){ setBlockError('No es posible seleccionar ese bloque (ocupado o fuera de rango)'); return }
    setTempPendingBlock(block)
    setShowSelectModal(true)
  }

  // Build a block starting from the clicked horario and going downwards for n turnos
  function buildBlockFromStart(date, horario, n){
    if (!horarios || horarios.length === 0) return null
  const dateStr = toYMD(date)
    // find index of horario in horarios array
    const idx = displayHorarios.findIndex(h => Number(h.idHorario) === Number(horario.idHorario))
    if (idx === -1) return null
    if (idx + n - 1 >= displayHorarios.length) return null
    const blockH = []
    for(let k=0;k<n;k++){
      const h = displayHorarios[idx + k]
      // ensure allowed and not occupied for the target date
      if (!isSlotAllowed(date, h) || isOccupied(date, h)) return null
      blockH.push(h)
    }
    return { startDate: date, horarios: blockH }
  }

  async function autoReserveFromSlot(date, horario){
    const n = Number(requestedTurns) || 1
    const block = buildBlockFromStart(date, horario, n)
    if (!block){
      setBlockError('No es posible reservar la cantidad solicitada a partir de este horario (ocupado o fuera de rango)')
      return
    }
    // proceed to reserve the constructed block
    await reserveBlock(block)
  }

  async function handleReserve(date, horario){
    // Open reservation modal with prefilled data instead of prompt/confirm
    if (!idCancha) { alert('No hay cancha seleccionada'); return }
  const fechaReservada = toYMD(date)
    // Preload cancha and servicios for the modal
    try{
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/canchas/${idCancha}`),
        fetch(`/api/canchaxservicio/cancha/${idCancha}`)
      ])
  const cancha = cRes.ok ? await cRes.json() : null
  const servicios = sRes.ok ? await sRes.json() : []
  const tRes = await fetch('/api/tipos-documento')
  const tiposDocumento = tRes.ok ? await tRes.json() : []
      // Try to fetch full cliente info from session (if available)
      let cliente = null
      try{
        const raw = (()=>{ try{ const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null }catch(e){ return null } })()
        if (raw && raw.idCliente){
          const clRes = await fetch(`/api/clientes/${raw.idCliente}`)
          if (clRes.ok) cliente = await clRes.json()
        }
      }catch(e){ console.warn('No se pudo obtener cliente desde API', e) }

  // determine if cancha is techada by checking estado or cancha.nombre
  let isTechada = false
  try{
    // Prefer explicit cancha.descripcion if available
    const descField = cancha && cancha.descripcion ? String(cancha.descripcion).toLowerCase() : ''
    console.log('Cancha:', cancha?.nombre, 'Descripcion:', descField)
    if (descField && (descField.indexOf('tech') >= 0 || descField.indexOf('techa') >= 0 || descField.indexOf('cubiert') >= 0 || descField.indexOf('cerrad') >= 0)){
      isTechada = true
      console.log('Cancha detectada como techada por descripcion')
    } else {
      const estadoName = (cancha && cancha.estado) ? (estadosMap[cancha.estado] || '') : ''
      const key = (estadoName + ' ' + (cancha && cancha.nombre ? cancha.nombre : '')).toLowerCase()
      if (key.indexOf('tech') >= 0 || key.indexOf('techa') >= 0 || key.indexOf('cubiert') >= 0 || key.indexOf('cerrad') >= 0) {
        isTechada = true
        console.log('Cancha detectada como techada por estado/nombre')
      }
    }
  }catch(e){ isTechada = false }
  
  // determine if horario is >= 18:00 (requires iluminación)
  let requiresIluminacion = isTechada // techadas always require iluminación
  try{
    let horaStr = typeof horario.horaInicio === 'string' ? horario.horaInicio : ''
    if (horaStr){
      const parts = horaStr.split(':')
      const hora = Number(parts[0]) || 0
      // Only force iluminación for late hours when the sport is fútbol or cancha is techada
      // For any sport, after 18:00 we require iluminación
      if (hora >= 18) {
        requiresIluminacion = true
        console.log('Horario >= 18:00 detectado, iluminación requerida')
      }
    }
  }catch(e){/* ignore */}
  
  console.log('isTechada:', isTechada, 'requiresIluminacion:', requiresIluminacion)
  
  // if requiresIluminacion, pre-select iluminación service (if available)
  const initialServices = []
  try{
    if (requiresIluminacion && Array.isArray(servicios)){
      for(const s of modalVisibleServices(servicios)){
        try{
          const desc = (s.servicio && s.servicio.descripcion) ? s.servicio.descripcion.toLowerCase() : ''
          if (desc.indexOf('ilumin') >= 0 || desc.indexOf('luz') >= 0){ initialServices.push(Number(s.idCxS)); break }
        }catch(e){/* ignore */}
      }
    }
  }catch(e){/* ignore */}
  setSelectedSlot({ date, fechaReservada, horario, cancha, servicios, cliente, tiposDocumento, isTechada, requiresIluminacion })
  setModalSelectedServices(initialServices)
  setShowModal(true)
    }catch(e){
      console.error('Error cargando datos de cancha/servicios', e)
      setSelectedSlot({ date, fechaReservada, horario, cancha: null, servicios: [], cliente: null, tiposDocumento: [] })
      setModalSelectedServices([])
      setShowModal(true)
    }
  }

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  // ids of selected services (idCxS) in the modal
  const [modalSelectedServices, setModalSelectedServices] = useState([])
  // multi-turn booking flow (we compute suggestions automatically)
  const [requestedTurns, setRequestedTurns] = useState(1)
  const [suggestions, setSuggestions] = useState([])
  const [blockSubmitting, setBlockSubmitting] = useState(false)
  const [blockError, setBlockError] = useState(null)
  const [notify, setNotify] = useState({show:false, title:'', message:'', variant:'info', next:null})

  function closeNotify(){
    try{ if (notify && notify.next) navigate(notify.next) }catch(e){}
    setNotify({show:false, title:'', message:'', variant:'info', next:null})
  }

  const navigate = useNavigate()

  function handleLogout(){
    // Clear common auth/session keys and go to landing
    try{
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('auth')
      sessionStorage.removeItem('token')
    }catch(e){/* ignore */}
    navigate('/')
  }

  async function submitReservation(payload){
    // Frontend validation: ensure required fields exist and are valid
    if (!payload || !payload.idCancha || !payload.fechaReservada || !payload.idCliente){
      setModalError('Faltan datos requeridos para la reserva')
      return
    }
    setModalSubmitting(true)
    setModalError(null)
    try{
      const res = await fetch('/api/reservas', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      if (res.status === 409){
        setModalError('Horario ya reservado')
        await loadEventsForWeek(weekStart)
        return
      }
      if (!res.ok){ const b = await res.json().catch(()=>({})); setModalError(b.error || 'Error en el servidor'); return }
      // success
      setShowModal(false)
      setSelectedSlot(null)
      await loadEventsForWeek(weekStart)
  // show success notify and then navigate on close
  setNotify({show:true, title:'Reserva guardada', message:'Su reserva se guardó correctamente.', variant:'success', next:'/dashboard'})
    }catch(e){
      console.error(e)
      setModalError('Error comunicando al servidor')
    }finally{
      setModalSubmitting(false)
    }
  }

  // Multi-turn helpers: search suggestions and reserve a whole block
  function findSuggestions(){
    try{
      const n = Number(requestedTurns) || 1
      const found = computeSuggestions(n)
      setSuggestions(found)
      if (!found || found.length === 0) setBlockError('No se encontraron bloques disponibles para esa cantidad de turnos en esta semana')
      else setBlockError(null)
    }catch(e){
      console.error('Error computing suggestions', e)
      setBlockError('Error al buscar sugerencias')
    }
  }

  async function reserveBlock(block){
    // block: { startDate: Date, horarios: [Horario,...] }
    setBlockSubmitting(true)
    setBlockError(null)
    try{
      const raw = (()=>{ try{ const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null }catch(e){ return null } })()
      const clientId = raw && raw.idCliente ? raw.idCliente : null
      if (!clientId){ setBlockError('Debes iniciar sesión para reservar'); setBlockSubmitting(false); return }

  const fechaReservada = toYMD(parseLocalDate(block.startDate))
      for(const h of block.horarios){
        const payload = { idCancha, idHorario: h.idHorario, fechaReservada, idCliente: clientId }
        const res = await fetch('/api/reservas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        if (res.status === 409){
          setBlockError('Uno de los horarios fue reservado mientras procesábamos tu bloque. Se detuvo la operación.')
          await loadEventsForWeek(weekStart)
          setBlockSubmitting(false)
          return
        }
        if (!res.ok){ const b = await res.json().catch(()=>({})); setBlockError(b.error || 'Error al crear reserva'); setBlockSubmitting(false); return }
      }
      // all succeeded
  // hide any suggestion UI (we simply clear suggestions after success)
      setSuggestions([])
      await loadEventsForWeek(weekStart)
      // brief success feedback
    // show success notify and then navigate on close
    setNotify({show:true, title:'Reserva guardada', message:'El bloque se reservó correctamente.', variant:'success', next:'/dashboard'})
    }catch(e){
      console.error('Error reservando bloque', e)
      setBlockError('Error comunicando con el servidor')
    }finally{
      setBlockSubmitting(false)
    }
  }

  // Auto-compute suggestions for the visible week whenever relevant data changes
  useEffect(()=>{
    if (!idCancha) return
    try{
      const n = Number(requestedTurns) || 1
      const found = computeSuggestions(n)
      setSuggestions(found)
      setBlockError(null)
    }catch(e){
      console.error('Error computing suggestions (auto)', e)
    }
  // recompute when inputs that affect availability change
  }, [idCancha, horarios, events, weekStart, requestedTurns])

  function computeModalTotal(){
    if (!selectedSlot) return 0
    const servicios = Array.isArray(selectedSlot.servicios) ? selectedSlot.servicios : []
    const visible = modalVisibleServices(servicios)
    const base = Number(selectedSlot.cancha && selectedSlot.cancha.precioHora ? selectedSlot.cancha.precioHora : 0)
  // Some services are one-time fees per reservation (e.g. bar/kiosco, comida post-partido).
  // NOTE: iluminación should be charged per turno, so we don't include 'ilumin'/'luz' here.
  const singletonKeywords = ['bar', 'kiosc', 'kiosko', 'comida', 'post']
    let extrasPerTurn = 0
    let extrasSingleton = 0
    for(const s of visible){
      const sid = Number(s.idCxS)
      const desc = (s.servicio && s.servicio.descripcion) ? (s.servicio.descripcion||'').toLowerCase() : ''
      const isIllum = desc.indexOf('ilumin') >= 0 || desc.indexOf('luz') >= 0
      const forcedChecked = selectedSlot.requiresIluminacion && isIllum
      const selected = forcedChecked || modalSelectedServices.includes(sid) || modalSelectedServices.includes(String(sid))
      if (!selected) continue
      const precio = Number(s.precioAdicional || 0)
      // Decide if this service should be charged once or per turno by keyword
      const isSingleton = singletonKeywords.some(k => desc.indexOf(k) >= 0)
      if (isSingleton) extrasSingleton += precio
      else extrasPerTurn += precio
    }
    const count = selectedSlot.blockHorarios && selectedSlot.blockHorarios.length ? selectedSlot.blockHorarios.length : 1
    return (base * count) + (extrasPerTurn * count) + extrasSingleton
  }

  async function openBlockReservationModal(){
    if (!tempPendingBlock && !selectedBlock) return
    const block = tempPendingBlock || selectedBlock
    // preload cancha and servicios
    try{
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/canchas/${idCancha}`),
        fetch(`/api/canchaxservicio/cancha/${idCancha}`)
      ])
      const cancha = cRes.ok ? await cRes.json() : null
      const servicios = sRes.ok ? await sRes.json() : []
      const tRes = await fetch('/api/tipos-documento')
      const tiposDocumento = tRes.ok ? await tRes.json() : []
      // Try to fetch full cliente info from session (if available)
      let cliente = null
      try{
        const raw = (()=>{ try{ const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null }catch(e){ return null } })()
        if (raw && raw.idCliente){
          const clRes = await fetch(`/api/clientes/${raw.idCliente}`)
          if (clRes.ok) cliente = await clRes.json()
        }
      }catch(e){ console.warn('No se pudo obtener cliente desde API', e) }

  const fechaReservada = toYMD(parseLocalDate(block.startDate))
  // determine techada and pre-select iluminación if needed
      let isTechadaBlk = false
      try{
        const estadoName = (cancha && cancha.estado) ? (estadosMap[cancha.estado] || '') : ''
        const key = (estadoName + ' ' + (cancha && cancha.nombre ? cancha.nombre : '')).toLowerCase()
        if (key.indexOf('tech') >= 0 || key.indexOf('techa') >= 0 || key.indexOf('cubiert') >= 0 || key.indexOf('cerrad') >= 0) isTechadaBlk = true
      }catch(e){ isTechadaBlk = false }
      const initialServicesBlk = []
      let requiresIluminacionBlk = isTechadaBlk
      try{
        // check first horario hour and deporte for fútbol
        const horaStr = block.horarios && block.horarios[0] && typeof block.horarios[0].horaInicio === 'string' ? block.horarios[0].horaInicio : ''
        if (horaStr){
          const parts = horaStr.split(':')
          const hora = Number(parts[0]) || 0
          // For any sport, after 18:00 we require iluminación
          if (hora >= 18) requiresIluminacionBlk = true
        }
      }catch(e){}
      try{
        if (requiresIluminacionBlk && Array.isArray(servicios)){
            for(const s of modalVisibleServices(servicios)){
              try{ const desc = (s.servicio && s.servicio.descripcion) ? s.servicio.descripcion.toLowerCase() : ''; if (desc.indexOf('ilumin') >= 0 || desc.indexOf('luz') >= 0){ initialServicesBlk.push(Number(s.idCxS)); break } }catch(e){}
            }
          }
      }catch(e){}
      // include techada and forced illumination flag into selectedSlot
      setModalSelectedServices(initialServicesBlk)
      setSelectedSlot({ date: parseLocalDate(block.startDate), fechaReservada, horario: block.horarios[0], cancha, servicios, cliente, tiposDocumento, blockHorarios: block.horarios, isTechada: isTechadaBlk, requiresIluminacion: requiresIluminacionBlk })
      setShowModal(true)
      // clear pending / selection state
      setTempPendingBlock(null)
      setShowSelectModal(false)
      setSelectedBlock(block)
    }catch(e){
      console.error('Error cargando datos para bloque', e)
    }
  }

  function changeWeek(offset){
    const s = new Date(weekStart)
    s.setDate(s.getDate() + offset*7)
    setWeekStart(s)
    loadEventsForWeek(s)
  }

  const weekDates = []
  for(let i=0;i<7;i++){ const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); weekDates.push(d) }

  // For display purposes we want horarios that start at midnight (00:00)
  // to appear at the bottom of the table so they visually belong to
  // the day column they are reserved on (i.e. a Saturday 00:00-01:30
  // should be shown under Saturday rather than at the very top). We
  // create a derived ordering that moves midnight-start horarios to
  // the end while preserving relative order.
  const displayHorarios = useMemo(()=>{
    if (!Array.isArray(horarios) || horarios.length === 0) return horarios
    const normal = []
    const midnight = []
    for(const h of horarios){
      const hi = String(h.horaInicio || '').trim()
      if (hi.startsWith('00:')) midnight.push(h)
      else normal.push(h)
    }
    return [...normal, ...midnight]
  }, [horarios])

  return (
    <div className="reservas-root">
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/mis-reservas" className="nav-link btn-reservas">Mis Reservas</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={() => { try{ localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('auth'); } finally { navigate('/') } }} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:100}}>
        <h2>Reservas {idCancha ? `- Cancha ${idCancha}` : ''}</h2>
        <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:12}}>
          <button onClick={()=>changeWeek(-1)} className="btn">← Semana anterior</button>
          <button onClick={()=>changeWeek(1)} className="btn">Semana siguiente →</button>
          <div style={{marginLeft:16, display:'flex', alignItems:'center', gap:8}}>
            <label style={{fontSize:14, color:'#333'}}>Turnos:</label>
            <input type="number" min={1} max={8} value={requestedTurns} onChange={e=>{ const v = Number(e.target.value) || 1; setRequestedTurns(v) }} style={{width:72,padding:6,borderRadius:6,border:'1px solid #ddd'}} />
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table className="reserva-grid" style={{borderCollapse:'collapse', width:'100%'}}>
            <thead>
              <tr>
                <th style={{border:'1px solid #ddd', padding:8, minWidth:140}}>Horario</th>
                {weekDates.map((d,idx)=> (
                  <th key={idx} style={{border:'1px solid #ddd', padding:8, textAlign:'center'}}>{formatDayHeader(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{padding:20, textAlign:'center'}}>Cargando horarios...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{padding:20, textAlign:'center', color:'crimson'}}>Error: {error}</td>
                </tr>
              ) : horarios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{padding:20, textAlign:'center'}}>No hay horarios definidos en el sistema.</td>
                </tr>
              ) : (
                displayHorarios.map(h => (
                  <tr key={h.idHorario}>
                    <td style={{border:'1px solid #eee', padding:8}}>{formatTimeRange(h)}</td>
                    {weekDates.map((d,idx)=>{
                      const occupied = isOccupied(d,h)
                      const dayIndex = d.getDay() // 0 = Sunday, 6 = Saturday
                      // Special rule: the horario '00:00' - '01:30' is allowed on
                      // Saturdays and Sundays only. All other horarios keep the
                      // global "no reservar domingos" rule.
                      const hi = String(h.horaInicio || '').trim()
                      const hf = String(h.horaFin || '').trim()
                      const isMidnightSlot = (hi === '00:00' && hf === '01:30')
                      const allowedMidnight = isMidnightSlot && (dayIndex === 6 || dayIndex === 0)
                      const pastSlot = isSlotInPast(d, h)

                      let cellContent = null
                      // Render as calendar-style slot blocks. We use CSS classes to
                      // control appearance and hover behavior. Available slots are
                      // clickable (no visible "Reservar" text) and will turn green
                      // on hover; occupied slots show a filled block; unavailable
                      // slots are gray.
                      const suggestedIndex = isSuggested(d,h)
                      const isSuggestedSlot = suggestedIndex >= 0
                      const isSelectedSlot = isSelected(d,h)
                      let slotClass = ''
                      if (isMidnightSlot){
                        if (!allowedMidnight) slotClass = 'res-slot unavailable'
                        else if (occupied) slotClass = 'res-slot occupied'
                        else if (pastSlot) slotClass = 'res-slot past'
                        else if (isSelectedSlot) slotClass = 'res-slot selected'
                        else if (isSuggestedSlot) slotClass = 'res-slot available suggested'
                        else slotClass = 'res-slot available'
                      }else{
                        if (dayIndex === 0) slotClass = 'res-slot unavailable'
                        else if (occupied) slotClass = 'res-slot occupied'
                        else if (pastSlot) slotClass = 'res-slot past'
                        else if (isSelectedSlot) slotClass = 'res-slot selected'
                        else if (isSuggestedSlot) slotClass = 'res-slot available suggested'
                        else slotClass = 'res-slot available'
                      }

                      const titleText = (() => {
                        if (slotClass.includes('occupied')) return 'Ocupado'
                        if (slotClass.includes('past')) return 'Horario pasado'
                        if (slotClass.includes('unavailable')){
                          return isMidnightSlot ? 'No disponible' : (dayIndex === 0 ? 'No disponible' : 'No disponible')
                        }
                        return isMidnightSlot ? 'Disponible (sáb/dom)' : 'Disponible'
                      })()

                      // If the slot is unavailable, render an empty cell (hide the slot)
                      if (slotClass.includes('unavailable')){
                        return (
                          <td key={idx} style={{border:'1px solid #eee', padding:8, textAlign:'center'}}></td>
                        )
                      }

                      return (
                        <td key={idx} style={{border:'1px solid #eee', padding:8, textAlign:'center'}}>
                          <div
                            className={slotClass}
                            role={slotClass.includes('available') ? 'button' : 'gridcell'}
                            tabIndex={slotClass.includes('available') ? 0 : -1}
                            title={titleText + (isSuggestedSlot ? ' - sugerido' : '')}
                            onClick={slotClass.includes('available') ? (isSuggestedSlot ? ()=>handleSuggestedClick(d,h) : ()=>handleReserve(d,h)) : undefined}
                            onKeyDown={e=>{ if (e.key === 'Enter' && slotClass.includes('available')) { if (isSuggestedSlot){ handleSuggestedClick(d,h) } else handleReserve(d,h) } }}
                          >
                            <div className="slot-tooltip">{formatTimeRange(h)}</div>
                            <span className="label">{titleText}</span>
                            {isSelectedSlot && (
                              <button className="confirm-btn" onClick={(ev)=>{ ev.stopPropagation(); openBlockReservationModal(); }}>Confirmar</button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Modal for creating a reservation */}
        {/* Modal asking to confirm selection of a suggested starting turno */}
        {showSelectModal && tempPendingBlock && (
          <div className="modal-overlay">
            <div className="modal" role="dialog" aria-modal="true">
              <h2>¿Desea seleccionar este turno?</h2>
              <p style={{marginTop:8}}>Se seleccionarán {tempPendingBlock.horarios.length} turnos comenzando en {tempPendingBlock.horarios[0].horaInicio}. ¿Confirmar selección?</p>
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="btn btn-outline" onClick={()=>{ setTempPendingBlock(null); setShowSelectModal(false); setBlockError(null) }}>Cancelar</button>
                <button className="btn btn-primary" onClick={()=>{ setSelectedBlock(tempPendingBlock); setTempPendingBlock(null); setShowSelectModal(false); setBlockError(null) }}>Confirmar selección</button>
              </div>
            </div>
          </div>
        )}
        {showModal && selectedSlot && (
          <div className="modal-overlay">
            <div className="modal" role="dialog" aria-modal="true">
              <h2>Confirmar reserva</h2>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:8}}>
                <div>
                  <h3 style={{marginTop:0}}>Datos de la reserva</h3>
                  <p style={{margin:0}}><strong>Cancha:</strong> {selectedSlot && selectedSlot.cancha && selectedSlot.cancha.nombre ? selectedSlot.cancha.nombre : `#${idCancha}`}</p>
                  <p style={{margin:0}}><strong>Fecha:</strong> {(() => {
                      try{
                        const d = parseLocalDate(selectedSlot.fechaReservada)
                        return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                      }catch(e){ return selectedSlot.fechaReservada }
                  })()}</p>
                  <p style={{margin:0}}><strong>Horario:</strong> {formatTimeRange(selectedSlot.horario)}</p>
                  {/* Servicios disponibles para esta cancha */}
                  {selectedSlot && Array.isArray(selectedSlot.servicios) && modalVisibleServices(selectedSlot.servicios).length > 0 && (
                    <div style={{marginTop:12}}>
                      <p style={{margin:0}}><strong>Servicios adicionales:</strong></p>
                      <div style={{marginTop:6}}>
                        {modalVisibleServices(selectedSlot.servicios).map(s => {
                          const sid = Number(s.idCxS)
                          const desc = (s.servicio && s.servicio.descripcion) ? (s.servicio.descripcion || '').toLowerCase() : ''
                          const isIllum = desc.indexOf('ilumin') >= 0 || desc.indexOf('luz') >= 0
                          const forcedChecked = selectedSlot.requiresIluminacion && isIllum
                          // If iluminación is required for this slot, hide the option
                          if (isIllum && selectedSlot.requiresIluminacion) return null
                          return (
                          <label key={s.idCxS} style={{display:'block', fontSize:14}}>
                            <input
                              type="checkbox"
                              checked={ forcedChecked ? true : modalSelectedServices.includes(sid) }
                              onChange={e => {
                                if (forcedChecked) return
                                const id = sid
                                if (e.target.checked){ setModalSelectedServices(prev => [...prev, id]) }
                                else { setModalSelectedServices(prev => prev.filter(x => x !== id)) }
                              }}
                              disabled={forcedChecked}
                              style={{marginRight:8}}
                            />
                            {s.servicio && s.servicio.descripcion ? s.servicio.descripcion : `Servicio ${s.idCxS}`} — ${Number(s.precioAdicional || 0).toFixed(2)} {forcedChecked && <em style={{color:'#666', marginLeft:8}}>(obligatorio)</em>}
                          </label>
                        )})}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{marginTop:0}}>Datos del cliente</h3>
                  {selectedSlot && selectedSlot.cliente ? (
                    (() => {
                      const c = selectedSlot.cliente
                      // Resolve tipo documento name from tiposDocumento map if available
                      const tipos = selectedSlot.tiposDocumento || []
                      const tipoObj = tipos.find(t => Number(t.idTipoDoc) === Number(c.idTipoDoc))
                      const tipoNombre = tipoObj ? tipoObj.nombre : (c.tipoDoc || c.idTipoDoc || '-')
                      return (
                        <div>
                          <p style={{margin:0}}><strong>Tipo doc:</strong> {tipoNombre}</p>
                          <p style={{margin:0}}><strong>Número:</strong> {c.numeroDoc ?? c.numero ?? '-'}</p>
                          <p style={{margin:0}}><strong>Nombre:</strong> {c.nombre ?? '-'}</p>
                          <p style={{margin:0}}><strong>Apellido:</strong> {c.apellido ?? '-'}</p>
                        </div>
                      )
                    })()
                  ) : (() => {
                    const raw = (()=>{ try{ const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null }catch(e){ return null } })()
                    if (!raw) return (<div style={{marginTop:12,color:'#666'}}>No hay sesión iniciada.</div>)
                    // Try to resolve tipo name using tiposDocumento if present on selectedSlot
                    const tipos = selectedSlot && selectedSlot.tiposDocumento ? selectedSlot.tiposDocumento : []
                    const tipoObj = tipos.find(t => Number(t.idTipoDoc) === Number(raw.idTipoDoc))
                    const tipoNombre = tipoObj ? tipoObj.nombre : (raw.idTipoDoc || raw.tipoDoc || '-')
                    return (
                      <div>
                        <p style={{margin:0}}><strong>Tipo doc:</strong> {tipoNombre}</p>
                        <p style={{margin:0}}><strong>Número:</strong> {raw.numeroDoc || raw.numero || raw.nroDoc || raw.documento || '-'}</p>
                        <p style={{margin:0}}><strong>Nombre:</strong> {raw.nombre || raw.firstName || '-'}</p>
                        <p style={{margin:0}}><strong>Apellido:</strong> {raw.apellido || raw.lastName || '-'}</p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {modalError && <div style={{color:'crimson', marginTop:8}}>{modalError}</div>}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
                <div style={{fontSize:16}}><strong>Total:</strong> ${computeModalTotal().toFixed(2)}</div>
              </div>
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:14}}>
                <button className="btn btn-outline" onClick={()=>{setShowModal(false); setSelectedSlot(null); setModalError(null)}} disabled={modalSubmitting}>Cancelar</button>
                {/* Use cliente id from fetched client if possible, otherwise fallback to localStorage */}
                <button className="btn btn-primary" onClick={async ()=>{
                  const clientId = (selectedSlot && selectedSlot.cliente && selectedSlot.cliente.idCliente) ? selectedSlot.cliente.idCliente : (()=>{ try{ const raw = localStorage.getItem('user'); const u = raw ? JSON.parse(raw) : null; return u && u.idCliente ? u.idCliente : null }catch(e){ return null } })()
                  if (!clientId){ setModalError('Debes iniciar sesión para reservar'); return }
                  const payload = { idCancha, fechaReservada: selectedSlot.fechaReservada, idCliente: clientId }
                  // If blockHorarios present, send them as 'horarios' array; otherwise send single idHorario for backward compatibility
                  if (selectedSlot && selectedSlot.blockHorarios && selectedSlot.blockHorarios.length > 0){
                    payload.horarios = selectedSlot.blockHorarios.map(h=>h.idHorario)
                  } else {
                    payload.idHorario = selectedSlot.horario.idHorario
                  }
                  // compute final list of servicios including mandatory iluminación when cancha is techada
                  const finalServicios = Array.isArray(modalSelectedServices) ? [...modalSelectedServices.map(x=>Number(x))] : []
                  try{
                    if (selectedSlot && selectedSlot.requiresIluminacion && Array.isArray(selectedSlot.servicios)){
                      for(const s of modalVisibleServices(selectedSlot.servicios)){
                        const sid = Number(s.idCxS)
                        const desc = (s.servicio && s.servicio.descripcion) ? (s.servicio.descripcion||'').toLowerCase() : ''
                        if ((desc.indexOf('ilumin') >= 0 || desc.indexOf('luz') >= 0) && !finalServicios.includes(sid)){
                          finalServicios.push(sid)
                          break
                        }
                      }
                    }
                  }catch(e){}
                  if (finalServicios.length > 0) payload.servicios = finalServicios
                  await submitReservation(payload)
                }} disabled={modalSubmitting}>{modalSubmitting? 'Enviando...' : 'Confirmar reserva'}</button>
              </div>
            </div>
          </div>
        )}
        {/* suggestions are highlighted directly on the calendar (no modal) */}
      </main>

        {notify.show && (
          <div className="notify-overlay" onClick={closeNotify}>
            <div className={`notify-box ${notify.variant || ''}`} onClick={e=>e.stopPropagation()}>
              <div className="notify-title">{notify.title}</div>
              <div className="notify-message">{notify.message}</div>
              <div className="notify-actions">
                <button className="notify-btn close" onClick={closeNotify} style={{marginRight:8}}>Cerrar</button>
                <button className="notify-btn" onClick={closeNotify}>Aceptar</button>
              </div>
            </div>
          </div>
        )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="brand">
            <img src="/assets/logo.png" alt="logo" className="logo-small" />
            <span>GoField</span>
          </div>
          <div className="footer-links">
            <Link to="/dashboard" className="btn btn-reservas">volver</Link>
            <button className="btn btn-logout" onClick={handleLogout}>Cerrar Sesión</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
