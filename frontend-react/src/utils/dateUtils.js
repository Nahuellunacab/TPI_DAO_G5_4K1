export function parseLocalDate(dateStr){
  try{
    if (typeof dateStr === 'string'){
      // Extract YYYY-MM-DD from strings like 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS...'
      const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m){
        const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
        return new Date(y, mo - 1, d)
      }
    }
    return new Date(dateStr)
  }catch(e){
    return new Date(dateStr)
  }
}

export function toYMD(date){
  try{
    if (!date) return ''
    const d = (date instanceof Date) ? date : parseLocalDate(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }catch(e){
    try{ return String(date).slice(0,10) }catch(er){ return '' }
  }
}
