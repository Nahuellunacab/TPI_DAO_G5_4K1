import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Empleados(){
  const navigate = useNavigate()
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    mail: '',
    usuario: '',
    contrasena: '',
    permisos: 2
  })
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingEmpleado, setDeletingEmpleado] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(()=>{
    // Check permissions: only permisos === 3 (admin)
    try{
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || Number(u.permisos) !== 3){ 
        navigate('/dashboard')
        return
      }
    }catch(e){ 
      navigate('/dashboard')
      return
    }
    fetchEmpleados()
  }, [navigate])

  async function fetchEmpleados(){
    setLoading(true)
    try{
      const res = await fetch('/api/empleados')
      if (!res.ok) throw new Error('Error al obtener empleados')
      const data = await res.json()
      
      // For each empleado, fetch their usuario info
      const empleadosConUsuarios = await Promise.all(
        data.map(async (emp) => {
          if (emp.idUsuario) {
            try {
              const userRes = await fetch(`/api/usuarios/${emp.idUsuario}`)
              if (userRes.ok) {
                const userData = await userRes.json()
                return { ...emp, usuario: userData }
              }
            } catch(e) {
              console.error('Error fetching usuario:', e)
            }
          }
          return emp
        })
      )
      
      setEmpleados(empleadosConUsuarios)
    }catch(e){
      console.error(e)
      alert('Error al cargar empleados')
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

  function handleAdd(){
    setEditingEmpleado(null)
    setFormData({
      nombre: '',
      apellido: '',
      telefono: '',
      mail: '',
      usuario: '',
      contrasena: '',
      permisos: 2
    })
    setModalError(null)
    setShowModal(true)
  }

  function handleEdit(emp){
    setEditingEmpleado(emp)
    setFormData({
      nombre: emp.nombre || '',
      apellido: emp.apellido || '',
      telefono: emp.telefono || '',
      mail: emp.mail || '',
      usuario: emp.usuario?.usuario || '',
      contrasena: '', // Don't show password
      permisos: emp.usuario?.permisos || 2
    })
    setModalError(null)
    setShowModal(true)
  }

  async function handleSave(){
    setModalSubmitting(true)
    setModalError(null)
    
    try{
      if (editingEmpleado) {
        // Update existing empleado and usuario
        // First update usuario
        const usuarioPayload = {
          usuario: formData.usuario,
          permisos: Number(formData.permisos)
        }
        if (formData.contrasena) {
          usuarioPayload.contrasena = formData.contrasena
        }
        
        const userRes = await fetch(`/api/usuarios/${editingEmpleado.idUsuario}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(usuarioPayload)
        })
        
        if (!userRes.ok) throw new Error('Error al actualizar usuario')
        
        // Then update empleado
        const empleadoPayload = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          mail: formData.mail
        }
        
        const empRes = await fetch(`/api/empleados/${editingEmpleado.idEmpleado}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(empleadoPayload)
        })
        
        if (!empRes.ok) throw new Error('Error al actualizar empleado')
        
      } else {
        // Create new empleado with usuario
        // First create usuario
        const usuarioPayload = {
          usuario: formData.usuario,
          contrasena: formData.contrasena,
          permisos: Number(formData.permisos)
        }
        
        const userRes = await fetch('/api/usuarios', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(usuarioPayload)
        })
        
        if (!userRes.ok) {
          const error = await userRes.json()
          throw new Error(error.error || 'Error al crear usuario')
        }
        
        const newUsuario = await userRes.json()
        
        // Then create empleado
        const empleadoPayload = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          mail: formData.mail,
          idUsuario: newUsuario.idUsuario
        }
        
        const empRes = await fetch('/api/empleados', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(empleadoPayload)
        })
        
        if (!empRes.ok) {
          // Rollback: delete the created usuario
          await fetch(`/api/usuarios/${newUsuario.idUsuario}`, {method: 'DELETE'})
          throw new Error('Error al crear empleado')
        }
      }
      
      setShowModal(false)
      fetchEmpleados()
    }catch(e){
      console.error(e)
      setModalError(e.message || 'Error al guardar')
    }finally{
      setModalSubmitting(false)
    }
  }

  async function handleDelete(){
    setDeleteSubmitting(true)
    
    try{
      const emp = deletingEmpleado
      
      // First delete empleado
      const empRes = await fetch(`/api/empleados/${emp.idEmpleado}`, {
        method: 'DELETE'
      })
      
      if (!empRes.ok) throw new Error('Error al eliminar empleado')
      
      // Then delete usuario
      if (emp.idUsuario) {
        const userRes = await fetch(`/api/usuarios/${emp.idUsuario}`, {
          method: 'DELETE'
        })
        
        if (!userRes.ok) console.warn('Error al eliminar usuario asociado')
      }
      
      setShowDeleteModal(false)
      setDeletingEmpleado(null)
      fetchEmpleados()
    }catch(e){
      console.error(e)
      alert('Error al eliminar: ' + e.message)
    }finally{
      setDeleteSubmitting(false)
    }
  }

  if (loading) return (<div style={{padding:40,textAlign:'center'}}>Cargando...</div>)

  return (
    <div style={{minHeight:'100vh', background:'var(--gris)'}}>
      <header className="site-header">
        <div className="container header-inner">
          <img src="/assets/logo.png" alt="logo" className="logo" />
          <nav className="nav">
            <div className="header-actions">
              <Link to="/proximas-reservas" className="nav-link btn-calendar">Próximas Reservas</Link>
              <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
              <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
              <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
              <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:120, paddingBottom:60}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
          <h1 style={{fontSize:36, margin:0, color:'var(--verde-oscuro)'}}>
            Empleados y Usuarios
          </h1>
          <button 
            className="btn btn-primary" 
            onClick={handleAdd}
            style={{padding:'10px 20px', fontSize:16}}
          >
            + Agregar Empleado
          </button>
        </div>
        
        <div style={{background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--azul-oscuro)', color:'#fff'}}>
                <th style={{padding:12, textAlign:'left'}}>Nombre</th>
                <th style={{padding:12, textAlign:'left'}}>Apellido</th>
                <th style={{padding:12, textAlign:'left'}}>Teléfono</th>
                <th style={{padding:12, textAlign:'left'}}>Email</th>
                <th style={{padding:12, textAlign:'left'}}>Usuario</th>
                <th style={{padding:12, textAlign:'left'}}>Permisos</th>
                <th style={{padding:12, textAlign:'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding:40, textAlign:'center', color:'#999'}}>
                    No hay empleados registrados
                  </td>
                </tr>
              )}
              {empleados.map((emp) => (
                <tr key={emp.idEmpleado} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:12}}>{emp.nombre}</td>
                  <td style={{padding:12}}>{emp.apellido}</td>
                  <td style={{padding:12}}>{emp.telefono || '-'}</td>
                  <td style={{padding:12}}>{emp.mail || '-'}</td>
                  <td style={{padding:12}}>{emp.usuario?.usuario || '-'}</td>
                  <td style={{padding:12}}>
                    {emp.usuario?.permisos === 3 ? 'Supervisor' : emp.usuario?.permisos === 2 ? 'Admin' : '-'}
                  </td>
                  <td style={{padding:12, textAlign:'center'}}>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleEdit(emp)}
                      style={{marginRight:8, padding:'6px 12px', fontSize:14}}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => {
                        setDeletingEmpleado(emp)
                        setShowDeleteModal(true)
                      }}
                      style={{padding:'6px 12px', fontSize:14, background:'#c0392b', color:'#fff', border:'none'}}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:600}}>
            <h2>{editingEmpleado ? 'Editar Empleado' : 'Agregar Empleado'}</h2>
            
            <div style={{marginTop:20}}>
              <h3 style={{fontSize:18, marginBottom:12, color:'var(--azul-oscuro)'}}>Datos del Empleado</h3>
              
              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Nombre *</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Apellido *</label>
                <input 
                  type="text" 
                  value={formData.apellido}
                  onChange={e => setFormData({...formData, apellido: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Teléfono</label>
                <input 
                  type="text" 
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Email</label>
                <input 
                  type="email" 
                  value={formData.mail}
                  onChange={e => setFormData({...formData, mail: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                />
              </div>

              <h3 style={{fontSize:18, marginTop:24, marginBottom:12, color:'var(--azul-oscuro)'}}>Datos del Usuario</h3>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Usuario *</label>
                <input 
                  type="text" 
                  value={formData.usuario}
                  onChange={e => setFormData({...formData, usuario: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>
                  Contraseña {editingEmpleado && '(dejar vacío para mantener la actual)'}
                </label>
                <input 
                  type="password" 
                  value={formData.contrasena}
                  onChange={e => setFormData({...formData, contrasena: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                  placeholder={editingEmpleado ? 'Dejar vacío para no cambiar' : ''}
                />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Nivel de Permisos</label>
                <select 
                  value={formData.permisos}
                  onChange={e => setFormData({...formData, permisos: Number(e.target.value)})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                >
                  <option value={2}>Admin (2)</option>
                  <option value={3}>Supervisor (3)</option>
                </select>
              </div>
            </div>

            {modalError && (
              <div style={{color:'crimson', marginTop:12, padding:8, background:'#ffebee', borderRadius:4}}>
                {modalError}
              </div>
            )}

            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:20}}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowModal(false)}
                disabled={modalSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEmpleado && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Confirmar Eliminación</h2>
            <p style={{marginTop:12}}>
              ¿Estás seguro que querés eliminar al empleado <strong>{deletingEmpleado.nombre} {deletingEmpleado.apellido}</strong> 
              {deletingEmpleado.usuario && <> y su usuario asociado <strong>{deletingEmpleado.usuario.usuario}</strong></>}?
            </p>
            <p style={{color:'#c0392b', marginTop:8}}>Esta acción no se puede deshacer.</p>

            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:20}}>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingEmpleado(null)
                }}
                disabled={deleteSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn" 
                onClick={handleDelete}
                disabled={deleteSubmitting}
                style={{background:'#c0392b', color:'#fff', border:'none'}}
              >
                {deleteSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
