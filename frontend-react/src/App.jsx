import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SportDetail from './pages/SportDetail'
import Reservas from './pages/Reservas'
import MisReservas from './pages/MisReservas'
import Canchas from './pages/Canchas'
import ProximasReservas from './pages/ProximasReservas'
import Perfil from './pages/Perfil'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
  <Route path="/login" element={<Login/>} />
  <Route path="/dashboard" element={<Dashboard/>} />
  <Route path="/canchas" element={<Canchas/>} />
  <Route path="/deporte/:slug" element={<SportDetail/>} />
  <Route path="/reservas" element={<Reservas/>} />
  <Route path="/mis-reservas" element={<MisReservas/>} />
  <Route path="/proximas-reservas" element={<ProximasReservas/>} />
  <Route path="/perfil" element={<Perfil/>} />
    </Routes>
  )
}
