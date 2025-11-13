import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'

function imageCandidatesForTorneo(id, urlFromDB) {
  const candidates = []
  if (urlFromDB && urlFromDB.trim()) {
    candidates.push(urlFromDB)
  }
  candidates.push(`/api/torneos/${id}/imagen`)
  return candidates
}

export default function TorneosAdmin(){
  const navigate = useNavigate()
  const [torneos, setTorneos] = useState([])
  const [deportes, setDeportes] = useState([])
  const [estados, setEstados] = useState([])
  const [loading, setLoading] = useState(true)
  const [permisos, setPermisos] = useState(null)
  
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [currentTorneo, setCurrentTorneo] = useState(null)
  const [formData, setFormData] = useState({
    nombreTorneo: '',
    deporte: '',
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    imagen: '',
    maxIntegrantes: 5
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailTorneo, setDetailTorneo] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [partidos, setPartidos] = useState([])
  const [activeTab, setActiveTab] = useState('equipos')
  
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState(null)
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false)
  const [equipoToDelete, setEquipoToDelete] = useState(null)
  const [clientes, setClientes] = useState([])
  const [filteredClientes, setFilteredClientes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientes, setSelectedClientes] = useState([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [teamName, setTeamName] = useState('')

  useEffect(()=>{
    // Check permissions
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u){ 
        navigate('/dashboard')
        return
      }
      const p = Number(u.permisos)
      setPermisos(p)
      // All users with permisos 1, 2, 3 can access
      if (p !== 1 && p !== 2 && p !== 3){
        navigate('/dashboard')
        return
      }
    }catch(e){ 
      navigate('/dashboard')
    }
  }, [navigate])

  useEffect(() => {
    if (permisos) {
      fetchTorneos()
      fetchDeportes()
      fetchEstados()
    }
  }, [permisos])

  async function fetchTorneos() {
    try {
      const res = await fetch('/api/torneos')
      if (res.ok) {
        const data = await res.json()
        setTorneos(data || [])
      }
    } catch (e) {
      console.error('Error fetching torneos:', e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDeportes() {
    try {
      const res = await fetch('/api/deportes')
      if (res.ok) {
        const data = await res.json()
        setDeportes(data || [])
      }
    } catch (e) {
      console.error('Error fetching deportes:', e)
    }
  }

  async function fetchEstados() {
    try {
      const res = await fetch('/api/estado-torneos')
      if (res.ok) {
        const data = await res.json()
        setEstados(data || [])
      }
    } catch (e) {
      console.error('Error fetching estados:', e)
    }
  }

  function handleAdd() {
    setModalMode('add')
    setCurrentTorneo(null)
    setFormData({
      nombreTorneo: '',
      deporte: '',
      fechaInicio: '',
      fechaFin: '',
      estado: '',
      imagen: '',
      maxIntegrantes: 5
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setShowModal(true)
  }

  function handleEdit(torneo) {
    setModalMode('edit')
    setCurrentTorneo(torneo)
    setFormData({
      nombreTorneo: torneo.nombreTorneo || '',
      deporte: torneo.deporte || '',
      fechaInicio: torneo.fechaInicio || '',
      fechaFin: torneo.fechaFin || '',
      estado: torneo.estado || '',
      imagen: torneo.imagen || '',
      maxIntegrantes: torneo.maxIntegrantes || 5
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setShowModal(true)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSave() {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('nombreTorneo', formData.nombreTorneo)
      formDataToSend.append('deporte', formData.deporte)
      formDataToSend.append('fechaInicio', formData.fechaInicio)
      formDataToSend.append('fechaFin', formData.fechaFin)
      formDataToSend.append('estado', formData.estado)
      formDataToSend.append('maxIntegrantes', formData.maxIntegrantes || 5)
      if (formData.imagen) {
        formDataToSend.append('imagen', formData.imagen)
      }
      if (selectedFile) {
        formDataToSend.append('file', selectedFile)
      }

      if (modalMode === 'add') {
        const res = await fetch('/api/torneos', {
          method: 'POST',
          body: formDataToSend
        })
        if (!res.ok) {
          const err = await res.json()
          alert('Error al crear torneo: ' + (err.error || 'Unknown'))
          return
        }
      } else {
        const res = await fetch(`/api/torneos/${currentTorneo.idTorneo}`, {
          method: 'PUT',
          body: formDataToSend
        })
        if (!res.ok) {
          const err = await res.json()
          alert('Error al actualizar torneo: ' + (err.error || 'Unknown'))
          return
        }
      }
      fetchTorneos()
      setShowModal(false)
    } catch (e) {
      console.error('Error saving torneo:', e)
      alert('Error al guardar torneo')
    }
  }

  async function handleDelete(torneo) {
    if (!window.confirm(`¿Eliminar el torneo "${torneo.nombreTorneo}"?`)) return
    try {
      const res = await fetch(`/api/torneos/${torneo.idTorneo}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Error al eliminar: ' + (err.error || 'Unknown'))
        return
      }
      fetchTorneos()
    } catch (e) {
      console.error('Error deleting torneo:', e)
      alert('Error al eliminar torneo')
    }
  }

  async function handleViewDetail(torneo) {
    setDetailTorneo(torneo)
    
    // Verificar si el torneo comienza mañana o ya comenzó
    const fechaInicio = new Date(torneo.fechaInicio)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((fechaInicio - hoy) / (1000 * 60 * 60 * 24))
    setActiveTab('equipos') // Por defecto mostrar equipos
    
    // Fetch equipos for this torneo
    try {
      const res = await fetch(`/api/equipoxcliente?torneo=${torneo.idTorneo}`)
      if (res.ok) {
        const data = await res.json()
        setEquipos(data || [])
      } else {
        setEquipos([])
      }
    } catch (e) {
      console.error('Error fetching equipos:', e)
      setEquipos([])
    }
    
    // Fetch partidos
    try {
      const res = await fetch(`/api/partidos?torneo=${torneo.idTorneo}`)
      if (res.ok) {
        const data = await res.json()
        setPartidos(data || [])
      } else {
        setPartidos([])
      }
    } catch (e) {
      console.error('Error fetching partidos:', e)
      setPartidos([])
    }
    
    setShowDetailModal(true)
  }

  async function handleAddTeamClick() {
    // Fetch all clientes
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setClientes(data || [])
        setFilteredClientes(data || [])
        setSearchTerm('')
        setSelectedClientes([])
        setTeamName('')
        setShowAddTeamModal(true)
      }
    } catch (e) {
      console.error('Error fetching clientes:', e)
      alert('Error al cargar clientes')
    }
  }

  function handleSearchChange(e) {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    if (term === '') {
      setFilteredClientes(clientes)
    } else {
      const filtered = clientes.filter(c => {
        const nombre = (c.nombre || '').toLowerCase()
        const apellido = (c.apellido || '').toLowerCase()
        return nombre.includes(term) || apellido.includes(term)
      })
      setFilteredClientes(filtered)
    }
  }

  function handleToggleCliente(idCliente) {
    if (selectedClientes.includes(idCliente)) {
      setSelectedClientes(selectedClientes.filter(id => id !== idCliente))
    } else {
      setSelectedClientes([...selectedClientes, idCliente])
    }
  }

  async function handleSaveTeam() {
    if (selectedClientes.length === 0) {
      alert('Por favor selecciona al menos un cliente')
      return
    }
    
    if (!teamName.trim()) {
      alert('Por favor ingresa un nombre para el equipo')
      return
    }
    
    // Obtener el idCliente del usuario actual
    let currentUserClientId = null
    try {
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (u && u.idCliente) {
        currentUserClientId = u.idCliente
      }
    } catch (e) {
      console.error('Error obteniendo usuario actual:', e)
    }
    
    // Combinar clientes seleccionados con el usuario actual
    const allClienteIds = [...selectedClientes]
    if (currentUserClientId && !allClienteIds.includes(currentUserClientId)) {
      allClienteIds.push(currentUserClientId)
    }
    
    const maxIntegrantes = detailTorneo?.maxIntegrantes || 5
    if (allClienteIds.length > maxIntegrantes) {
      setErrorMessage(`El equipo no puede tener más de ${maxIntegrantes} integrantes (incluyéndote a ti)`)
      setShowErrorModal(true)
      return
    }
    
    try {
      // Create equipo first
      const equipoRes = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: teamName.trim() })
      })
      
      if (!equipoRes.ok) {
        alert('Error al crear equipo')
        return
      }
      
      const equipo = await equipoRes.json()
      const idEquipo = equipo.idEquipo
      
      // Add each cliente (selected + current user) to the equipo for this torneo
      for (const idCliente of allClienteIds) {
        await fetch('/api/equipoxcliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idEquipo: idEquipo,
            idCliente: idCliente,
            idTorneo: detailTorneo.idTorneo
          })
        })
      }
      
      // Refresh equipos
      const res = await fetch(`/api/equipoxcliente?torneo=${detailTorneo.idTorneo}`)
      if (res.ok) {
        const data = await res.json()
        setEquipos(data || [])
      }
      
      setShowAddTeamModal(false)
      setShowSuccessModal(true)
    } catch (e) {
      console.error('Error saving team:', e)
      alert('Error al agregar equipo')
    }
  }

  async function handleEditTeamClick(equipo) {
    // Cargar los clientes actuales del equipo
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setClientes(data || [])
        setFilteredClientes(data || [])
        setSearchTerm('')
        
        // Seleccionar los clientes que ya están en el equipo
        setSelectedClientes(equipo.clientes.map(c => {
          // Buscar el idCliente por documento
          const cliente = data.find(cl => cl.numeroDoc === c.documento)
          return cliente ? cliente.idCliente : null
        }).filter(id => id !== null))
        
        setTeamName(equipo.nombreEquipo)
        setEditingEquipo(equipo)
        setShowEditTeamModal(true)
      }
    } catch (e) {
      console.error('Error fetching clientes:', e)
      alert('Error al cargar clientes')
    }
  }

  async function handleUpdateTeam() {
    if (selectedClientes.length === 0) {
      alert('Por favor selecciona al menos un cliente')
      return
    }
    
    if (!teamName.trim()) {
      alert('Por favor ingresa un nombre para el equipo')
      return
    }
    
    const maxIntegrantes = detailTorneo?.maxIntegrantes || 5
    if (selectedClientes.length > maxIntegrantes) {
      setErrorMessage(`El equipo no puede tener más de ${maxIntegrantes} integrantes`)
      setShowErrorModal(true)
      return
    }
    
    try {
      // Actualizar el nombre del equipo
      await fetch(`/api/equipos/${editingEquipo.idEquipo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: teamName.trim() })
      })
      
      // Obtener TODAS las relaciones actuales del equipo desde la base de datos
      const equiposActualesRes = await fetch(`/api/equipoxcliente?torneo=${detailTorneo.idTorneo}`)
      const todosEquipos = equiposActualesRes.ok ? await equiposActualesRes.json() : []
      const equiposActuales = todosEquipos.filter(eq => eq.idEquipo === editingEquipo.idEquipo)
      
      // Crear un mapa de idCliente por documento para facilitar la búsqueda
      const clientesPorDoc = {}
      clientes.forEach(cl => {
        clientesPorDoc[cl.numeroDoc] = cl.idCliente
      })
      
      // Obtener los IDs de los clientes actuales en el equipo
      const clientesActualesIds = equiposActuales.map(eq => 
        clientesPorDoc[eq.documentoCliente]
      ).filter(id => id !== undefined && id !== null)
      
      console.log('Clientes actuales:', clientesActualesIds)
      console.log('Clientes seleccionados:', selectedClientes)
      
      // Determinar qué clientes eliminar (están en actuales pero no en seleccionados)
      const clientesAEliminar = equiposActuales.filter(eq => {
        const idCliente = clientesPorDoc[eq.documentoCliente]
        return idCliente && !selectedClientes.includes(idCliente)
      })
      
      // Determinar qué clientes agregar (están en seleccionados pero no en actuales)
      const clientesAAgregar = selectedClientes.filter(id => 
        !clientesActualesIds.includes(id)
      )
      
      console.log('A eliminar:', clientesAEliminar.map(eq => eq.idEquipoxCliente))
      console.log('A agregar:', clientesAAgregar)
      
      // Eliminar clientes que ya no están seleccionados
      for (const equipoCliente of clientesAEliminar) {
        const deleteRes = await fetch(`/api/equipoxcliente/${equipoCliente.idEquipoxCliente}`, {
          method: 'DELETE'
        })
        console.log(`Eliminado equipoxcliente ${equipoCliente.idEquipoxCliente}:`, deleteRes.ok)
      }
      
      // Agregar nuevos clientes
      for (const idCliente of clientesAAgregar) {
        const postRes = await fetch('/api/equipoxcliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idEquipo: editingEquipo.idEquipo,
            idCliente: idCliente,
            idTorneo: detailTorneo.idTorneo
          })
        })
        console.log(`Agregado cliente ${idCliente}:`, postRes.ok)
      }
      
      // Refresh equipos
      const res = await fetch(`/api/equipoxcliente?torneo=${detailTorneo.idTorneo}`)
      if (res.ok) {
        const data = await res.json()
        setEquipos(data || [])
      }
      
      setShowEditTeamModal(false)
      setEditingEquipo(null)
      setShowEditSuccessModal(true)
    } catch (e) {
      console.error('Error updating team:', e)
      alert('Error al actualizar equipo')
    }
  }

  async function handleDeleteTeam(equipo) {
    setEquipoToDelete(equipo)
    setShowConfirmDeleteModal(true)
  }

  async function confirmDeleteTeam() {
    if (!equipoToDelete) return
    
    setShowConfirmDeleteModal(false)
    
    try {
      // Eliminar todas las relaciones del equipo para este torneo
      const equiposActuales = equipos.filter(eq => eq.idEquipo === equipoToDelete.idEquipo)
      for (const eq of equiposActuales) {
        await fetch(`/api/equipoxcliente/${eq.idEquipoxCliente}`, {
          method: 'DELETE'
        })
      }
      
      // Eliminar el equipo
      await fetch(`/api/equipos/${equipoToDelete.idEquipo}`, {
        method: 'DELETE'
      })
      
      // Refresh equipos
      const res = await fetch(`/api/equipoxcliente?torneo=${detailTorneo.idTorneo}`)
      if (res.ok) {
        const data = await res.json()
        setEquipos(data || [])
      }
      
      setEquipoToDelete(null)
      setShowDeleteSuccessModal(true)
    } catch (e) {
      console.error('Error deleting team:', e)
      setErrorMessage('Error al eliminar equipo')
      setShowErrorModal(true)
      setEquipoToDelete(null)
    }
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

  function getDeporteNombre(id) {
    const d = deportes.find(x => x.idDeporte === id)
    return d ? d.nombre : id
  }

  function getEstadoNombre(id) {
    const e = estados.find(x => x.idEstadoTorneo === id)
    return e ? e.nombre : id
  }

  function getImageFilter(estadoNombre) {
    if (!estadoNombre || typeof estadoNombre !== 'string') return 'none'
    const nombreLower = estadoNombre.toLowerCase()
    if (nombreLower.includes('suspendido')) {
      return 'sepia(100%) saturate(300%) hue-rotate(10deg) brightness(0.9)'
    }
    if (nombreLower.includes('cancelado')) {
      return 'sepia(100%) saturate(300%) hue-rotate(-20deg) brightness(0.8)'
    }
    return 'none'
  }

  function isTorneoDisabled(estadoNombre) {
    if (!estadoNombre || typeof estadoNombre !== 'string') return false
    const nombreLower = estadoNombre.toLowerCase()
    return nombreLower.includes('suspendido') || nombreLower.includes('cancelado')
  }

  function canAddTeam(torneo) {
    if (!torneo || !torneo.fechaInicio) return false
    
    // Verificar estado
    if (isTorneoDisabled(getEstadoNombre(torneo.estado))) return false
    
    // Verificar fecha (no permitir agregar equipos desde el día anterior al inicio)
    const fechaInicio = new Date(torneo.fechaInicio)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((fechaInicio - hoy) / (1000 * 60 * 60 * 24))
    return diffDays >= 1 // Solo permitir si falta más de 1 día
  }

  const [showConfirmGenerar, setShowConfirmGenerar] = useState(false)
  const [showResultadoGenerar, setShowResultadoGenerar] = useState(false)
  const [resultadoGenerar, setResultadoGenerar] = useState(null)

  async function handleGenerarPartidos() {
    if (!detailTorneo) return
    setShowConfirmGenerar(true)
  }

  async function confirmarGenerarPartidos() {
    setShowConfirmGenerar(false)
    
    try {
      const response = await fetch(`/api/torneos/${detailTorneo.idTorneo}/generar-partidos`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar partidos')
      }
      
      const result = await response.json()
      setResultadoGenerar(result)
      setShowResultadoGenerar(true)
      
      // Recargar los partidos
      const partidosRes = await fetch(`/api/partidos?torneo=${detailTorneo.idTorneo}`)
      if (partidosRes.ok) {
        const partidosData = await partidosRes.json()
        setPartidos(partidosData)
        setActiveTab('partidos') // Cambiar a la pestaña de partidos
      }
    } catch (error) {
      console.error('Error generando partidos:', error)
      alert('Error al generar partidos: ' + error.message)
    }
  }

  const isSupervisor = permisos === 3

  return (
    <div style={{minHeight:'100vh', background:'var(--gris)'}}>
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              {isSupervisor && (
                <>
                  <Link to="/proximas-reservas" className="nav-link btn-calendar">Próximas Reservas</Link>
                  <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
                  <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
                  <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
                  <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                  <Link to="/pagos" className="nav-link btn-perfil">Pagos</Link>
                  <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
                </>
              )}
              {!isSupervisor && (
                <>
                  <Link to="/dashboard" className="nav-link btn-reservas">Reservar</Link>
                  <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                  <Link to="/mis-reservas" className="nav-link btn-calendar">Mis Reservas</Link>
                </>
              )}
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:120, paddingBottom:60}}>
        <h1 style={{textAlign:'center', fontSize:36, marginBottom:40, color:'var(--verde-oscuro)'}}>
          {isSupervisor ? 'Gestión de Torneos' : 'Torneos'}
        </h1>
        
        {isSupervisor && (
          <div style={{marginBottom:24, textAlign:'right'}}>
            <button onClick={handleAdd} className="btn" style={{padding:'12px 24px'}}>
              Agregar Torneo
            </button>
          </div>
        )}

        {loading ? (
          <p style={{textAlign:'center', fontSize:18}}>Cargando...</p>
        ) : torneos.length === 0 ? (
          <p style={{textAlign:'center', fontSize:18, color:'#666'}}>
            No hay torneos disponibles.
          </p>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:24}}>
            {torneos.map(t => (
              <div key={t.idTorneo} 
                   style={{
                     background:'white', 
                     borderRadius:12, 
                     overflow:'hidden', 
                     boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
                     cursor:'pointer',
                     transition:'transform 0.2s',
                   }}
                   onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                   onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                   onClick={() => handleViewDetail(t)}
              >
                <div style={{width:'100%', height:200, overflow:'hidden', background:'#f0f0f0'}}>
                  <SmartImage 
                    candidates={imageCandidatesForTorneo(t.idTorneo, t.imagen)}
                    alt={t.nombreTorneo}
                    style={{
                      width:'100%', 
                      height:'100%', 
                      objectFit:'cover',
                      filter: getImageFilter(getEstadoNombre(t.estado))
                    }}
                  />
                </div>
                <div style={{padding:16}}>
                  <h3 style={{fontSize:20, marginBottom:8, color:'var(--verde-oscuro)'}}>{t.nombreTorneo}</h3>
                  <p style={{fontSize:14, color:'#666', marginBottom:4}}>
                    Deporte: {getDeporteNombre(t.deporte)}
                  </p>
                  <p style={{fontSize:14, color:'#666', marginBottom:4}}>
                    Inicio: {t.fechaInicio}
                  </p>
                  <p style={{fontSize:14, color:'#666', marginBottom:4}}>
                    Fin: {t.fechaFin}
                  </p>
                  <p style={{fontSize:14, color:'#666', marginBottom:12}}>
                    Estado: {getEstadoNombre(t.estado)}
                  </p>
                  {isSupervisor && (
                    <div style={{display:'flex', gap:8}}>
                      <button onClick={(e) => {e.stopPropagation(); handleEdit(t)}} 
                              className="btn" 
                              style={{flex:1, padding:'8px'}}>
                        Editar
                      </button>
                      <button onClick={(e) => {e.stopPropagation(); handleDelete(t)}} 
                              className="btn" 
                              style={{flex:1, padding:'8px', background:'#d32f2f'}}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
          <div style={{background:'white', borderRadius:12, padding:32, width:'90%', maxWidth:600, maxHeight:'90vh', overflow:'auto', position:'relative'}}>
            <button 
              onClick={() => setShowModal(false)}
              style={{
                position:'absolute',
                top:16,
                right:16,
                background:'transparent',
                border:'none',
                fontSize:24,
                cursor:'pointer',
                color:'#666',
                width:32,
                height:32,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                borderRadius:4,
                transition:'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ×
            </button>
            <h2 style={{fontSize:24, marginBottom:24, color:'var(--verde-oscuro)'}}>
              {modalMode === 'add' ? 'Agregar Torneo' : 'Editar Torneo'}
            </h2>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Nombre</label>
              <input 
                type="text"
                value={formData.nombreTorneo}
                onChange={e => setFormData({...formData, nombreTorneo: e.target.value})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Deporte</label>
              <select
                value={formData.deporte}
                onChange={e => setFormData({...formData, deporte: e.target.value})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              >
                <option value="">Seleccionar...</option>
                {deportes.map(d => (
                  <option key={d.idDeporte} value={d.idDeporte}>{d.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Fecha Inicio</label>
              <input 
                type="date"
                value={formData.fechaInicio}
                onChange={e => setFormData({...formData, fechaInicio: e.target.value})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Fecha Fin</label>
              <input 
                type="date"
                value={formData.fechaFin}
                onChange={e => setFormData({...formData, fechaFin: e.target.value})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Estado</label>
              <select
                value={formData.estado}
                onChange={e => setFormData({...formData, estado: e.target.value})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              >
                <option value="">Seleccionar...</option>
                {estados.map(e => (
                  <option key={e.idEstadoTorneo} value={e.idEstadoTorneo}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>URL Imagen</label>
              <input 
                type="text"
                value={formData.imagen}
                onChange={e => setFormData({...formData, imagen: e.target.value})}
                placeholder="/assets/... o http://..."
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:4, fontWeight:500}}>Máximo de Integrantes por Equipo</label>
              <input 
                type="number"
                min="1"
                max="20"
                value={formData.maxIntegrantes}
                onChange={e => setFormData({...formData, maxIntegrantes: parseInt(e.target.value) || 5})}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:8, fontWeight:500}}>O subir imagen desde computadora</label>
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}
              />
              {previewUrl && (
                <div style={{marginTop:12}}>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{maxWidth:'100%', maxHeight:200, borderRadius:8, objectFit:'cover'}}
                  />
                </div>
              )}
            </div>

            <div style={{display:'flex', gap:12}}>
              <button onClick={handleSave} className="btn" style={{flex:1, padding:12, background:'#19350C', color:'white'}}>
                Guardar
              </button>
              <button onClick={() => setShowModal(false)} className="btn" style={{flex:1, padding:12, background:'#666'}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailTorneo && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
          <div style={{background:'white', borderRadius:12, padding:32, width:'90%', maxWidth:800, maxHeight:'90vh', overflow:'auto', position:'relative'}}>
            <button 
              onClick={() => setShowDetailModal(false)}
              style={{
                position:'absolute',
                top:16,
                right:16,
                background:'transparent',
                border:'none',
                fontSize:24,
                cursor:'pointer',
                color:'#666',
                width:32,
                height:32,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                borderRadius:4,
                transition:'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ×
            </button>
            <h2 style={{fontSize:28, marginBottom:24, color:'var(--verde-oscuro)'}}>
              {detailTorneo.nombreTorneo}
            </h2>
            
            <div style={{marginBottom:24}}>
              <div style={{width:'100%', height:300, overflow:'hidden', borderRadius:8, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f0f0'}}>
                <SmartImage 
                  candidates={imageCandidatesForTorneo(detailTorneo.idTorneo, detailTorneo.imagen)}
                  alt={detailTorneo.nombreTorneo}
                  style={{
                    width:'100%', 
                    height:'100%', 
                    objectFit:'cover',
                    filter: getImageFilter(getEstadoNombre(detailTorneo.estado))
                  }}
                />
              </div>
              <p style={{fontSize:16, marginBottom:8}}>
                <strong>Deporte:</strong> {getDeporteNombre(detailTorneo.deporte)}
              </p>
              <p style={{fontSize:16, marginBottom:8}}>
                <strong>Fecha Inicio:</strong> {detailTorneo.fechaInicio}
              </p>
              <p style={{fontSize:16, marginBottom:8}}>
                <strong>Fecha Fin:</strong> {detailTorneo.fechaFin}
              </p>
              <p style={{fontSize:16, marginBottom:16}}>
                <strong>Estado:</strong> {getEstadoNombre(detailTorneo.estado)}
              </p>
            </div>

            {/* Tabs */}
            <div style={{marginBottom:24, borderBottom:'2px solid #ddd'}}>
              <button
                onClick={() => setActiveTab('equipos')}
                style={{
                  padding:'12px 24px',
                  background: activeTab === 'equipos' ? 'var(--verde-oscuro)' : 'transparent',
                  color: activeTab === 'equipos' ? 'white' : '#666',
                  border:'none',
                  borderBottom: activeTab === 'equipos' ? '3px solid var(--verde-oscuro)' : 'none',
                  cursor:'pointer',
                  fontSize:16,
                  fontWeight:600,
                  marginRight:8
                }}
              >
                Equipos
              </button>
              <button
                onClick={() => setActiveTab('partidos')}
                style={{
                  padding:'12px 24px',
                  background: activeTab === 'partidos' ? 'var(--verde-oscuro)' : 'transparent',
                  color: activeTab === 'partidos' ? 'white' : '#666',
                  border:'none',
                  borderBottom: activeTab === 'partidos' ? '3px solid var(--verde-oscuro)' : 'none',
                  cursor:'pointer',
                  fontSize:16,
                  fontWeight:600
                }}
              >
                Partidos
              </button>
            </div>

            {/* Contenido de Equipos */}
            {activeTab === 'equipos' && (
              <>
                <h3 style={{fontSize:20, marginBottom:16, color:'var(--verde-oscuro)'}}>
                  Equipos Participantes
                </h3>
            
            {equipos.length === 0 ? (
              <p style={{fontSize:16, color:'#666', marginBottom:24}}>
                No hay equipos registrados para este torneo.
              </p>
            ) : (
              <div style={{marginBottom:24}}>
                {(() => {
                  // Agrupar clientes por equipo
                  const equiposMap = {}
                  equipos.forEach(eq => {
                    if (!equiposMap[eq.idEquipo]) {
                      equiposMap[eq.idEquipo] = {
                        idEquipo: eq.idEquipo,
                        nombreEquipo: eq.nombreEquipo || `Equipo #${eq.idEquipo}`,
                        clientes: []
                      }
                    }
                    equiposMap[eq.idEquipo].clientes.push({
                      nombre: eq.nombreCliente,
                      apellido: eq.apellidoCliente,
                      documento: eq.documentoCliente
                    })
                  })
                  
                  return Object.values(equiposMap).map(equipo => (
                    <div key={equipo.idEquipo} style={{marginBottom:16, padding:16, background:'#f9f9f9', borderRadius:8, border:'1px solid #ddd'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                        <h4 style={{fontSize:18, margin:0, color:'var(--verde-oscuro)'}}>
                          {equipo.nombreEquipo}
                        </h4>
                        <div style={{display:'flex', gap:8}}>
                          <button
                            onClick={() => handleEditTeamClick(equipo)}
                            className="btn"
                            style={{
                              padding:'8px 16px',
                              background:'#406768',
                              color:'white',
                              fontSize:14
                            }}
                          >
                            Editar
                          </button>
                          {(permisos === 2 || permisos === 3) && (
                            <button
                              onClick={() => handleDeleteTeam(equipo)}
                              className="btn"
                              style={{
                                padding:'8px 16px',
                                background:'#d32f2f',
                                color:'white',
                                fontSize:14
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                        {equipo.clientes.map((cliente, idx) => (
                          <div key={idx} style={{padding:'6px 12px', background:'white', borderRadius:6, border:'1px solid #ddd', fontSize:14}}>
                            {cliente.nombre} {cliente.apellido} <span style={{color:'#666'}}>(Doc: {cliente.documento})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {!isSupervisor && (
              <div style={{marginBottom:24}}>
                <button 
                  onClick={handleAddTeamClick} 
                  className="btn" 
                  style={{padding:'12px 24px'}}
                  disabled={!canAddTeam(detailTorneo)}
                >
                  Agregar mi Equipo
                </button>
                {!canAddTeam(detailTorneo) && (
                  <p style={{fontSize:14, color:'#d32f2f', marginTop:8}}>
                    {isTorneoDisabled(getEstadoNombre(detailTorneo.estado)) 
                      ? `No se pueden agregar equipos a torneos ${getEstadoNombre(detailTorneo.estado).toLowerCase()}`
                      : 'No se pueden agregar equipos a partir del día anterior al inicio del torneo'}
                  </p>
                )}
              </div>
            )}
              </>
            )}

            {/* Contenido de Partidos */}
            {activeTab === 'partidos' && (
              <>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                  <h3 style={{fontSize:20, margin:0, color:'var(--verde-oscuro)'}}>
                    Partidos del Torneo
                  </h3>
                  {isSupervisor && (
                    <button
                      onClick={handleGenerarPartidos}
                      className="btn"
                      style={{
                        padding:'10px 20px',
                        background:'var(--verde-oscuro)',
                        color:'white',
                        fontSize:14
                      }}
                    >
                      {partidos.length > 0 ? 'Regenerar Partidos' : 'Generar Partidos'}
                    </button>
                  )}
                </div>
                
                {partidos.length === 0 ? (
                  <p style={{fontSize:16, color:'#666', marginBottom:24}}>
                    No hay partidos programados para este torneo.
                  </p>
                ) : (
                  <div style={{marginBottom:24}}>
                    {partidos.map(p => (
                      <div key={p.idPartido} style={{marginBottom:16, padding:16, background:'#f9f9f9', borderRadius:8, border:'1px solid #ddd'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                          <h4 style={{fontSize:18, color:'var(--verde-oscuro)', margin:0}}>
                            {p.equipoLocal?.nombre || `Equipo #${p.equipoLocal}`} vs {p.equipoVisitante?.nombre || `Equipo #${p.equipoVisitante}`}
                          </h4>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:14}}>
                          <div>
                            <p style={{marginBottom:4}}><strong>Fecha:</strong> {p.fecha}</p>
                            <p style={{marginBottom:4}}><strong>Horario:</strong> {p.horario ? `${p.horario.horaInicio} - ${p.horario.horaFin}` : 'N/A'}</p>
                          </div>
                          <div>
                            <p style={{marginBottom:4}}><strong>Cancha:</strong> {p.cancha?.nombre || 'N/A'}</p>
                            <p style={{marginBottom:4}}><strong>Resultado:</strong> {p.resultado || 'Pendiente'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button onClick={() => setShowDetailModal(false)} className="btn" style={{padding:12, background:'#666'}}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001}}>
          <div style={{background:'white', borderRadius:12, padding:32, width:'90%', maxWidth:700, maxHeight:'90vh', overflow:'auto'}}>
            <h2 style={{fontSize:24, marginBottom:24, color:'var(--verde-oscuro)'}}>
              Agregar Equipo al Torneo
            </h2>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:8, fontWeight:500}}>Nombre del Equipo</label>
              <input 
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Ingresa el nombre del equipo"
                style={{width:'100%', padding:12, border:'1px solid #ddd', borderRadius:4, fontSize:16}}
              />
            </div>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:8, fontWeight:500}}>Buscar clientes por nombre o apellido</label>
              <input 
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Escribe para buscar..."
                style={{width:'100%', padding:12, border:'1px solid #ddd', borderRadius:4, fontSize:16}}
              />
            </div>

            <div style={{marginBottom:24, maxHeight:400, overflow:'auto', border:'1px solid #ddd', borderRadius:8, padding:8}}>
              {filteredClientes.length === 0 ? (
                <p style={{padding:16, textAlign:'center', color:'#666'}}>No se encontraron clientes</p>
              ) : (
                filteredClientes.map(c => (
                  <div 
                    key={c.idCliente}
                    onClick={() => handleToggleCliente(c.idCliente)}
                    style={{
                      padding:12,
                      marginBottom:8,
                      background: selectedClientes.includes(c.idCliente) ? '#e3f2fd' : '#f9f9f9',
                      border: selectedClientes.includes(c.idCliente) ? '2px solid #2196f3' : '1px solid #ddd',
                      borderRadius:8,
                      cursor:'pointer',
                      transition:'all 0.2s'
                    }}
                  >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <strong>{c.nombre} {c.apellido}</strong>
                        <p style={{fontSize:14, color:'#666', margin:'4px 0 0 0'}}>
                          Doc: {c.numeroDoc} - Email: {c.mail || 'N/A'}
                        </p>
                      </div>
                      {selectedClientes.includes(c.idCliente) && (
                        <span style={{color:'#2196f3', fontSize:20}}>✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p style={{marginBottom:16, color:'#666', fontSize:14}}>
              {selectedClientes.length} cliente(s) seleccionado(s) de {detailTorneo?.maxIntegrantes || 5} máximo
            </p>

            <div style={{display:'flex', gap:12}}>
              <button onClick={handleSaveTeam} className="btn" style={{flex:1, padding:12}}>
                {teamName.trim() ? `Crear "${teamName.trim()}"` : 'Crear Equipo'} ({selectedClientes.length} miembros)
              </button>
              <button onClick={() => setShowAddTeamModal(false)} className="btn" style={{flex:1, padding:12, background:'#666'}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001}}>
          <div style={{background:'white', borderRadius:12, padding:32, width:'90%', maxWidth:700, maxHeight:'90vh', overflow:'auto'}}>
            <h2 style={{fontSize:24, marginBottom:24, color:'var(--verde-oscuro)'}}>
              Editar Equipo
            </h2>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:8, fontWeight:500}}>Nombre del Equipo</label>
              <input 
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Ingresa el nombre del equipo"
                style={{width:'100%', padding:12, border:'1px solid #ddd', borderRadius:4, fontSize:16}}
              />
            </div>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:8, fontWeight:500}}>Buscar clientes por nombre o apellido</label>
              <input 
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Escribe para buscar..."
                style={{width:'100%', padding:12, border:'1px solid #ddd', borderRadius:4, fontSize:16}}
              />
            </div>

            <div style={{marginBottom:24, maxHeight:400, overflow:'auto', border:'1px solid #ddd', borderRadius:8, padding:8}}>
              {filteredClientes.length === 0 ? (
                <p style={{padding:16, textAlign:'center', color:'#666'}}>No se encontraron clientes</p>
              ) : (
                filteredClientes.map(c => (
                  <div 
                    key={c.idCliente}
                    onClick={() => handleToggleCliente(c.idCliente)}
                    style={{
                      padding:12,
                      marginBottom:8,
                      background: selectedClientes.includes(c.idCliente) ? '#e3f2fd' : '#f9f9f9',
                      border: selectedClientes.includes(c.idCliente) ? '2px solid #2196f3' : '1px solid #ddd',
                      borderRadius:8,
                      cursor:'pointer',
                      transition:'all 0.2s'
                    }}
                  >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <strong>{c.nombre} {c.apellido}</strong>
                        <p style={{fontSize:14, color:'#666', margin:'4px 0 0 0'}}>
                          Doc: {c.numeroDoc} - Email: {c.mail || 'N/A'}
                        </p>
                      </div>
                      {selectedClientes.includes(c.idCliente) && (
                        <span style={{color:'#2196f3', fontSize:20}}>✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p style={{marginBottom:16, color:'#666', fontSize:14}}>
              {selectedClientes.length} cliente(s) seleccionado(s) de {detailTorneo?.maxIntegrantes || 5} máximo
            </p>

            <div style={{display:'flex', gap:12}}>
              <button onClick={handleUpdateTeam} className="btn" style={{flex:1, padding:12}}>
                Actualizar Equipo ({selectedClientes.length} miembros)
              </button>
              <button onClick={() => {
                setShowEditTeamModal(false)
                setEditingEquipo(null)
              }} className="btn" style={{flex:1, padding:12, background:'#666'}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para generar partidos */}
      {showConfirmGenerar && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.6)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1002
        }}>
          <div style={{
            background:'linear-gradient(135deg, #406768 0%, #6FA9BB 100%)',
            borderRadius:16,
            padding:40,
            maxWidth:500,
            width:'90%',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
            textAlign:'center',
            color:'white'
          }}>
            <div style={{
              width:80,
              height:80,
              borderRadius:'50%',
              background:'rgba(255,255,255,0.2)',
              margin:'0 auto 24px',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:48
            }}>
              ⚠️
            </div>
            <h2 style={{fontSize:28, marginBottom:16, fontWeight:600}}>
              ¿Generar Partidos?
            </h2>
            <p style={{fontSize:16, marginBottom:32, opacity:0.9, lineHeight:1.5}}>
              ¿Estás seguro de generar los partidos para este torneo? {partidos.length > 0 && 'Si ya existen partidos, serán eliminados y reemplazados.'}
            </p>
            <div style={{display:'flex', gap:16, justifyContent:'center'}}>
              <button
                onClick={() => setShowConfirmGenerar(false)}
                style={{
                  padding:'12px 32px',
                  fontSize:16,
                  borderRadius:8,
                  border:'2px solid white',
                  background:'transparent',
                  color:'white',
                  cursor:'pointer',
                  fontWeight:600,
                  transition:'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarGenerarPartidos}
                style={{
                  padding:'12px 32px',
                  fontSize:16,
                  borderRadius:8,
                  border:'none',
                  background:'white',
                  color:'#406768',
                  cursor:'pointer',
                  fontWeight:600,
                  transition:'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado de generar partidos */}
      {showResultadoGenerar && resultadoGenerar && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          background:'rgba(0,0,0,0.6)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1002
        }}>
          <div style={{
            background:'linear-gradient(135deg, #19350C 0%, #687D31 100%)',
            borderRadius:16,
            padding:40,
            maxWidth:500,
            width:'90%',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
            textAlign:'center',
            color:'white'
          }}>
            <div style={{
              width:80,
              height:80,
              borderRadius:'50%',
              background:'rgba(255,255,255,0.2)',
              margin:'0 auto 24px',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:48
            }}>
              ✓
            </div>
            <h2 style={{fontSize:28, marginBottom:16, fontWeight:600}}>
              ¡Partidos generados exitosamente!
            </h2>
            <div style={{fontSize:18, marginBottom:32, opacity:0.9}}>
              <p style={{marginBottom:8}}>
                <strong>Partidos creados:</strong> {resultadoGenerar.partidos_creados}
              </p>
              <p>
                <strong>Equipos participantes:</strong> {resultadoGenerar.equipos}
              </p>
            </div>
            <button
              onClick={() => {
                setShowResultadoGenerar(false)
                setResultadoGenerar(null)
              }}
              style={{
                padding:'12px 48px',
                fontSize:16,
                borderRadius:8,
                border:'none',
                background:'white',
                color:'#19350C',
                cursor:'pointer',
                fontWeight:600,
                transition:'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002}}>
          <div style={{background:'linear-gradient(135deg, #19350C 0%, #687D31 100%)', borderRadius:16, padding:40, maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:'2px solid rgba(255,255,255,0.1)'}}>
            <h2 style={{fontSize:28, marginBottom:20, color:'white', textAlign:'center', textTransform:'uppercase', letterSpacing:'2px', fontWeight:700}}>
              Equipo Agregado Exitosamente
            </h2>
            <div style={{textAlign:'center', marginBottom:28}}>
              <div style={{
                fontSize:64, 
                color:'white',
                background:'rgba(255,255,255,0.2)',
                width:80,
                height:80,
                borderRadius:'50%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                margin:'0 auto',
                border:'3px solid rgba(255,255,255,0.3)'
              }}>✓</div>
            </div>
            <button 
              onClick={() => setShowSuccessModal(false)} 
              style={{
                width:'100%',
                padding:'14px 28px',
                background:'rgba(255,255,255,0.25)',
                border:'2px solid rgba(255,255,255,0.4)',
                borderRadius:8,
                color:'white',
                fontSize:18,
                fontWeight:700,
                cursor:'pointer',
                transition:'all 0.3s',
                textTransform:'uppercase',
                letterSpacing:'1px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Edit Success Modal */}
      {showEditSuccessModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002}}>
          <div style={{background:'linear-gradient(135deg, #19350C 0%, #687D31 100%)', borderRadius:16, padding:40, maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:'2px solid rgba(255,255,255,0.1)'}}>
            <h2 style={{fontSize:28, marginBottom:20, color:'white', textAlign:'center', textTransform:'uppercase', letterSpacing:'2px', fontWeight:700}}>
              Equipo Actualizado Exitosamente
            </h2>
            <div style={{textAlign:'center', marginBottom:28}}>
              <div style={{
                fontSize:64, 
                color:'white',
                background:'rgba(255,255,255,0.2)',
                width:80,
                height:80,
                borderRadius:'50%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                margin:'0 auto',
                border:'3px solid rgba(255,255,255,0.3)'
              }}>✓</div>
            </div>
            <button 
              onClick={() => setShowEditSuccessModal(false)} 
              style={{
                width:'100%',
                padding:'14px 28px',
                background:'rgba(255,255,255,0.25)',
                border:'2px solid rgba(255,255,255,0.4)',
                borderRadius:8,
                color:'white',
                fontSize:18,
                fontWeight:700,
                cursor:'pointer',
                transition:'all 0.3s',
                textTransform:'uppercase',
                letterSpacing:'1px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002}}>
          <div style={{background:'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)', borderRadius:16, padding:40, maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:'2px solid rgba(255,255,255,0.1)'}}>
            <div style={{textAlign:'center', marginBottom:24}}>
              <div style={{
                fontSize:64, 
                color:'white',
                background:'rgba(255,255,255,0.2)',
                width:80,
                height:80,
                borderRadius:'50%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                margin:'0 auto',
                border:'3px solid rgba(255,255,255,0.3)'
              }}>⚠</div>
            </div>
            <h2 style={{fontSize:24, marginBottom:16, color:'white', textAlign:'center', fontWeight:600}}>
              Error
            </h2>
            <p style={{fontSize:16, marginBottom:28, color:'white', textAlign:'center', opacity:0.95}}>
              {errorMessage}
            </p>
            <button 
              onClick={() => {
                setShowErrorModal(false)
                setErrorMessage('')
              }} 
              style={{
                width:'100%',
                padding:'12px 28px',
                background:'white',
                border:'none',
                borderRadius:8,
                color:'#d32f2f',
                fontSize:16,
                fontWeight:700,
                cursor:'pointer',
                transition:'all 0.3s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDeleteModal && equipoToDelete && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002}}>
          <div style={{
            background:'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
            borderRadius:16,
            padding:40,
            maxWidth:500,
            width:'90%',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
            textAlign:'center',
            color:'white'
          }}>
            <div style={{
              width:80,
              height:80,
              borderRadius:'50%',
              background:'rgba(255,255,255,0.2)',
              margin:'0 auto 24px',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:48
            }}>
              ⚠️
            </div>
            <h2 style={{fontSize:28, marginBottom:16, fontWeight:600}}>
              ¿Eliminar Equipo?
            </h2>
            <p style={{fontSize:16, marginBottom:32, opacity:0.9, lineHeight:1.5}}>
              ¿Estás seguro de eliminar el equipo "{equipoToDelete.nombreEquipo}"? Esta acción no se puede deshacer.
            </p>
            <div style={{display:'flex', gap:16, justifyContent:'center'}}>
              <button
                onClick={() => {
                  setShowConfirmDeleteModal(false)
                  setEquipoToDelete(null)
                }}
                style={{
                  padding:'12px 32px',
                  fontSize:16,
                  borderRadius:8,
                  border:'2px solid white',
                  background:'transparent',
                  color:'white',
                  cursor:'pointer',
                  fontWeight:600,
                  transition:'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTeam}
                style={{
                  padding:'12px 32px',
                  fontSize:16,
                  borderRadius:8,
                  border:'none',
                  background:'white',
                  color:'#d32f2f',
                  cursor:'pointer',
                  fontWeight:600,
                  transition:'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteSuccessModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002}}>
          <div style={{background:'linear-gradient(135deg, #19350C 0%, #687D31 100%)', borderRadius:16, padding:40, maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:'2px solid rgba(255,255,255,0.1)'}}>
            <h2 style={{fontSize:28, marginBottom:20, color:'white', textAlign:'center', textTransform:'uppercase', letterSpacing:'2px', fontWeight:700}}>
              Equipo Eliminado Exitosamente
            </h2>
            <div style={{textAlign:'center', marginBottom:28}}>
              <div style={{
                fontSize:64, 
                color:'white',
                background:'rgba(255,255,255,0.2)',
                width:80,
                height:80,
                borderRadius:'50%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                margin:'0 auto',
                border:'3px solid rgba(255,255,255,0.3)'
              }}>✓</div>
            </div>
            <button 
              onClick={() => setShowDeleteSuccessModal(false)} 
              style={{
                width:'100%',
                padding:'14px 28px',
                background:'rgba(255,255,255,0.25)',
                border:'2px solid rgba(255,255,255,0.4)',
                borderRadius:8,
                color:'white',
                fontSize:18,
                fontWeight:700,
                cursor:'pointer',
                transition:'all 0.3s',
                textTransform:'uppercase',
                letterSpacing:'1px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
