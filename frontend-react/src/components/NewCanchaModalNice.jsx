import React, { useState, useEffect } from 'react'
import Notify from './Notify'

export default function NewCanchaModalNice({ open, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [deporte, setDeporte] = useState('')
  const [precio, setPrecio] = useState('')
  const [estado, setEstado] = useState(1)
  const [assets, setAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [deportes, setDeportes] = useState([])
  const [loading, setLoading] = useState(false)
  const [notify, setNotify] = useState({ open:false, type:'success', title:'', message:'' })

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
        if (j && j.length) setDeporte(String(j[0].idDeporte))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (selectedAsset) setPreviewUrl(selectedAsset)
    else setPreviewUrl(null)
  }, [file, selectedAsset])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let created
      if (file) {
        const fd = new FormData()
        fd.append('nombre', nombre)
        fd.append('deporte', String(deporte))
        fd.append('precioHora', String(precio || '0'))
        fd.append('estado', String(estado))
        if (selectedAsset && !file) fd.append('imagen', selectedAsset)
        fd.append('foto', file)

        const r = await fetch('/api/canchas', { method: 'POST', body: fd })
        if (!r.ok) throw new Error(await r.text())
        created = await r.json()
      } else {
        const payload = {
          nombre,
          deporte: Number(deporte) || 1,
          precioHora: Number(precio) || 0,
          estado: Number(estado)
        }
        if (selectedAsset) payload.imagen = selectedAsset
        const r = await fetch('/api/canchas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!r.ok) throw new Error('Error creando cancha')
        created = await r.json()
      }

      onCreated && onCreated(created)
      setNotify({ open: true, type: 'success', title: 'Cancha creada', message: 'La cancha se creó correctamente.' })
      setTimeout(() => { setNotify(s => ({ ...s, open: false })); onClose() }, 900)
    } catch (err) {
      console.error(err)
      setNotify({ open: true, type: 'error', title: 'Error', message: 'No se pudo crear la cancha' })
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose && onClose()}>
      <div
        className="modal modal-register"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 700,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 12,
          padding: '1.5rem'
        }}
      >
        <div className="modal-body">
          <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Crear nueva cancha</h2>

          <form className="register-form" onSubmit={submit}>
            <div className="row">
              <label>Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} required />
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
                {loading ? 'Creando...' : 'Crear cancha'}
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
        </div>
      </div>
    </div>
  )
}
