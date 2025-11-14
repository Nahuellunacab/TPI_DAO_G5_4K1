import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ClientesAdmin(){
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    mail: '',
    numeroDoc: '',
    idTipoDoc: 1,
    usuario: '',
    contrasena: ''
  })
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingCliente, setDeletingCliente] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [tiposDoc, setTiposDoc] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

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
    fetchClientes()
    fetchTiposDoc()
  }, [navigate])

  async function fetchTiposDoc(){
    try{
      const res = await fetch('/api/tipos-documento')
      if (res.ok) {
        const data = await res.json()
        setTiposDoc(data)
      }
    }catch(e){
      console.error('Error fetching tipos documento:', e)
    }
  }

  async function fetchClientes(){
    setLoading(true)
    try{
      const res = await fetch('/api/clientes')
      if (!res.ok) throw new Error('Error al obtener clientes')
      const data = await res.json()
      
      // For each cliente, fetch their usuario info
      const clientesConUsuarios = await Promise.all(
        data.map(async (cli) => {
          if (cli.idUsuario) {
            try {
              const userRes = await fetch(`/api/usuarios/${cli.idUsuario}`)
              if (userRes.ok) {
                const userData = await userRes.json()
                return { ...cli, usuario: userData }
              }
            } catch(e) {
              console.error('Error fetching usuario:', e)
            }
          }
          return cli
        })
      )
      
      setClientes(clientesConUsuarios)
    }catch(e){
      console.error(e)
      alert('Error al cargar clientes')
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
    setEditingCliente(null)
    setFormData({
      nombre: '',
      apellido: '',
      telefono: '',
      mail: '',
      numeroDoc: '',
      idTipoDoc: 1,
      usuario: '',
      contrasena: ''
    })
    setModalError(null)
    setShowModal(true)
  }

  function handleEdit(cli){
    setEditingCliente(cli)
    setFormData({
      nombre: cli.nombre || '',
      apellido: cli.apellido || '',
      telefono: cli.telefono || '',
      mail: cli.mail || '',
      numeroDoc: cli.numeroDoc || '',
      idTipoDoc: cli.idTipoDoc || 1,
      usuario: cli.usuario?.usuario || '',
      contrasena: ''
    })
    setModalError(null)
    setShowModal(true)
  }

  async function handleSave(){
    setModalSubmitting(true)
    setModalError(null)
    
    try{
      if (editingCliente) {
        // Update existing cliente and usuario
        // First update usuario
        const usuarioPayload = {
          usuario: formData.usuario
        }
        if (formData.contrasena) {
          usuarioPayload.contrasena = formData.contrasena
        }
        
        const userRes = await fetch(`/api/usuarios/${editingCliente.idUsuario}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(usuarioPayload)
        })
        
        if (!userRes.ok) throw new Error('Error al actualizar usuario')
        
        // Then update cliente
        const clientePayload = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          mail: formData.mail,
          numeroDoc: formData.numeroDoc,
          idTipoDoc: Number(formData.idTipoDoc)
        }
        
        const cliRes = await fetch(`/api/clientes/${editingCliente.idCliente}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(clientePayload)
        })
        
        if (!cliRes.ok) throw new Error('Error al actualizar cliente')
        
      } else {
        // Create new cliente with usuario
        // First create usuario (permisos = 1 for clients)
        const usuarioPayload = {
          usuario: formData.usuario,
          contrasena: formData.contrasena,
          permisos: 1
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
        
        // Then create cliente
        const clientePayload = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          mail: formData.mail,
          numeroDoc: formData.numeroDoc,
          idTipoDoc: Number(formData.idTipoDoc),
          idUsuario: newUsuario.idUsuario
        }
        
        const cliRes = await fetch('/api/clientes', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(clientePayload)
        })
        
        if (!cliRes.ok) {
          // Rollback: delete the created usuario
          await fetch(`/api/usuarios/${newUsuario.idUsuario}`, {method: 'DELETE'})
          throw new Error('Error al crear cliente')
        }
      }
      
      setShowModal(false)
      fetchClientes()
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
      const cli = deletingCliente
      
      // First delete cliente
      const cliRes = await fetch(`/api/clientes/${cli.idCliente}`, {
        method: 'DELETE'
      })
      
      if (!cliRes.ok) throw new Error('Error al eliminar cliente')
      
      // Then delete usuario
      if (cli.idUsuario) {
        const userRes = await fetch(`/api/usuarios/${cli.idUsuario}`, {
          method: 'DELETE'
        })
        
        if (!userRes.ok) console.warn('Error al eliminar usuario asociado')
      }
      
      setShowDeleteModal(false)
      setDeletingCliente(null)
      fetchClientes()
    }catch(e){
      console.error(e)
      alert('Error al eliminar: ' + e.message)
    }finally{
      setDeleteSubmitting(false)
    }
  }

  const filteredClientes = clientes.filter(cli => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (cli.nombre && cli.nombre.toLowerCase().includes(search)) ||
      (cli.apellido && cli.apellido.toLowerCase().includes(search)) ||
      (cli.numeroDoc && cli.numeroDoc.toString().includes(search))
    )
  })

  if (loading) return (<div style={{padding:40,textAlign:'center'}}>Cargando...</div>)

  return (
    <div style={{minHeight:'100vh', background:'var(--gris)'}}>
      <header className="site-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/logo.png" alt="logo" className="logo" />
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>GoField</span>
          </div>
          <nav className="nav">
            <div className="header-actions">
              <Link to="/proximas-reservas" className="nav-link btn-calendar">Próximas Reservas</Link>
              <Link to="/canchas" className="nav-link btn-reservas">Canchas</Link>
              <Link to="/empleados" className="nav-link btn-perfil">Empleados y Usuarios</Link>
              <Link to="/clientes-admin" className="nav-link btn-perfil">Clientes</Link>
              <Link to="/torneos-admin" className="nav-link btn-perfil">Torneos</Link>
              <Link to="/pagos" className="nav-link btn-perfil">Ingresos</Link>
              <Link to="/reportes" className="nav-link btn-perfil">Reportes</Link>
              <Link to="/perfil" className="nav-link btn-perfil">Mi Perfil</Link>
              <button onClick={handleLogout} className="btn btn-logout">Cerrar Sesión</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container" style={{paddingTop:120, paddingBottom:60}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
          <h1 style={{fontSize:36, margin:0, color:'var(--verde-oscuro)'}}>
            Gestión de Clientes
          </h1>
          <button 
            className="btn btn-primary" 
            onClick={handleAdd}
            style={{padding:'10px 20px', fontSize:16}}
          >
            + Agregar Cliente
          </button>
        </div>
        
        <div style={{marginBottom:20}}>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: '10px 16px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--azul-oscuro)', color:'#fff'}}>
                <th style={{padding:12, textAlign:'left'}}>Nombre</th>
                <th style={{padding:12, textAlign:'left'}}>Apellido</th>
                <th style={{padding:12, textAlign:'left'}}>Documento</th>
                <th style={{padding:12, textAlign:'left'}}>Teléfono</th>
                <th style={{padding:12, textAlign:'left'}}>Email</th>
                <th style={{padding:12, textAlign:'left'}}>Usuario</th>
                <th style={{padding:12, textAlign:'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding:40, textAlign:'center', color:'#999'}}>
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td>
                </tr>
              )}
              {filteredClientes.map((cli) => (
                <tr key={cli.idCliente} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:12}}>{cli.nombre}</td>
                  <td style={{padding:12}}>{cli.apellido}</td>
                  <td style={{padding:12}}>{cli.numeroDoc || '-'}</td>
                  <td style={{padding:12}}>{cli.telefono || '-'}</td>
                  <td style={{padding:12}}>{cli.mail || '-'}</td>
                  <td style={{padding:12}}>{cli.usuario?.usuario || '-'}</td>
                  <td style={{padding:12, textAlign:'center'}}>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleEdit(cli)}
                      style={{marginRight:8, padding:'6px 12px', fontSize:14}}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => {
                        setDeletingCliente(cli)
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
            <h2>{editingCliente ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
            
            <div style={{marginTop:20}}>
              <h3 style={{fontSize:18, marginBottom:12, color:'var(--azul-oscuro)'}}>Datos del Cliente</h3>
              
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
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Tipo de Documento</label>
                <select 
                  value={formData.idTipoDoc}
                  onChange={e => setFormData({...formData, idTipoDoc: Number(e.target.value)})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                >
                  {tiposDoc.map(td => (
                    <option key={td.idTipoDoc} value={td.idTipoDoc}>{td.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block', marginBottom:4, fontWeight:600}}>Número de Documento</label>
                <input 
                  type="text" 
                  value={formData.numeroDoc}
                  onChange={e => setFormData({...formData, numeroDoc: e.target.value})}
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
                  Contraseña {editingCliente && '(dejar vacío para mantener la actual)'}
                </label>
                <input 
                  type="password" 
                  value={formData.contrasena}
                  onChange={e => setFormData({...formData, contrasena: e.target.value})}
                  style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}}
                  placeholder={editingCliente ? 'Dejar vacío para no cambiar' : ''}
                />
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
      {showDeleteModal && deletingCliente && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Confirmar Eliminación</h2>
            <p style={{marginTop:12}}>
              ¿Estás seguro que querés eliminar al cliente <strong>{deletingCliente.nombre} {deletingCliente.apellido}</strong> 
              {deletingCliente.usuario && <> y su usuario asociado <strong>{deletingCliente.usuario.usuario}</strong></>}?
            </p>
            <p style={{color:'#c0392b', marginTop:8}}>Esta acción no se puede deshacer.</p>

            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:20}}>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingCliente(null)
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
