import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './hooks/useSesion'
import { supabase, supabaseConfigurado } from './lib/supabase'
import { BotonGrande } from './components/BotonGrande'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Ajustes from './pages/Ajustes'
import MuyPronto from './pages/MuyPronto'

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-bold text-emara">{titulo}</h1>
      {children}
    </div>
  )
}

export default function App() {
  const { cargando, sesion, esMiembro } = useSesion()

  if (!supabaseConfigurado) {
    return (
      <Aviso titulo="Falta conectar la base de datos">
        <p className="text-xl">
          Copia el archivo <code>.env.example</code> como <code>.env.local</code> y pon la dirección y la
          clave pública de tu proyecto Supabase.
        </p>
      </Aviso>
    )
  }

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-2xl text-emara">Cargando…</p>
      </div>
    )
  }

  if (!sesion) return <Login />

  if (!esMiembro) {
    return (
      <Aviso titulo="Tu cuenta aún no tiene permiso">
        <p className="text-xl">Entraste bien, pero falta que Mundi active tu cuenta en Emara.</p>
        <BotonGrande variante="secundario" onClick={() => supabase.auth.signOut()}>
          Salir
        </BotonGrande>
      </Aviso>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/recibir" element={<MuyPronto titulo="📦 Recibir joyas" />} />
        <Route path="/vender" element={<MuyPronto titulo="💍 Vender" />} />
        <Route path="/cobrar" element={<MuyPronto titulo="💵 Cobrar abono" />} />
        <Route path="/devolver" element={<MuyPronto titulo="📋 Devolver / Informes" />} />
        <Route path="/clientas" element={<MuyPronto titulo="👩 Clientas" />} />
        <Route path="/catalogo" element={<MuyPronto titulo="🖼️ Catálogo" />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
