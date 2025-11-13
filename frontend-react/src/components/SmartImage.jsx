import React, { useState, useEffect } from 'react'

export default function SmartImage({ candidates = [], alt = '', className, style }){
  const [src, setSrc] = useState(null)
  const placeholder = '/assets/placeholder.jpg'

  useEffect(()=>{
    let cancelled = false
    async function tryLoad(){
      if (!Array.isArray(candidates) || candidates.length === 0){
        setSrc(placeholder); return
      }
      for(const c of candidates){
        try{
          if (typeof c !== 'string') continue
          await new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(true)
            img.onerror = () => reject(new Error('load error'))
            img.src = c
          })
          if (!cancelled){ setSrc(c); return }
        }catch(e){ /* try next */ }
      }
      if (!cancelled) setSrc(placeholder)
    }
    tryLoad()
    return ()=>{ cancelled = true }
  }, [JSON.stringify(candidates)])

  const finalSrc = src || placeholder
  return (
    <img src={finalSrc} alt={alt} className={className} style={style} />
  )
}
