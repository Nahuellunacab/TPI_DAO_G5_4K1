/**
 * Utilidades de validación para el frontend
 * Contiene todas las validaciones necesarias para formularios y datos
 */

// Expresiones regulares
const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  telefono: /^[+]?[\d\s()-]{7,20}$/,
  soloNumeros: /^\d+$/,
  soloLetras: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  usuario: /^[a-zA-Z0-9_-]{3,20}$/,
  precio: /^\d+(\.\d{1,2})?$/,
  hora: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
}

/**
 * Validación de email
 */
export const validarEmail = (email) => {
  if (!email || email.trim() === '') {
    return { valido: false, mensaje: 'El email es requerido' }
  }
  if (!REGEX.email.test(email.trim())) {
    return { valido: false, mensaje: 'El formato del email no es válido' }
  }
  if (email.length > 100) {
    return { valido: false, mensaje: 'El email no puede tener más de 100 caracteres' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de teléfono
 */
export const validarTelefono = (telefono, requerido = false) => {
  if (!telefono || telefono.trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: 'El teléfono es requerido' }
    }
    return { valido: true, mensaje: '' }
  }
  if (!REGEX.telefono.test(telefono.trim())) {
    return { valido: false, mensaje: 'El formato del teléfono no es válido' }
  }
  if (telefono.length > 20) {
    return { valido: false, mensaje: 'El teléfono no puede tener más de 20 caracteres' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de nombre/apellido
 */
export const validarNombre = (nombre, campo = 'Nombre', requerido = true) => {
  if (!nombre || nombre.trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: `${campo} es requerido` }
    }
    return { valido: true, mensaje: '' }
  }
  if (nombre.trim().length < 2) {
    return { valido: false, mensaje: `${campo} debe tener al menos 2 caracteres` }
  }
  if (nombre.length > 50) {
    return { valido: false, mensaje: `${campo} no puede tener más de 50 caracteres` }
  }
  if (!REGEX.soloLetras.test(nombre.trim())) {
    return { valido: false, mensaje: `${campo} solo puede contener letras` }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de usuario
 */
export const validarUsuario = (usuario) => {
  if (!usuario || usuario.trim() === '') {
    return { valido: false, mensaje: 'El usuario es requerido' }
  }
  if (usuario.trim().length < 3) {
    return { valido: false, mensaje: 'El usuario debe tener al menos 3 caracteres' }
  }
  if (usuario.length > 20) {
    return { valido: false, mensaje: 'El usuario no puede tener más de 20 caracteres' }
  }
  if (!REGEX.usuario.test(usuario.trim())) {
    return { valido: false, mensaje: 'El usuario solo puede contener letras, números, guiones y guiones bajos' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de contraseña
 */
export const validarContrasena = (contrasena, confirmar = null) => {
  if (!contrasena || contrasena === '') {
    return { valido: false, mensaje: 'La contraseña es requerida' }
  }
  if (contrasena.length < 6) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' }
  }
  if (contrasena.length > 50) {
    return { valido: false, mensaje: 'La contraseña no puede tener más de 50 caracteres' }
  }
  if (confirmar !== null && contrasena !== confirmar) {
    return { valido: false, mensaje: 'Las contraseñas no coinciden' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de documento
 */
export const validarDocumento = (documento, requerido = true) => {
  if (!documento || documento.toString().trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: 'El número de documento es requerido' }
    }
    return { valido: true, mensaje: '' }
  }
  const docStr = documento.toString().trim()
  if (!REGEX.soloNumeros.test(docStr)) {
    return { valido: false, mensaje: 'El documento solo puede contener números' }
  }
  if (docStr.length < 7 || docStr.length > 9) {
    return { valido: false, mensaje: 'El documento debe tener entre 7 y 9 dígitos' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de precio/monto
 */
export const validarPrecio = (precio, minimo = 0, requerido = true) => {
  if (!precio || precio.toString().trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: 'El precio es requerido' }
    }
    return { valido: true, mensaje: '' }
  }
  const precioStr = precio.toString().trim()
  if (!REGEX.precio.test(precioStr)) {
    return { valido: false, mensaje: 'El precio debe ser un número válido' }
  }
  const precioNum = parseFloat(precioStr)
  if (isNaN(precioNum)) {
    return { valido: false, mensaje: 'El precio debe ser un número válido' }
  }
  if (precioNum < minimo) {
    return { valido: false, mensaje: `El precio debe ser mayor o igual a ${minimo}` }
  }
  if (precioNum > 1000000) {
    return { valido: false, mensaje: 'El precio no puede ser mayor a 1.000.000' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de fecha
 */
export const validarFecha = (fecha, permitirPasado = false, requerido = true) => {
  if (!fecha || fecha.trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: 'La fecha es requerida' }
    }
    return { valido: true, mensaje: '' }
  }
  
  try {
    const fechaObj = new Date(fecha)
    if (isNaN(fechaObj.getTime())) {
      return { valido: false, mensaje: 'La fecha no es válida' }
    }
    
    if (!permitirPasado) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      fechaObj.setHours(0, 0, 0, 0)
      
      if (fechaObj < hoy) {
        return { valido: false, mensaje: 'La fecha no puede ser anterior a hoy' }
      }
    }
    
    // Validar que la fecha no sea muy lejana (máximo 2 años en el futuro)
    const maxFecha = new Date()
    maxFecha.setFullYear(maxFecha.getFullYear() + 2)
    if (fechaObj > maxFecha) {
      return { valido: false, mensaje: 'La fecha no puede ser mayor a 2 años en el futuro' }
    }
    
    return { valido: true, mensaje: '' }
  } catch (e) {
    return { valido: false, mensaje: 'La fecha no es válida' }
  }
}

/**
 * Validación de hora (formato HH:MM)
 */
export const validarHora = (hora, requerido = true) => {
  if (!hora || hora.trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: 'La hora es requerida' }
    }
    return { valido: true, mensaje: '' }
  }
  
  if (!REGEX.hora.test(hora.trim())) {
    return { valido: false, mensaje: 'El formato de hora debe ser HH:MM' }
  }
  
  return { valido: true, mensaje: '' }
}

/**
 * Validación de rango de horas
 */
export const validarRangoHoras = (horaInicio, horaFin) => {
  const validacionInicio = validarHora(horaInicio)
  if (!validacionInicio.valido) {
    return { valido: false, mensaje: `Hora inicio: ${validacionInicio.mensaje}` }
  }
  
  const validacionFin = validarHora(horaFin)
  if (!validacionFin.valido) {
    return { valido: false, mensaje: `Hora fin: ${validacionFin.mensaje}` }
  }
  
  // Comparar que hora fin sea mayor que hora inicio
  const [hIni, mIni] = horaInicio.split(':').map(Number)
  const [hFin, mFin] = horaFin.split(':').map(Number)
  
  const minutosInicio = hIni * 60 + mIni
  const minutosFin = hFin * 60 + mFin
  
  if (minutosFin <= minutosInicio) {
    return { valido: false, mensaje: 'La hora de fin debe ser posterior a la hora de inicio' }
  }
  
  return { valido: true, mensaje: '' }
}

/**
 * Validación de texto genérico
 */
export const validarTexto = (texto, campo = 'Campo', minLength = 0, maxLength = 255, requerido = true) => {
  if (!texto || texto.trim() === '') {
    if (requerido) {
      return { valido: false, mensaje: `${campo} es requerido` }
    }
    return { valido: true, mensaje: '' }
  }
  
  if (texto.trim().length < minLength) {
    return { valido: false, mensaje: `${campo} debe tener al menos ${minLength} caracteres` }
  }
  
  if (texto.length > maxLength) {
    return { valido: false, mensaje: `${campo} no puede tener más de ${maxLength} caracteres` }
  }
  
  return { valido: true, mensaje: '' }
}

/**
 * Validación de selección (select, radio, checkbox)
 */
export const validarSeleccion = (valor, campo = 'Campo', requerido = true) => {
  if (!valor || valor === '' || valor === null || valor === undefined) {
    if (requerido) {
      return { valido: false, mensaje: `Debe seleccionar ${campo}` }
    }
    return { valido: true, mensaje: '' }
  }
  return { valido: true, mensaje: '' }
}

/**
 * Validación de número entero
 */
export const validarEntero = (numero, campo = 'Campo', minimo = null, maximo = null, requerido = true) => {
  if (!numero && numero !== 0) {
    if (requerido) {
      return { valido: false, mensaje: `${campo} es requerido` }
    }
    return { valido: true, mensaje: '' }
  }
  
  const num = parseInt(numero)
  if (isNaN(num)) {
    return { valido: false, mensaje: `${campo} debe ser un número entero` }
  }
  
  if (minimo !== null && num < minimo) {
    return { valido: false, mensaje: `${campo} debe ser mayor o igual a ${minimo}` }
  }
  
  if (maximo !== null && num > maximo) {
    return { valido: false, mensaje: `${campo} debe ser menor o igual a ${maximo}` }
  }
  
  return { valido: true, mensaje: '' }
}

/**
 * Validación de archivo/imagen
 */
export const validarArchivo = (file, tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg'], tamanoMaxMB = 5, requerido = false) => {
  if (!file) {
    if (requerido) {
      return { valido: false, mensaje: 'Debe seleccionar un archivo' }
    }
    return { valido: true, mensaje: '' }
  }
  
  if (!tiposPermitidos.includes(file.type)) {
    return { valido: false, mensaje: `Tipo de archivo no permitido. Formatos aceptados: ${tiposPermitidos.join(', ')}` }
  }
  
  const tamanoMaxBytes = tamanoMaxMB * 1024 * 1024
  if (file.size > tamanoMaxBytes) {
    return { valido: false, mensaje: `El archivo no puede pesar más de ${tamanoMaxMB}MB` }
  }
  
  return { valido: true, mensaje: '' }
}

/**
 * Validador de formulario completo
 * Recibe un objeto con campos y reglas de validación
 */
export const validarFormulario = (datos, reglas) => {
  const errores = {}
  let esValido = true
  
  for (const campo in reglas) {
    const regla = reglas[campo]
    const valor = datos[campo]
    
    let resultado = { valido: true, mensaje: '' }
    
    // Ejecutar validación según el tipo
    switch (regla.tipo) {
      case 'email':
        resultado = validarEmail(valor)
        break
      case 'telefono':
        resultado = validarTelefono(valor, regla.requerido)
        break
      case 'nombre':
        resultado = validarNombre(valor, regla.campo || campo, regla.requerido)
        break
      case 'usuario':
        resultado = validarUsuario(valor)
        break
      case 'contrasena':
        resultado = validarContrasena(valor, regla.confirmar)
        break
      case 'documento':
        resultado = validarDocumento(valor, regla.requerido)
        break
      case 'precio':
        resultado = validarPrecio(valor, regla.minimo, regla.requerido)
        break
      case 'fecha':
        resultado = validarFecha(valor, regla.permitirPasado, regla.requerido)
        break
      case 'hora':
        resultado = validarHora(valor, regla.requerido)
        break
      case 'texto':
        resultado = validarTexto(valor, regla.campo || campo, regla.minLength, regla.maxLength, regla.requerido)
        break
      case 'seleccion':
        resultado = validarSeleccion(valor, regla.campo || campo, regla.requerido)
        break
      case 'entero':
        resultado = validarEntero(valor, regla.campo || campo, regla.minimo, regla.maximo, regla.requerido)
        break
      case 'archivo':
        resultado = validarArchivo(valor, regla.tipos, regla.tamanoMaxMB, regla.requerido)
        break
      case 'custom':
        if (regla.validador) {
          resultado = regla.validador(valor, datos)
        }
        break
      default:
        break
    }
    
    if (!resultado.valido) {
      errores[campo] = resultado.mensaje
      esValido = false
    }
  }
  
  return { esValido, errores }
}

/**
 * Función para mostrar errores en el formulario
 */
export const mostrarErrores = (errores, setErrores) => {
  setErrores(errores)
  
  // Scroll al primer error
  const primerCampoConError = Object.keys(errores)[0]
  if (primerCampoConError) {
    const elemento = document.querySelector(`[name="${primerCampoConError}"]`)
    if (elemento) {
      elemento.focus()
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

/**
 * Limpiar errores
 */
export const limpiarErrores = (setErrores) => {
  setErrores({})
}
