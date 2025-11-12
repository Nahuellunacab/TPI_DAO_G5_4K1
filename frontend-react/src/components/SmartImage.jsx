import React, { useState } from 'react'

export default function SmartImage({ candidates = [], alt = '', className, style }){
  const [idx, setIdx] = useState(0)
  const placeholder = '/assets/placeholder.jpg'
  const src = (Array.isArray(candidates) && idx < candidates.length) ? candidates[idx] : placeholder

  function handleError(){
    // advance to the next candidate, or to placeholder when exhausted
    if (idx + 1 < candidates.length) setIdx(idx + 1)
    else setIdx(candidates.length) // will cause placeholder to be used
  }

  return (
    <img src={src} alt={alt} className={className} style={style} onError={handleError} />
  )
}
