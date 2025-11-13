import React from 'react'

export default function Notify({ open, type = 'success', title = '', message = '', onClose }){
  if (!open) return null
  const boxClass = `notify-box ${type === 'error' ? 'error' : 'success'}`.trim()
  return (
    <div className="notify-overlay" role="status" aria-live="polite">
      <div className={boxClass}>
        {title ? <div className="notify-title">{title}</div> : null}
        <div className="notify-message">{message}</div>
        <div className="notify-actions">
          <button className="notify-btn close" onClick={onClose}>Aceptar</button>
        </div>
      </div>
    </div>
  )
}
