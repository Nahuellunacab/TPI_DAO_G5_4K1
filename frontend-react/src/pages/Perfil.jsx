import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmartImage from '../components/SmartImage'

export default function Perfil(){
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({})
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(()=>{
    loadUsuario()
  }, [])

  async function loadUsuario(){
    setLoading(true)
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || !u.idUsuario){
        navigate('/login')
        return
      }
      
      // Fetch full user data from API
      const res = await fetch(`/api/usuarios/${u.idUsuario}`)
      if (!res.ok) throw new Error('No se pudo obtener información del usuario')
      const data = await res.json()
      setUsuario(data)
      setEditData({
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        telefono: data.telefono || '',
        mail: data.mail || ''
      })
    }catch(e){
      console.error(e)
      // If error, try to use localStorage data as fallback
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (u){
        setUsuario(u)
        setEditData({
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          telefono: u.telefono || '',
          mail: u.mail || ''
        })
      }
    }finally{
      setLoading(false)
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

  function handleImageChange(e){
    const file = e.target.files[0]
    if (file){
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  async function handleSaveProfile(){
    if (!usuario) return
    setModalSubmitting(true)
    setModalError(null)
    try{
      const formData = new FormData()
      if (imageFile){
        formData.append('imagen', imageFile)
      }
      formData.append('nombre', editData.nombre || '')
      formData.append('apellido', editData.apellido || '')
      formData.append('telefono', editData.telefono || '')
      formData.append('mail', editData.mail || '')

      const res = await fetch(`/api/usuarios/${usuario.idUsuario}`, {
        method: 'PUT',
        body: formData
      })
      
      if (!res.ok){
        const err = await res.json().catch(()=>({}))
        setModalError(err.error || 'Error al guardar cambios')
        setModalSubmitting(false)
        return
      }
      
      const updated = await res.json()
      setUsuario(updated)
      
      // Update localStorage
      const raw = localStorage.getItem('user')
      if (raw){
        const u = JSON.parse(raw)
        localStorage.setItem('user', JSON.stringify({...u, ...updated}))
      }
      
      setShowEditModal(false)
      setImageFile(null)
      setImagePreview(null)
      await loadUsuario()
    }catch(e){
      console.error(e)
      setModalError('Error comunicando con el servidor')
    }finally{
      setModalSubmitting(false)
    }
  }

  function imageCandidatesForUser(u){
    const list = []
    if (u && u.idUsuario){
      list.push(`/api/usuarios/${u.idUsuario}/imagen`)
    }
    if (u && u.imagen){
      list.push(u.imagen)
    }
    list.push('/assets/default-avatar.png')
    return list
  }

  // Check if user is manager or admin
  const isManager = usuario && (Number(usuario.permisos) === 2 || Number(usuario.permisos) === 3)
  const isAdmin = usuario && Number(usuario.permisos) === 3
  const permisosNum = usuario ? Number(usuario.permisos) : 1
  // UI-only label: map permisos to human-readable roles (1=Cliente, 2=Supervisor, 3=Administrador)
  // Prefer the permiso name returned by the API when available (avoids relying on numeric IDs)
  const roleLabel = usuario && usuario.permisoNombre ? usuario.permisoNombre : (permisosNum === 3 ? 'Administrador' : permisosNum === 2 ? 'Supervisor' : 'Cliente')

  if (loading) return (<div style={{padding:40,textAlign:'center',background:'#6FA9BB',minHeight:'100vh',color:'#fff'}}>Cargando perfil...</div>)

  return (
    <div style={{minHeight:'100vh', background:'#6FA9BB'}}>
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              {isManager ? (
                <>
                  <Link to="/proximas-reservas" className="nav-link btn-calendar">Próximas Reservas</Link>
                  {!isAdmin && (
                    <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                  )}
                  {isAdmin && (
                    <>
                      <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
                      <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
                      <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
                      <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                      <Link to="/pagos" className="nav-link btn-perfil">Pagos</Link>
                      <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="nav-link btn-reservas">Reservas</Link>
                  <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
                  <Link to="/mis-reservas" className="nav-link btn-calendar">Mis Reservas</Link>
                </>
              )}
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:120, paddingBottom:60, display:'flex', justifyContent:'center', alignItems:'center', minHeight:'calc(100vh - 180px)'}}>
        <div style={{
          background:'rgba(255,255,255,0.95)',
          borderRadius:20,
          padding:50,
          boxShadow:'0 12px 40px rgba(0,0,0,0.25)',
          maxWidth:700,
          width:'100%'
        }}>
          {/* Header con avatar y nombre */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:40, gap:20}}>
            <div style={{
              width:200,
              height:200,
              borderRadius:'50%',
              overflow:'hidden',
              border:'6px solid var(--azul-claro)',
              background:'#f0f0f0',
              flexShrink:0,
              boxShadow:'0 8px 20px rgba(0,0,0,0.15)'
            }}>
              <SmartImage
                candidates={imageCandidatesForUser(usuario)}
                alt="Avatar"
                style={{width:'100%', height:'100%', objectFit:'cover'}}
              />
            </div>
            <div style={{textAlign:'center'}}>
              <h2 style={{margin:0, fontSize:32, fontWeight:700, color:'var(--verde-oscuro)'}}>
                {usuario?.nombre || 'Usuario'} {usuario?.apellido || ''}
              </h2>
              <div style={{fontSize:16, color:'#666', marginTop:8}}>
                @{usuario?.usuario || 'usuario'}
              </div>
            </div>
          </div>

          {/* Información del usuario */}
          <div style={{fontSize:16, lineHeight:2.2, color:'#333', marginBottom:40}}>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid #e5e7eb'}}>
              <span style={{fontWeight:600, color:'var(--azul-oscuro)', minWidth:130}}>📧 Email:</span>
              <span>{usuario?.mail || 'No especificado'}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid #e5e7eb'}}>
              <span style={{fontWeight:600, color:'var(--azul-oscuro)', minWidth:130}}>📱 Teléfono:</span>
              <span>{usuario?.telefono || 'No especificado'}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid #e5e7eb'}}>
              <span style={{fontWeight:600, color:'var(--azul-oscuro)', minWidth:130}}>👤 Usuario:</span>
              <span>{usuario?.usuario || 'N/A'}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 0'}}>
              <span style={{fontWeight:600, color:'var(--azul-oscuro)', minWidth:130}}>🔑 Rol:</span>
              <span style={{
                background: isAdmin ? '#10b981' : isManager ? '#3b82f6' : '#f59e0b',
                color:'white',
                padding:'6px 16px',
                borderRadius:14,
                fontSize:14,
                fontWeight:600
              }}>
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Botón de editar */}
          <button
            onClick={()=>setShowEditModal(true)}
            style={{
              width:'100%',
              padding:'16px',
              background:'linear-gradient(135deg, var(--verde-claro) 0%, var(--verde-oscuro) 100%)',
              color:'white',
              border:'none',
              borderRadius:12,
              fontSize:17,
              fontWeight:600,
              cursor:'pointer',
              transition:'transform 0.2s',
              boxShadow:'0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ✏️ Editar Perfil
          </button>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:500}}>
            <h2 style={{marginBottom:16}}>Editar Perfil</h2>
            
            <div style={{marginBottom:12}}>
              <label style={{display:'block', marginBottom:6, fontWeight:600}}>Nombre</label>
              <input
                type="text"
                value={editData.nombre}
                onChange={e=>setEditData({...editData, nombre: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:6, border:'1px solid #ddd'}}
              />
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:'block', marginBottom:6, fontWeight:600}}>Apellido</label>
              <input
                type="text"
                value={editData.apellido}
                onChange={e=>setEditData({...editData, apellido: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:6, border:'1px solid #ddd'}}
              />
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:'block', marginBottom:6, fontWeight:600}}>Teléfono</label>
              <input
                type="text"
                value={editData.telefono}
                onChange={e=>setEditData({...editData, telefono: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:6, border:'1px solid #ddd'}}
              />
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:'block', marginBottom:6, fontWeight:600}}>Email</label>
              <input
                type="email"
                value={editData.mail}
                onChange={e=>setEditData({...editData, mail: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:6, border:'1px solid #ddd'}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', marginBottom:6, fontWeight:600}}>Imagen de perfil</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageChange}
                style={{width:'100%'}}
              />
              {imagePreview && (
                <div style={{marginTop:10}}>
                  <img src={imagePreview} alt="Preview" style={{width:100, height:100, objectFit:'cover', borderRadius:'50%', border:'2px solid #ddd'}} />
                </div>
              )}
            </div>

            {modalError && <div style={{color:'crimson', marginBottom:12}}>{modalError}</div>}

            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button
                className="btn btn-outline"
                onClick={()=>{
                  setShowEditModal(false)
                  setImageFile(null)
                  setImagePreview(null)
                  setModalError(null)
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
