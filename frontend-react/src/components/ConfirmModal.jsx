import React from 'react'

export default function ConfirmModal({ open, title = 'Confirmar', message = '', confirmText = 'Aceptar', cancelText = 'Cancelar', onConfirm, onCancel }){
  if (!open) return null
  return (
    <div className="notify-overlay" role="dialog" aria-modal="true">
      <div className={`notify-box`}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <h3 className="notify-title" style={{textTransform:'uppercase'}}>{title}</h3>
          <button onClick={onCancel} style={{border:'none', background:'transparent', color:'rgba(255,255,255,0.9)', fontSize:18, cursor:'pointer'}}>✕</button>
        </div>
        <div>
          <p className="notify-message">{message}</p>
          <div className="notify-actions" style={{marginTop:12}}>
            <button onClick={onCancel} className="notify-btn close" style={{marginRight:8}}>{cancelText}</button>
            {/* Purple/primary confirm button to match app aesthetic */}
            <button onClick={onConfirm} className="notify-btn" style={{background:'linear-gradient(180deg,#7b3df0,#5527c8)', border:'2px solid rgba(255,255,255,0.12)', padding:'8px 14px', boxShadow:'0 6px 18px rgba(0,0,0,0.28)'}}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
