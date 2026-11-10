import { supabase } from '../lib/supabase'
import { Pantalla } from '../components/Pantalla'
import { BotonGrande } from '../components/BotonGrande'
import { useSesion } from '../hooks/useSesion'

export default function Ajustes() {
  const { sesion } = useSesion()

  return (
    <Pantalla titulo="Ajustes">
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-lg text-emara/70">Entraste como</p>
        <p className="text-xl font-semibold break-all">{sesion?.user.email}</p>
      </div>
      <p className="mb-6 text-lg text-emara/70">
        Muy pronto aquí: nombre del negocio, tu WhatsApp, PIN, margen y categorías.
      </p>
      <BotonGrande variante="secundario" icono="🚪" onClick={() => supabase.auth.signOut()}>
        Salir de la cuenta
      </BotonGrande>
    </Pantalla>
  )
}
