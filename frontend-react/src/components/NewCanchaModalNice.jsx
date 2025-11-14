import React, { useState, useEffect } from 'react'
import Notify from './Notify'
import ConfirmModal from './ConfirmModal'

export default function NewCanchaModalNice({ open, onClose, onCreated, editMode = false, initialCancha = null, onUpdated }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [deporte, setDeporte] = useState('')
  const [precio, setPrecio] = useState('')
  const [estado, setEstado] = useState(1)
  const [assets, setAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [deportes, setDeportes] = useState([])
  const [servicios, setServicios] = useState([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState({})
  const [loading, setLoading] = useState(false)
  const [notify, setNotify] = useState({ open:false, type:'success', title:'', message:'' })
  const [confirmedModalOpen, setConfirmedModalOpen] = useState(false)

  useEffect(() => {
    const list = [
      '/assets/F1.jpg', '/assets/F2.jpeg', '/assets/T1.jpeg', '/assets/T2.jpeg',
      '/assets/P1.jpg', '/assets/P2.jpeg', '/assets/H1.jpg', '/assets/V1.jpeg', '/assets/B1.jpeg', '/assets/B2.jpeg'
    ]
    setAssets(list)
    if (list.length) setSelectedAsset(list[0])
    fetch('/api/deportes')
      .then(r => r.ok ? r.json() : [])
      .then(j => {
        setDeportes(j)
        // Solo establecer deporte por defecto si NO estamos en modo edición
        if (!editMode && j && j.length) setDeporte(String(j[0].idDeporte))
      })
      .catch(() => {})
    // cargar servicios disponibles
    fetch('/api/servicios')
      .then(r => r.ok ? r.json() : [])
      .then(j => {
        // defensiva: esperar un array; si no es array, convertir a []
        const list = Array.isArray(j) ? j : []
        setServicios(list)
        // inicializar el mapa de servicios seleccionados (no seleccionados por defecto)
        const map = {}
        list.forEach(s => { map[s.idServicio] = { selected: false, precio: '' } })
        setServiciosSeleccionados(map)
      })
      .catch(() => {})
    
    // Si estamos en modo edición, establecer valores iniciales inmediatamente
    if (editMode && initialCancha) {
      setNombre(initialCancha.nombre || '')
      setDescripcion(initialCancha.descripcion || 'sin techar')
      setDeporte(String(initialCancha.deporte || ''))
      setPrecio(initialCancha.precioHora || '')
      setEstado(initialCancha.estado || 1)
      if (initialCancha.imagen) { 
        setSelectedAsset(initialCancha.imagen)
        setPreviewUrl(initialCancha.imagen) 
      }
    } else {
      // Si es modo creación, establecer descripción por defecto
      setDescripcion('sin techar')
    }
  }, [editMode, initialCancha])

  // If editing an existing cancha, load its associated CanchaxServicio rows
  useEffect(() => {
    if (!editMode || !initialCancha || !initialCancha.idCancha) return
    let mounted = true
    // fetch existing canchaxservicio rows for this cancha to prefill service prices
    fetch(`/api/canchaxservicio/cancha/${initialCancha.idCancha}`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        if (!mounted) return
        // defensiva: esperar un array; si no es array, convertir a []
        const serviciosArray = Array.isArray(list) ? list : []
        // build map from current serviciosSeleccionados (which was initialized in previous effect)
        setServiciosSeleccionados(prev => {
          const next = { ...(prev || {}) }
          serviciosArray.forEach(s => {
            // s should contain idServicio and precioAdicional
            try{
              const id = s.idServicio || s.servicio?.idServicio
              const precio = (s.precioAdicional !== undefined && s.precioAdicional !== null) ? String(s.precioAdicional) : '0'
              if (id !== undefined) next[id] = { selected: true, precio }
            }catch(e){ /* ignore */ }
          })
          return next
        })
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [editMode, initialCancha])

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (selectedAsset) setPreviewUrl(selectedAsset)
    else setPreviewUrl(null)
  }, [file, selectedAsset])

  // Este efecto ya no es necesario porque los valores se establecen en el primer useEffect
  // useEffect(() => {
  //   if (!editMode || !initialCancha) return
  //   setNombre(initialCancha.nombre || '')
  //   setDescripcion(initialCancha.descripcion || '')
  //   setDeporte(String(initialCancha.deporte || ''))
  //   setPrecio(initialCancha.precioHora || '')
  //   setEstado(initialCancha.estado || 1)
  //   if (initialCancha.imagen) { setSelectedAsset(initialCancha.imagen); setPreviewUrl(initialCancha.imagen) }
  // }, [editMode, initialCancha])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let created
      // construir array de servicios seleccionados con montos
      const serviciosArray = Object.keys(serviciosSeleccionados)
        .map(k => ({ idServicio: Number(k), selected: serviciosSeleccionados[k].selected, precio: serviciosSeleccionados[k].precio }))
        .filter(x => x.selected)
        .map(x => ({ idServicio: x.idServicio, precioAdicional: Number(x.precio) || 0 }))
      // If we're editing, call PUT on the cancha endpoint and include servicios
      if (editMode && initialCancha && initialCancha.idCancha) {
        const id = initialCancha.idCancha
        const payload = {
          nombre,
          descripcion,
          deporte: Number(deporte) || 1,
          precioHora: Number(precio) || 0,
          estado: Number(estado),
          servicios: serviciosArray
        }
        // send JSON body for metadata
        const r = await fetch(`/api/canchas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!r.ok) throw new Error('Error actualizando cancha')
        // if a new file is present, upload via the foto endpoint
        if (file) {
          const fd = new FormData()
          fd.append('foto', file)
          const up = await fetch(`/api/canchas/${id}/foto`, { method: 'POST', body: fd })
          if (!up.ok) throw new Error('Error subiendo imagen')
        }
        // fetch updated cancha
        const fres = await fetch(`/api/canchas/${id}`)
        if (fres.ok) created = await fres.json()
      } else {
        if (file) {
          const fd = new FormData()
          fd.append('nombre', nombre)
          fd.append('descripcion', descripcion)
          fd.append('deporte', String(deporte))
          fd.append('precioHora', String(precio || '0'))
          fd.append('estado', String(estado))
          if (selectedAsset && !file) fd.append('imagen', selectedAsset)
          fd.append('foto', file)
          // servicios como JSON string en campo 'servicios'
          fd.append('servicios', JSON.stringify(serviciosArray))

          const r = await fetch('/api/canchas', { method: 'POST', body: fd })
          if (!r.ok) throw new Error(await r.text())
          created = await r.json()
        } else {
          const payload = {
            nombre,
            descripcion,
            deporte: Number(deporte) || 1,
            precioHora: Number(precio) || 0,
            estado: Number(estado)
          }
          if (selectedAsset) payload.imagen = selectedAsset
          // incluir servicios en el payload JSON
          payload.servicios = serviciosArray
          const r = await fetch('/api/canchas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          if (!r.ok) throw new Error('Error creando cancha')
          created = await r.json()
        }
      }

      if (editMode) {
        onUpdated && onUpdated(created)
        setNotify({ open: true, type: 'success', title: 'Cancha actualizada', message: 'La cancha fue actualizada correctamente.' })
        // open a confirmation modal that the user must acknowledge
        setConfirmedModalOpen(true)
      } else {
        onCreated && onCreated(created)
        setNotify({ open: true, type: 'success', title: 'Cancha creada', message: 'La cancha se creó correctamente.' })
        // auto-close after a short delay for creation flow
        setTimeout(() => { setNotify(s => ({ ...s, open: false })); onClose() }, 900)
      }
    } catch (err) {
      console.error(err)
      setNotify({ open: true, type: 'error', title: 'Error', message: editMode ? 'No se pudo actualizar la cancha' : 'No se pudo crear la cancha' })
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose && onClose()}>
      <div
        className="modal modal-register"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: 700,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 12,
          padding: '1.5rem'
        }}
      >
        {/* close button top-right */}
        <button
          type="button"
          aria-label="Cerrar"
          title="Cerrar"
          onClick={() => onClose && onClose()}
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            border: 'none',
            background: 'transparent',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 6
          }}
        >
          ×
        </button>

        <div className="modal-body">
    <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{editMode ? 'Editar cancha' : 'Crear nueva cancha'}</h2>

          <form className="register-form" onSubmit={submit}>
            <div className="row">
              <label>Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>

            <div className="row">
              <label>Descripción</label>
              <select value={descripcion} onChange={e => setDescripcion(e.target.value)}>
                <option value="sin techar">Sin techar</option>
                <option value="techada">Techada</option>
              </select>
            </div>

            <div className="row">
              <label>Deporte</label>
              <select value={deporte} onChange={e => setDeporte(e.target.value)} required>
                {deportes.map(d => (
                  <option key={d.idDeporte} value={d.idDeporte}>{d.nombre}</option>
                ))}
              </select>
            </div>

            <div className="row">
              <label>Precio por hora</label>
              <input
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
              />
            </div>

            <div className="row">
              <label>Estado</label>
              <select value={estado} onChange={e => setEstado(Number(e.target.value))}>
                <option value={1}>Activa</option>
                <option value={2}>En mantenimiento</option>
              </select>
            </div>

            <div className="row">
              <label>Elegir imagen existente</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {assets.map(a => (
                  <button
                    key={a}
                    type="button"
                    className={selectedAsset === a ? 'asset-btn selected' : 'asset-btn'}
                    onClick={() => { setSelectedAsset(a); setFile(null) }}
                  >
                    <img src={a} alt="miniatura" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                  </button>
                ))}
              </div>
            </div>

              <div className="row">
                <label>Servicios</label>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  {servicios.length === 0 && <em style={{ color: '#999' }}>No hay servicios cargados</em>}
                  {servicios.map(s => {
                    const sel = serviciosSeleccionados[s.idServicio] || { selected: false, precio: '' }
                    return (
                      <div key={s.idServicio} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={!!sel.selected}
                            onChange={e => {
                              setServiciosSeleccionados(prev => ({ ...prev, [s.idServicio]: { ...prev[s.idServicio], selected: e.target.checked } }))
                            }}
                          />
                          <span>{s.descripcion}</span>
                        </label>
                        {sel.selected && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Monto adicional"
                              value={sel.precio}
                              onChange={e => setServiciosSeleccionados(prev => ({ ...prev, [s.idServicio]: { ...prev[s.idServicio], precio: e.target.value } }))}
                              style={{ width: 140 }}
                            />
                            <small style={{ color: '#666' }}>ARS</small>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            <div className="row">
              <label>O subir una nueva imagen</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id="nc-file-input-nice"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files && e.target.files[0]
                    if (f) { setFile(f); setSelectedAsset('') }
                  }}
                />
                <label htmlFor="nc-file-input-nice" className="btn btn-outline" style={{ cursor: 'pointer' }}>
                  Seleccionar archivo
                </label>
                <div className="nc-file-meta">
                  {file ? file.name : <em style={{ color: '#999' }}>Ningún archivo seleccionado</em>}
                </div>
                {(file || selectedAsset) && (
                  <button type="button" className="btn btn-outline" onClick={() => { setFile(null); setSelectedAsset('') }}>Quitar</button>
                )}
              </div>
            </div>

            {previewUrl && (
              <div className="row">
                <label>Vista previa</label>
                <div style={{ textAlign: 'center' }}>
                  <img src={previewUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
                </div>
              </div>
            )}

            <div className="actions" style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginLeft: 8 }}>
                {loading ? (editMode ? 'Guardando...' : 'Creando...') : (editMode ? 'Guardar cambios' : 'Crear cancha')}
              </button>
            </div>
          </form>

          <Notify
            open={notify.open}
            type={notify.type}
            title={notify.title}
            message={notify.message}
            onClose={() => setNotify(s => ({ ...s, open: false }))}
          />
          <ConfirmModal
            open={confirmedModalOpen}
            title="Cambios confirmados"
            message={initialCancha ? `Los cambios en la cancha "${initialCancha.nombre}" se guardaron correctamente.` : 'Los cambios se guardaron correctamente.'}
            confirmText="Aceptar"
            cancelText="Cerrar"
            onCancel={() => { setConfirmedModalOpen(false); onClose && onClose() }}
            onConfirm={() => { setConfirmedModalOpen(false); onClose && onClose() }}
          />
        </div>
      </div>
    </div>
  )
}
