import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Reportes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reservasPorCliente, setReservasPorCliente] = useState([])
  const [reservasPorDeporte, setReservasPorDeporte] = useState({ semana: [], mes: [], anio: [], total: [] })
  const [ganancias, setGanancias] = useState({ semana: 0, mes: 0, anio: 0, total: 0 })
  const [gananciasPorDia, setGananciasPorDia] = useState([])
  const [periodoReservas, setPeriodoReservas] = useState('total')
  const [periodoGanancias, setPeriodoGanancias] = useState('total')
  const [modalReporte, setModalReporte] = useState(false)
  const [tipoReporte, setTipoReporte] = useState('')

  useEffect(() => {
    // Check if user is supervisor (permisos === 3)
    try {
      const raw = localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || Number(u.permisos) !== 3) {
        navigate('/dashboard')
        return
      }
    } catch (e) {
      navigate('/dashboard')
      return
    }

    fetchReportData()
  }, [navigate])

  async function fetchReportData() {
    try {
      const [reservasRes, clientesRes, deportesRes, detallesRes, canchaxServiciosRes, canchasRes] = await Promise.all([
        fetch('/api/reserva'),
        fetch('/api/clientes'),
        fetch('/api/deportes'),
        fetch('/api/detalle-reserva'),
        fetch('/api/canchaxservicio'),
        fetch('/api/canchas')
      ])

      if (!reservasRes.ok || !clientesRes.ok || !deportesRes.ok) {
        throw new Error('Error al cargar datos')
      }

      const reservas = await reservasRes.json()
      const clientes = await clientesRes.json()
      const deportes = await deportesRes.json()
      const detalles = await detallesRes.json()
      const canchaxServicios = await canchaxServiciosRes.json()
      const canchas = await canchasRes.json()

      // Filtrar solo reservas hasta hoy (excluir futuras)
      const hoy = new Date()
      hoy.setHours(23, 59, 59, 999) // Incluir todo el día de hoy
      const reservasPasadas = reservas.filter(r => {
        const fechaReserva = new Date(r.fechaReservada)
        return fechaReserva <= hoy
      })

      // Crear mapas para acceso rápido
      const cxsMap = {}
      canchaxServicios.forEach(cxs => {
        cxsMap[cxs.idCxS] = cxs.idCancha
      })

      const canchaMap = {}
      canchas.forEach(c => {
        canchaMap[c.idCancha] = c.deporte
      })

      // Mapear reserva a deporte
      const reservaDeporteMap = {}
      detalles.forEach(d => {
        const idCancha = cxsMap[d.idCxS]
        const idDeporte = canchaMap[idCancha]
        if (!reservaDeporteMap[d.idReserva]) {
          reservaDeporteMap[d.idReserva] = idDeporte
        }
      })

      // Calcular reservas por cliente
      const reservasPorClienteMap = {}
      reservasPasadas.forEach(r => {
        const idCliente = r.idCliente
        if (!reservasPorClienteMap[idCliente]) {
          const cliente = clientes.find(c => c.idCliente === idCliente)
          reservasPorClienteMap[idCliente] = {
            nombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente #${idCliente}`,
            cantidad: 0
          }
        }
        reservasPorClienteMap[idCliente].cantidad++
      })
      setReservasPorCliente(Object.values(reservasPorClienteMap))

      // Calcular reservas por deporte en diferentes períodos
      const ahora = new Date()
      const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
      const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
      const inicioAnio = new Date(ahora.getFullYear(), 0, 1)

      const deporteMap = {}
      deportes.forEach(d => {
        deporteMap[d.idDeporte] = {
          nombre: d.nombre,
          semana: 0,
          mes: 0,
          anio: 0,
          total: 0
        }
      })

      reservasPasadas.forEach(r => {
        const fechaReserva = new Date(r.fechaReservada)
        const idDeporte = reservaDeporteMap[r.idReserva]

        if (idDeporte && deporteMap[idDeporte]) {
          deporteMap[idDeporte].total++
          if (fechaReserva >= hace7Dias) deporteMap[idDeporte].semana++
          if (fechaReserva >= hace30Dias) deporteMap[idDeporte].mes++
          if (fechaReserva >= inicioAnio) deporteMap[idDeporte].anio++
        }
      })

      setReservasPorDeporte({
        semana: Object.values(deporteMap).map(d => ({ nombre: d.nombre, cantidad: d.semana })),
        mes: Object.values(deporteMap).map(d => ({ nombre: d.nombre, cantidad: d.mes })),
        anio: Object.values(deporteMap).map(d => ({ nombre: d.nombre, cantidad: d.anio })),
        total: Object.values(deporteMap).map(d => ({ nombre: d.nombre, cantidad: d.total }))
      })

      // Calcular ganancias
      let gananciasSemana = 0
      let gananciasMes = 0
      let gananciasAnio = 0
      let gananciasTotal = 0

      // Agrupar ganancias por día
      const gananciasPorFecha = {}
      
      reservasPasadas.forEach(r => {
        const fechaReserva = new Date(r.fechaReservada)
        const monto = r.monto || 0
        const fechaKey = r.fechaReservada // formato YYYY-MM-DD

        // Acumular por fecha
        if (!gananciasPorFecha[fechaKey]) {
          gananciasPorFecha[fechaKey] = { fecha: fechaReserva, monto: 0 }
        }
        gananciasPorFecha[fechaKey].monto += monto

        gananciasTotal += monto
        if (fechaReserva >= hace7Dias) gananciasSemana += monto
        if (fechaReserva >= hace30Dias) gananciasMes += monto
        if (fechaReserva >= inicioAnio) gananciasAnio += monto
      })

      // Convertir a array y ordenar por fecha
      const gananciasPorDiaArray = Object.values(gananciasPorFecha).sort((a, b) => a.fecha - b.fecha)
      setGananciasPorDia(gananciasPorDiaArray)

      setGanancias({
        semana: gananciasSemana,
        mes: gananciasMes,
        anio: gananciasAnio,
        total: gananciasTotal
      })

      setLoading(false)
    } catch (e) {
      console.error('Error fetching report data:', e)
      setLoading(false)
    }
  }

  function generarReporte(tipo) {
    setTipoReporte(tipo)
    setModalReporte(true)
  }

  async function ejecutarReporte(params) {
    setModalReporte(false)
    
    try {
      let url = ''
      let queryParams = new URLSearchParams()
      
      if (params.fechaDesde) queryParams.append('start', params.fechaDesde)
      if (params.fechaHasta) queryParams.append('end', params.fechaHasta)
      
      switch(tipoReporte) {
        case 'reservas-cliente':
          url = `/api/informes/reporte-reservas-cliente`
          if (params.idCliente) queryParams.append('idCliente', params.idCliente)
          break
        case 'reservas-cancha':
          if (!params.idCancha) {
            alert('Debe seleccionar una cancha')
            return
          }
          url = `/api/informes/reporte-reservas-cancha`
          queryParams.append('idCancha', params.idCancha)
          break
        case 'canchas-mas-usadas':
          url = `/api/informes/reporte-canchas-mas-usadas`
          break
        case 'utilizacion-mensual':
          url = `/api/informes/utilizacion-mensual`
          if (params.year) queryParams.append('year', params.year)
          break
      }
      
      const fullUrl = `${url}?${queryParams.toString()}`
      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        throw new Error('Error al generar el reporte')
      }
      
      const data = await response.json()
      abrirVistaImpresion(data, tipoReporte, params)
    } catch (e) {
      console.error('Error generando reporte:', e)
      alert('Error al generar el reporte')
    }
  }

  function abrirVistaImpresion(data, tipo, params) {
    // Crear nueva ventana para impresión
    const ventana = window.open('', '_blank', 'width=800,height=600')
    
    if (!ventana) {
      alert('Por favor, permita ventanas emergentes para imprimir el reporte')
      return
    }
    
    const html = generarHTMLReporte(data, tipo, params)
    ventana.document.write(html)
    ventana.document.close()
    
    // Esperar a que cargue y luego mostrar diálogo de impresión
    ventana.onload = () => {
      setTimeout(() => {
        ventana.print()
      }, 250)
    }
  }

  function generarHTMLReporte(data, tipo, params) {
    const fechaActual = new Date().toLocaleDateString('es-AR')
    const fechaDesde = params.fechaDesde ? new Date(params.fechaDesde).toLocaleDateString('es-AR') : 'Inicio'
    const fechaHasta = params.fechaHasta ? new Date(params.fechaHasta).toLocaleDateString('es-AR') : 'Hoy'
    
    let contenido = ''
    let titulo = ''
    
    switch(tipo) {
      case 'reservas-cliente':
        titulo = 'Listado de Reservas por Cliente'
        contenido = generarHTMLReservasCliente(data.data)
        break
      case 'reservas-cancha':
        titulo = `Reservas de ${data.cancha?.nombre || 'Cancha'}`
        contenido = generarHTMLReservasCancha(data)
        break
      case 'canchas-mas-usadas':
        titulo = 'Canchas Más Utilizadas'
        contenido = generarHTMLCanchasMasUsadas(data.data)
        break
      case 'utilizacion-mensual':
        titulo = `Utilización Mensual de Canchas ${params.year || ''}`
        contenido = generarHTMLUtilizacionMensual(data)
        break
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @media print {
            @page { margin: 2cm; }
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 3px solid #19350C;
            padding-bottom: 20px;
          }
          .header .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .header .logo-section img {
            height: 60px;
            width: auto;
          }
          .header .logo-section .empresa-nombre {
            font-size: 20px;
            font-weight: 700;
            color: #19350C;
          }
          .header .titulo-section {
            flex: 1;
            text-align: center;
          }
          .header h1 {
            color: #19350C;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header .info {
            color: #666;
            font-size: 14px;
          }
          .periodo {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #19350C;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e9ecef;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          .seccion {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .seccion h2 {
            color: #19350C;
            font-size: 20px;
            margin-bottom: 15px;
            border-bottom: 2px solid #687D31;
            padding-bottom: 8px;
          }
          .total {
            background: #e8f4ea;
            font-weight: bold;
            font-size: 16px;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          .resumen-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #19350C;
          }
          .resumen-item .label {
            color: #666;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .resumen-item .valor {
            color: #19350C;
            font-size: 24px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .no-print {
            position: fixed;
            top: 20px;
            right: 20px;
          }
          .btn-imprimir {
            background: #19350C;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          }
          .btn-imprimir:hover {
            background: #152B08;
          }
        </style>
      </head>
      <body>
        <button class="btn-imprimir no-print" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
          <div class="logo-section">
            <img src="/assets/logo.png" alt="GoField Logo" />
            <div class="empresa-nombre">GoField</div>
          </div>
          <div class="titulo-section">
            <h1>${titulo}</h1>
            <div class="info">Generado el ${fechaActual}</div>
          </div>
        </div>
        
        ${tipo !== 'utilizacion-mensual' ? `
        <div class="periodo">
          Período: <strong>${fechaDesde}</strong> a <strong>${fechaHasta}</strong>
        </div>
        ` : ''}
        
        ${contenido}
        
        <div class="footer">
          Sistema de Gestión de Canchas - Reporte generado automáticamente
        </div>
      </body>
      </html>
    `
  }

  function generarHTMLReservasCliente(clientes) {
    if (!clientes || clientes.length === 0) {
      return '<p style="text-align: center; color: #666;">No hay datos para mostrar</p>'
    }
    
    let html = ''
    let totalGeneral = 0
    let cantidadGeneral = 0
    
    clientes.forEach(item => {
      const cliente = item.cliente || {}
      const reservas = item.reservas || []
      const totalMonto = item.total_monto || 0
      
      totalGeneral += totalMonto
      cantidadGeneral += reservas.length
      
      html += `
        <div class="seccion">
          <h2>${cliente.nombre || ''} ${cliente.apellido || ''}</h2>
          <p style="color: #666; margin-bottom: 15px;">
            DNI: ${cliente.numeroDoc || 'N/A'} | Email: ${cliente.mail || 'N/A'} | Tel: ${cliente.telefono || 'N/A'}
          </p>
          
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
      `
      
      reservas.forEach(r => {
        const fecha = new Date(r.fechaReservada).toLocaleDateString('es-AR')
        html += `
          <tr>
            <td>${fecha}</td>
            <td>${r.estado === 1 ? 'Confirmada' : r.estado === 2 ? 'Cancelada' : 'Pendiente'}</td>
            <td>$${(r.monto || 0).toFixed(2)}</td>
          </tr>
        `
      })
      
      html += `
              <tr class="total">
                <td colspan="2">Subtotal (${reservas.length} reservas)</td>
                <td>$${totalMonto.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    })
    
    html += `
      <div class="resumen">
        <div class="resumen-item">
          <div class="label">Total de Clientes</div>
          <div class="valor">${clientes.length}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Total de Reservas</div>
          <div class="valor">${cantidadGeneral}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Monto Total</div>
          <div class="valor">$${totalGeneral.toFixed(2)}</div>
        </div>
      </div>
    `
    
    return html
  }

  function generarHTMLReservasCancha(data) {
    const reservas = data.reservas || []
    
    let html = `
      <div class="resumen">
        <div class="resumen-item">
          <div class="label">Cancha</div>
          <div class="valor" style="font-size: 18px;">${data.cancha?.nombre || 'N/A'}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Deporte</div>
          <div class="valor" style="font-size: 18px;">${data.deporte || 'N/A'}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Total Reservas</div>
          <div class="valor">${data.cantidad_reservas || 0}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Monto Total</div>
          <div class="valor">$${(data.total_monto || 0).toFixed(2)}</div>
        </div>
      </div>
      
      <div class="seccion">
        <h2>Detalle de Reservas</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha Reservada</th>
              <th>Fecha Creación</th>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Estado</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
    `
    
    reservas.forEach(r => {
      const fechaReservada = new Date(r.fechaReservada).toLocaleDateString('es-AR')
      const fechaCreacion = new Date(r.fechaCreacion).toLocaleDateString('es-AR')
      
      // Información del cliente
      const cliente = r.cliente || {}
      const nombreCompleto = cliente.nombre && cliente.apellido 
        ? `${cliente.nombre} ${cliente.apellido}` 
        : `Cliente #${r.idCliente}`
      const documento = cliente.tipoDocumento && cliente.numeroDoc
        ? `${cliente.tipoDocumento} ${cliente.numeroDoc}`
        : 'N/A'
      
      html += `
        <tr>
          <td>#${r.idReserva}</td>
          <td>${fechaReservada}</td>
          <td>${fechaCreacion}</td>
          <td>${nombreCompleto}</td>
          <td>${documento}</td>
          <td>${r.estado === 1 ? 'Confirmada' : r.estado === 2 ? 'Cancelada' : 'Pendiente'}</td>
          <td>$${(r.monto || 0).toFixed(2)}</td>
        </tr>
      `
    })
    
    html += `
          </tbody>
        </table>
      </div>
    `
    
    return html
  }

  function generarHTMLCanchasMasUsadas(canchas) {
    if (!canchas || canchas.length === 0) {
      return '<p style="text-align: center; color: #666;">No hay datos para mostrar</p>'
    }
    
    const totalReservas = canchas.reduce((sum, c) => sum + (c.conteo_reservas || 0), 0)
    
    let html = `
      <div class="resumen">
        <div class="resumen-item">
          <div class="label">Total de Canchas</div>
          <div class="valor">${canchas.length}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Total de Reservas</div>
          <div class="valor">${totalReservas}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Cancha Más Usada</div>
          <div class="valor" style="font-size: 18px;">${canchas[0]?.nombre || 'N/A'}</div>
        </div>
      </div>
      
      <div class="seccion">
        <h2>Ranking de Canchas</h2>
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Cancha</th>
              <th>Deporte</th>
              <th>Cantidad de Reservas</th>
              <th>Precio/Hora</th>
            </tr>
          </thead>
          <tbody>
    `
    
    canchas.forEach((c, idx) => {
      html += `
        <tr ${idx === 0 ? 'style="background: #e8f4ea;"' : ''}>
          <td><strong>${idx + 1}°</strong></td>
          <td>${c.nombre}</td>
          <td>${c.deporte || 'N/A'}</td>
          <td><strong>${c.conteo_reservas}</strong></td>
          <td>$${(c.precioHora || 0).toFixed(2)}</td>
        </tr>
      `
    })
    
    html += `
          </tbody>
        </table>
      </div>
    `
    
    return html
  }

  function generarHTMLUtilizacionMensual(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '<p style="text-align: center; color: #666;">No hay datos para mostrar</p>'
    }
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    
    const totalReservas = data.reduce((sum, m) => sum + (m.count || 0), 0)
    const promedio = (totalReservas / 12).toFixed(1)
    const maxMes = data.reduce((max, m) => (m.count || 0) > max.count ? m : max, data[0])
    
    let html = `
      <div class="resumen">
        <div class="resumen-item">
          <div class="label">Total del Año</div>
          <div class="valor">${totalReservas}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Promedio Mensual</div>
          <div class="valor">${promedio}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Mes con Más Reservas</div>
          <div class="valor" style="font-size: 18px;">${meses[maxMes.month - 1]}</div>
        </div>
      </div>
      
      <div class="seccion">
        <h2>Detalle Mensual</h2>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Cantidad de Reservas</th>
              <th>Porcentaje del Total</th>
            </tr>
          </thead>
          <tbody>
    `
    
    data.forEach(m => {
      const porcentaje = totalReservas > 0 ? ((m.count / totalReservas) * 100).toFixed(1) : 0
      html += `
        <tr>
          <td>${meses[m.month - 1]}</td>
          <td><strong>${m.count}</strong></td>
          <td>${porcentaje}%</td>
        </tr>
      `
    })
    
    html += `
            <tr class="total">
              <td>TOTAL ANUAL</td>
              <td><strong>${totalReservas}</strong></td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    
    return html
  }

  function handleLogout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('auth')
      sessionStorage.removeItem('token')
    } catch (e) { }
    navigate('/')
  }

  // Función para generar colores para el gráfico de torta
  const COLORS = ['#19350C', '#687D31', '#406768', '#6FA9BB', '#D5D3CC', '#8B7355', '#A67C52', '#C9B896', '#2E5B4E', '#4A7C59']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gris)' }}>
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

      <main className="container" style={{ paddingTop: 120, paddingBottom: 60 }}>
        <h1 style={{ textAlign: 'center', fontSize: 36, marginBottom: 40, color: 'var(--verde-oscuro)' }}>
          Reportes y Estadísticas
        </h1>

        {loading ? (
          <p style={{ textAlign: 'center', fontSize: 18 }}>Cargando datos...</p>
        ) : (
          <div style={{ display: 'grid', gap: 32 }}>
            {/* Primera fila: 3 gráficos lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {/* Gráfico de Torta - Reservas por Cliente */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: 20, marginBottom: 16, color: 'var(--verde-oscuro)' }}>
                Reservas por Cliente
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                  <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 300 }}>
                    {reservasPorCliente.length > 0 ? (() => {
                      const total = reservasPorCliente.reduce((sum, c) => sum + c.cantidad, 0)
                      let currentAngle = 0
                      return reservasPorCliente.map((cliente, idx) => {
                        const percentage = (cliente.cantidad / total) * 100
                        const angle = (percentage / 100) * 360
                        const startAngle = currentAngle
                        const endAngle = currentAngle + angle
                        currentAngle = endAngle

                        const startRad = (startAngle - 90) * Math.PI / 180
                        const endRad = (endAngle - 90) * Math.PI / 180

                        const x1 = 100 + 80 * Math.cos(startRad)
                        const y1 = 100 + 80 * Math.sin(startRad)
                        const x2 = 100 + 80 * Math.cos(endRad)
                        const y2 = 100 + 80 * Math.sin(endRad)

                        const largeArc = angle > 180 ? 1 : 0
                        const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`

                        return (
                          <path
                            key={idx}
                            d={path}
                            fill={COLORS[idx % COLORS.length]}
                            stroke="white"
                            strokeWidth="2"
                          />
                        )
                      })
                    })() : <text x="100" y="100" textAnchor="middle" fill="#666">No hay datos</text>}
                  </svg>
                  <p style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginTop: 12, color: '#333' }}>
                    Total: {reservasPorCliente.reduce((sum, c) => sum + c.cantidad, 0)} reservas
                  </p>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  {reservasPorCliente.slice(0, 5).map((cliente, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ width: 16, height: 16, background: COLORS[idx % COLORS.length], marginRight: 8, borderRadius: 3 }}></div>
                      <span style={{ fontSize: 12 }}>{cliente.nombre}: {cliente.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico de Ingresos */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, margin: 0, color: 'var(--verde-oscuro)' }}>
                  Ingresos del Negocio
                </h2>
                <select
                  value={periodoGanancias}
                  onChange={(e) => setPeriodoGanancias(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
                >
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Último mes</option>
                  <option value="anio">Este año</option>
                  <option value="total">Total</option>
                </select>
              </div>

              {/* Gráfico de barras */}
              <div style={{ minHeight: 250 }}>
                {(() => {
                  // Filtrar datos según el período seleccionado
                  const ahora = new Date()
                  let fechaInicio
                  let labelPeriodo = 'Últimos 7 días'
                  let agruparPor = 'dia' // dia, semana, mes
                  
                  if (periodoGanancias === 'semana') {
                    fechaInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
                    labelPeriodo = 'Últimos 7 días'
                    agruparPor = 'dia'
                  } else if (periodoGanancias === 'mes') {
                    fechaInicio = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
                    labelPeriodo = 'Últimos 30 días'
                    agruparPor = 'semana'
                  } else if (periodoGanancias === 'anio') {
                    fechaInicio = new Date(ahora.getFullYear(), 0, 1)
                    labelPeriodo = 'Este año'
                    agruparPor = 'mes'
                  } else {
                    fechaInicio = new Date(0)
                    labelPeriodo = 'Total histórico'
                    agruparPor = 'mes'
                  }

                  // Filtrar datos del período
                  const datosFiltrados = gananciasPorDia.filter(d => d.fecha >= fechaInicio)
                  
                  if (datosFiltrados.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                        No hay datos de ingresos para este período
                      </div>
                    )
                  }

                  // Agrupar datos según el período
                  let datosAgrupados = []
                  
                  if (agruparPor === 'dia') {
                    // Mostrar por día
                    datosAgrupados = datosFiltrados.map(d => ({
                      label: `${d.fecha.getDate()}/${d.fecha.getMonth() + 1}`,
                      monto: d.monto
                    }))
                  } else if (agruparPor === 'semana') {
                    // Agrupar por semana
                    const semanas = {}
                    datosFiltrados.forEach(d => {
                      const weekStart = new Date(d.fecha)
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                      const weekKey = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
                      
                      if (!semanas[weekKey]) {
                        semanas[weekKey] = { label: weekKey, monto: 0 }
                      }
                      semanas[weekKey].monto += d.monto
                    })
                    datosAgrupados = Object.values(semanas)
                  } else {
                    // Agrupar por mes
                    const meses = {}
                    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                    datosFiltrados.forEach(d => {
                      const mesKey = `${nombresMeses[d.fecha.getMonth()]}`
                      
                      if (!meses[mesKey]) {
                        meses[mesKey] = { label: mesKey, monto: 0, orden: d.fecha.getMonth() }
                      }
                      meses[mesKey].monto += d.monto
                    })
                    datosAgrupados = Object.values(meses).sort((a, b) => a.orden - b.orden)
                  }

                  const maxMonto = Math.max(...datosAgrupados.map(d => d.monto), 1)
                  const totalIngresos = datosAgrupados.reduce((sum, d) => sum + d.monto, 0)

                  return (
                    <div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6, textAlign: 'center' }}>
                        {labelPeriodo} - Total: ${totalIngresos.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: datosAgrupados.length > 12 ? 2 : 6, height: 200, padding: '0 10px' }}>
                        {datosAgrupados.map((dato, idx) => {
                          const height = (dato.monto / maxMonto) * 160
                          return (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: datosAgrupados.length > 20 ? 8 : 15 }}>
                              <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 3, color: '#333', whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'bottom center' }}>
                                ${(dato.monto / 1000).toFixed(1)}k
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: height || 5,
                                  background: 'linear-gradient(180deg, #6FA9BB 0%, #406768 100%)',
                                  borderRadius: '3px 3px 0 0',
                                  transition: 'all 0.3s',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scaleY(1.05)'
                                  e.currentTarget.style.filter = 'brightness(1.1)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scaleY(1)'
                                  e.currentTarget.style.filter = 'brightness(1)'
                                }}
                                title={`$${dato.monto.toFixed(2)}`}
                              ></div>
                              <div style={{ fontSize: 9, marginTop: 4, textAlign: 'center', color: '#666' }}>
                                {dato.label}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

            {/* Gráfico de Barras - Reservas por Deporte */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, margin: 0, color: 'var(--verde-oscuro)' }}>
                  Reservas por Deporte
                </h2>
                <select
                  value={periodoReservas}
                  onChange={(e) => setPeriodoReservas(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
                >
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Último mes</option>
                  <option value="anio">Este año</option>
                  <option value="total">Total</option>
                </select>
              </div>
              <div style={{ minHeight: 250 }}>
                {reservasPorDeporte[periodoReservas].length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 250 }}>
                    {reservasPorDeporte[periodoReservas].map((deporte, idx) => {
                      const maxCantidad = Math.max(...reservasPorDeporte[periodoReservas].map(d => d.cantidad), 1)
                      const height = (deporte.cantidad / maxCantidad) * 200
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' }}>
                            {deporte.cantidad}
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: height || 5,
                              background: COLORS[idx % COLORS.length],
                              borderRadius: '6px 6px 0 0',
                              transition: 'height 0.3s'
                            }}
                          ></div>
                          <div style={{ fontSize: 11, marginTop: 6, textAlign: 'center', color: '#666' }}>
                            {deporte.nombre}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#666' }}>No hay datos para este período</p>
                )}
              </div>
            </div>

            {/* Sección de Reportes Imprimibles */}
            <div style={{ background: 'white', borderRadius: 12, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: 24, marginBottom: 24, color: 'var(--verde-oscuro)', borderBottom: '2px solid #e9ecef', paddingBottom: 16 }}>
                Reportes Imprimibles
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {/* Reporte 1: Listado de reservas por cliente */}
                <ReporteCard
                  titulo="Listado de reservas por cliente"
                  descripcion="Muestra todas las reservas agrupadas por cliente en un período específico"
                  icono="👥"
                  onGenerar={() => generarReporte('reservas-cliente')}
                />

                {/* Reporte 2: Reservas por cancha */}
                <ReporteCard
                  titulo="Reservas por cancha en un período"
                  descripcion="Detalla las reservas de una cancha específica dentro de un rango de fechas"
                  icono="🏟️"
                  onGenerar={() => generarReporte('reservas-cancha')}
                />

                {/* Reporte 3: Canchas más utilizadas */}
                <ReporteCard
                  titulo="Canchas más utilizadas"
                  descripcion="Ranking de canchas ordenadas por cantidad de reservas"
                  icono="📊"
                  onGenerar={() => generarReporte('canchas-mas-usadas')}
                />

                {/* Reporte 4: Utilización mensual */}
                <ReporteCard
                  titulo="Utilización mensual de canchas"
                  descripcion="Gráfico estadístico de uso mensual de canchas por año"
                  icono="📈"
                  onGenerar={() => generarReporte('utilizacion-mensual')}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal para configurar y generar reportes */}
      {modalReporte && (
        <ModalReporte
          tipo={tipoReporte}
          onClose={() => setModalReporte(false)}
          onGenerar={ejecutarReporte}
          canchas={reservasPorCliente}
        />
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="brand">
            <img src="/assets/logo.png" alt="logo" className="logo-small" />
            <span>GoField</span>
          </div>
          <div className="footer-links">
            <p style={{ margin: 0, color: '#666' }}>
              Contacto: <a href="mailto:gofield78@gmail.com" style={{ color: 'var(--verde-oscuro)', textDecoration: 'none' }}>gofield78@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Componente de tarjeta de reporte
function ReporteCard({ titulo, descripcion, icono, onGenerar }) {
  return (
    <div style={{
      border: '1px solid #e9ecef',
      borderRadius: 8,
      padding: 20,
      transition: 'all 0.3s',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    onClick={onGenerar}
    >
      <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>{icono}</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#333', textAlign: 'center' }}>
        {titulo}
      </h3>
      <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, textAlign: 'center', minHeight: 60 }}>
        {descripcion}
      </p>
      <button style={{
        width: '100%',
        marginTop: 16,
        padding: '10px 16px',
        background: 'var(--verde-oscuro)',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#152B08'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--verde-oscuro)'}
      >
        Generar Reporte
      </button>
    </div>
  )
}

// Modal para configurar reportes
function ModalReporte({ tipo, onClose, onGenerar }) {
  const [fechaDesde, setFechaDesde] = React.useState('')
  const [fechaHasta, setFechaHasta] = React.useState('')
  const [idCancha, setIdCancha] = React.useState('')
  const [idCliente, setIdCliente] = React.useState('')
  const [year, setYear] = React.useState(new Date().getFullYear())
  const [canchas, setCanchas] = React.useState([])
  const [clientes, setClientes] = React.useState([])

  React.useEffect(() => {
    if (tipo === 'reservas-cancha') {
      fetch('/api/canchas').then(r => r.json()).then(setCanchas)
    }
    if (tipo === 'reservas-cliente') {
      fetch('/api/clientes').then(r => r.json()).then(setClientes)
    }
  }, [tipo])

  const handleGenerar = () => {
    onGenerar({ fechaDesde, fechaHasta, idCancha, idCliente, year })
  }

  const getTitulo = () => {
    switch(tipo) {
      case 'reservas-cliente': return 'Listado de Reservas por Cliente'
      case 'reservas-cancha': return 'Reservas por Cancha'
      case 'canchas-mas-usadas': return 'Canchas Más Utilizadas'
      case 'utilizacion-mensual': return 'Utilización Mensual de Canchas'
      default: return 'Generar Reporte'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}
    onClick={onClose}
    >
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        minWidth: 400,
        maxWidth: 500
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 22, marginBottom: 24, color: 'var(--verde-oscuro)' }}>
          {getTitulo()}
        </h2>

        <div style={{ display: 'grid', gap: 16 }}>
          {tipo !== 'utilizacion-mensual' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
            </>
          )}

          {tipo === 'reservas-cancha' && (
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                Cancha *
              </label>
              <select
                value={idCancha}
                onChange={(e) => setIdCancha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14
                }}
              >
                <option value="">Seleccione una cancha</option>
                {canchas.map(c => (
                  <option key={c.idCancha} value={c.idCancha}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'reservas-cliente' && (
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                Cliente (opcional)
              </label>
              <select
                value={idCliente}
                onChange={(e) => setIdCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14
                }}
              >
                <option value="">Todos los clientes</option>
                {clientes.map(c => (
                  <option key={c.idCliente} value={c.idCliente}>
                    {c.nombre} {c.apellido}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'utilizacion-mensual' && (
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="2020"
                max="2030"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: '#e9ecef',
              color: '#333',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={tipo === 'reservas-cancha' && !idCancha}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'var(--verde-oscuro)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: tipo === 'reservas-cancha' && !idCancha ? 'not-allowed' : 'pointer',
              opacity: tipo === 'reservas-cancha' && !idCancha ? 0.5 : 1
            }}
          >
            Generar y Ver
          </button>
        </div>
      </div>
    </div>
  )
}
