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

  // Check if user is manager
  const isManager = usuario && Number(usuario.permisos) === 2

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
                  <Link to="/dashboard" className="nav-link">Calendario</Link>
                  <Link to="/canchas" className="nav-link">Canchas</Link>
                </>
              ) : (
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              )}
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:120, paddingBottom:60}}>
  <div style={{display:'flex', gap:40, maxWidth:1100, margin:'0 auto', alignItems:'flex-start'}}>
          {/* Left card - User info */}
          <div style={{
            flex:'0 0 420px',
            background:'rgba(255,255,255,0.15)',
            backdropFilter:'blur(10px)',
            border:'2px dashed rgba(255,255,255,0.3)',
            borderRadius:12,
            padding:'30px 24px',
            color:'#fff',
            minHeight:320
          }}>
            <h2 style={{margin:'0 0 20px', fontSize:24, fontWeight:700, color:'#fff'}}>Mi Perfil</h2>
            <div style={{fontSize:14, lineHeight:1.8}}>
              <div><strong>Usuario:</strong> {usuario?.usuario || 'N/A'}</div>
              <div><strong>Nombre:</strong> {usuario?.nombre || 'N/A'}</div>
              <div><strong>Apellido:</strong> {usuario?.apellido || 'N/A'}</div>
              <div><strong>Teléfono:</strong> {usuario?.telefono || 'N/A'}</div>
              <div><strong>Email:</strong> {usuario?.mail || 'N/A'}</div>
              {usuario?.tipoRegistro && (
                <div style={{marginTop:8, fontSize:12, opacity:0.8}}>
                  <em>Datos de: {usuario.tipoRegistro === 'cliente' ? 'Cliente' : 'Empleado'}</em>
                </div>
              )}
            </div>
            <button
              onClick={()=>setShowEditModal(true)}
              style={{
                marginTop:24,
                background:'#687D31',
                color:'#fff',
                border:'none',
                padding:'10px 20px',
                borderRadius:6,
                cursor:'pointer',
                fontSize:14,
                fontWeight:600,
                width:'100%'
              }}
            >
              Editar perfil
            </button>
          </div>

          {/* Right - Profile picture */}
          <div style={{
            flex:1,
            display:'flex',
            justifyContent:'center',
            alignItems:'center'
          }}>
            <div style={{
              width:280,
              height:280,
              borderRadius:'50%',
              overflow:'hidden',
              border:'4px solid rgba(255,255,255,0.5)',
              background:'#fff',
              boxShadow:'0 8px 24px rgba(0,0,0,0.2)'
            }}>
              <SmartImage
                candidates={imageCandidatesForUser(usuario)}
                alt="Foto de perfil"
                style={{
                  width:'100%',
                  height:'100%',
                  objectFit:'cover',
                  display:'block'
                }}
              />
            </div>
          </div>
        </div>

        <footer style={{textAlign:'center', marginTop:60, color:'#333', fontSize:13}}>
          GoField, tus canchas en todo momento.
        </footer>
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
