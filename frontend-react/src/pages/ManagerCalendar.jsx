import React, { useEffect, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
// CSS for FullCalendar is loaded from CDN via index.html to avoid Vite resolver issues
import { useNavigate, Link } from 'react-router-dom'
import esLocale from '@fullcalendar/core/locales/es'

const PALETTE = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f']

function colorForDeporte(idDeporte){
  if (!idDeporte) return '#666'
  return PALETTE[Number(idDeporte) % PALETTE.length]
}

export default function ManagerCalendar(){
  const nav = useNavigate()
  // cancha filter removed per request; we no longer track canchas here
  const [events, setEvents] = useState([])
  const calendarRef = useRef(null)

  const [deportesLookup, setDeportesLookup] = useState({})
  const [hoveredDeporte, setHoveredDeporte] = useState(null)

  async function loadDeportes(){
    try{
      const r = await fetch('/api/deportes')
      if (!r.ok) return
      const rows = await r.json()
      const map = {}
      for(const d of rows) map[String(d.idDeporte)] = d.nombre
      setDeportesLookup(map)
    }catch(e){ console.error('load deportes', e) }
  }

  function contrastColor(hex){
    try{
      if (!hex || hex[0] !== '#') return '#000'
      const h = hex.replace('#','')
      const r = parseInt(h.substring(0,2),16)
      const g = parseInt(h.substring(2,4),16)
      const b = parseInt(h.substring(4,6),16)
      const luminance = (0.299*r + 0.587*g + 0.114*b)/255
      return luminance > 0.6 ? '#000' : '#fff'
    }catch(e){ return '#fff' }
  }

  // derive unique deportes present in the current events for the legend
  const deportesMap = React.useMemo(()=>{
    const m = new Map()
    for(const ev of events){
      const rw = ev.extendedProps || {}
      const id = rw.idDeporte || 'none'
      const name = rw.nombreDeporte || deportesLookup[String(id)] || (id === 'none' ? 'Sin deporte' : `Deporte ${id}`)
      if (!m.has(id)) m.set(id, { id, name, color: colorForDeporte(id) })
    }
    return Array.from(m.values())
  }, [events, deportesLookup])

  // deporte filter state (null = show all)
  const [deporteFilter, setDeporteFilter] = useState(null)

  function toggleDeporteFilter(id){
    // store deporteFilter as either null or a string id
    const sid = id == null ? null : String(id)
    if (deporteFilter === sid) setDeporteFilter(null)
    else setDeporteFilter(sid)
  }

  // compute filtered events applying deporteFilter if present
  const filteredEvents = React.useMemo(()=>{
    if (!deporteFilter) return events
    return events.filter(ev => {
      const rw = ev.extendedProps || {}
      return String(rw.idDeporte || 'none') === String(deporteFilter)
    })
  }, [events, deporteFilter])

  useEffect(()=>{ loadDeportes(); }, [])

  function handleLogout(){
    try{ localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('auth'); sessionStorage.removeItem('token') }catch(e){}
    nav('/')
  }

  // cancha listing removed: not used in manager calendar

  async function loadEvents(rangeStart, rangeEnd){
    try{
      const qs = new URLSearchParams()
      if (rangeStart) qs.set('start', rangeStart.toISOString().slice(0,10))
      if (rangeEnd) qs.set('end', rangeEnd.toISOString().slice(0,10))
      // always request calendar events (server-side filtering by start/end)
      const url = `/api/reservas/calendar?${qs.toString()}`
      const r = await fetch(url)
      if (!r.ok) { setEvents([]); return }
      const rows = await r.json()
      const evs = rows.map(rw => {
        // build start/end ISO strings if horaInicio/horaFin present
        let start = null, end = null
        if (rw.horaInicio && rw.horaFin){
          const hi = String(rw.horaInicio).trim()
          const hf = String(rw.horaFin).trim()
          // expect HH:MM
          start = `${rw.fechaReservada}T${hi}:00`
          end = `${rw.fechaReservada}T${hf}:00`
        }
  // Show only cancha + deporte (hide servicio descriptions to reduce clutter)
  const titleParts = []
  if (rw.nombreCancha) titleParts.push(rw.nombreCancha)
  if (rw.nombreDeporte) titleParts.push(rw.nombreDeporte)
  const title = titleParts.join(' — ') || `Reserva #${rw.idReserva}`
        const color = colorForDeporte(rw.idDeporte)
        return {
          id: String(rw.idDetalle || rw.idReserva || Math.random()),
          title,
          start: start || rw.fechaReservada,
          end: end || rw.fechaReservada,
          extendedProps: rw,
          backgroundColor: color,
          borderColor: color,
        }
      })
      setEvents(evs)
    }catch(e){ console.error('loadEvents', e); setEvents([]) }
  }

  function handleDatesSet(arg){
    // arg.start and arg.end are Date objects
    loadEvents(arg.start, arg.end)
  }

  function handleEventClick(info){
    const props = info.event.extendedProps || {}
    // navigate to cancha page or reservation details
    if (props.idCancha){
      nav(`/reservas?idCancha=${props.idCancha}`)
    }
  }

  // check user permission: if not manager, redirect to dashboard home
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || Number(u.permisos) !== 2){ nav('/dashboard') }
    }catch(e){ nav('/dashboard') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div style={{paddingTop:100}}>
        <header className="site-header">
            <div className="container header-inner">
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <nav className="nav">
              <div className="header-actions">
                <Link to="/canchas" className="nav-link">Canchas</Link>
                <Link to="/mis-reservas" className="nav-link btn-reservas">Próximas Reservas</Link>
                <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
                <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
              </div>
            </nav>
          </div>
        </header>

        <div className="container" style={{padding:16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div>
              <h2 style={{margin:0}}>Calendario de reservas</h2>
              <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                {/* Legend: color per deporte - now buttons that filter */}
                <button
                  onClick={()=>toggleDeporteFilter(null)}
                  aria-pressed={deporteFilter == null}
                  style={{padding:'6px 8px', borderRadius:8, border:'1px solid rgba(0,0,0,0.08)', background: deporteFilter == null ? '#e6f2ff' : '#fff'}}
                >
                  Todos
                </button>
                {deportesMap.map(d => (
                  <button
                    key={d.id}
                    onClick={()=>toggleDeporteFilter(d.id)}
                    onMouseEnter={()=>setHoveredDeporte(d.id)}
                    onMouseLeave={()=>setHoveredDeporte(null)}
                    aria-pressed={String(deporteFilter) === String(d.id)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      gap:8,
                      padding:'8px 12px',
                      borderRadius:8,
                      border:'none',
                      background: d.color,
                      color: contrastColor(d.color),
                      cursor: 'pointer',
                      boxShadow: String(deporteFilter) === String(d.id) ? '0 2px 8px rgba(0,0,0,0.15)' : (hoveredDeporte === d.id ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'),
                      transform: hoveredDeporte === d.id ? 'translateY(-1px)' : 'none',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <span style={{width:14, height:14, background: 'rgba(255,255,255,0.3)', display:'inline-block', borderRadius:3, border:'1px solid rgba(0,0,0,0.08)'}}></span>
                    <small style={{fontSize:12, color: contrastColor(d.color), fontWeight:500}}>{d.name}</small>
                  </button>
                ))}
              </div>
            </div>
            {/* cancha filter removed */}
          </div>

          <div>
            <FullCalendar
              plugins={[ timeGridPlugin, dayGridPlugin, interactionPlugin ]}
              initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
          locales={[esLocale]}
          locale={esLocale}
              events={filteredEvents}
              weekends={true}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              ref={calendarRef}
              height={600}
              nowIndicator={true}
              allDaySlot={false}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              eventOverlap={true}
            />
          </div>
        </div>
      </div>
    </>
  )
}
