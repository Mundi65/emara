import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './hooks/useSesion'
import { PinProvider, usePin } from './hooks/usePin'
import { supabase, supabaseConfigurado } from './lib/supabase'
import { BotonGrande } from './components/BotonGrande'
import { TecladoPin } from './components/TecladoPin'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Ajustes from './pages/ajustes/Ajustes'
import CambiarPin from './pages/ajustes/CambiarPin'
import Seguridad from './pages/ajustes/Seguridad'
import Recibir from './pages/recibir/Recibir'
import NuevoLote from './pages/lotes/NuevoLote'
import FichaLote from './pages/lotes/FichaLote'
import CerrarLote from './pages/lotes/CerrarLote'
import VerCierre from './pages/lotes/VerCierre'
import FichaJoya from './pages/joyas/FichaJoya'
import Vender from './pages/vender/Vender'
import Cobrar, { ElegirClientaCobrar } from './pages/cobrar/Cobrar'
import Clientas from './pages/clientas/Clientas'
import EditarClienta from './pages/clientas/EditarClienta'
import FichaClienta from './pages/clientas/FichaClienta'
import Atrasadas from './pages/clientas/Atrasadas'
import Cheques from './pages/cheques/Cheques'
import Informes from './pages/informes/Informes'
import Balance from './pages/informes/Balance'
import Proveedoras from './pages/proveedoras/Proveedoras'
import FichaProveedora from './pages/proveedoras/FichaProveedora'
import Catalogo from './pages/catalogo/Catalogo'

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl font-semibold text-emara">{titulo}</h1>
      {children}
    </div>
  )
}

/** Pantalla de bloqueo: aparece si la app estuvo 5 minutos sin usarse. */
function Bloqueo() {
  const { verificar } = usePin()
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4">
      <img src="/marca/ave-cafe.png" alt="" className="mx-auto h-20 w-auto" />
      <TecladoPin titulo="Emara" subtitulo="Escribe tu PIN para entrar" onCompleto={verificar} />
      <button
        type="button"
        onClick={() => {
          if (window.confirm('¿Olvidaste tu PIN? Sales de la app y entras otra vez con tu correo y clave.')) {
            supabase.auth.signOut()
          }
        }}
        className="min-h-14 text-lg font-semibold text-emara underline"
      >
        Olvidé mi PIN
      </button>
    </div>
  )
}

function Rutas() {
  const { bloqueada } = usePin()
  if (bloqueada) return <Bloqueo />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/recibir" element={<Recibir />} />
        <Route path="/lotes/nuevo" element={<NuevoLote />} />
        <Route path="/lotes/:id" element={<FichaLote />} />
        <Route path="/lotes/:id/cerrar" element={<CerrarLote />} />
        <Route path="/lotes/:id/cierre" element={<VerCierre />} />
        <Route path="/joyas/:id" element={<FichaJoya />} />
        <Route path="/vender" element={<Vender />} />
        <Route path="/cobrar" element={<ElegirClientaCobrar />} />
        <Route path="/cobrar/:id" element={<Cobrar />} />
        <Route path="/clientas" element={<Clientas />} />
        <Route path="/clientas/nueva" element={<EditarClienta />} />
        <Route path="/clientas/:id" element={<FichaClienta />} />
        <Route path="/clientas/:id/editar" element={<EditarClienta />} />
        <Route path="/atrasadas" element={<Atrasadas />} />
        <Route path="/cheques" element={<Cheques />} />
        <Route path="/informes" element={<Informes />} />
        <Route path="/devolver" element={<Navigate to="/informes" replace />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/proveedoras" element={<Proveedoras />} />
        <Route path="/proveedoras/:id" element={<FichaProveedora />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/ajustes/pin" element={<CambiarPin />} />
        <Route path="/ajustes/seguridad" element={<Seguridad />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
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
        <img src="/marca/ave-cafe.png" alt="Cargando…" className="h-24 w-auto animate-pulse" />
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
    <PinProvider>
      <Rutas />
    </PinProvider>
  )
}
