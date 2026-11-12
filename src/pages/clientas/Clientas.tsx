import { AlarmClock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { EnlaceGrande } from '../../components/BotonGrande'
import { Cargando, Dinero, EnlaceFila, Vacio, estiloCampo } from '../../components/ui'
import type { SaldoClienta } from '../../lib/tipos'

/** Lista de clientas con buscador. `destino` decide a dónde lleva cada una. */
export function ListaClientas({
  soloConSaldo = false,
  destino,
}: {
  soloConSaldo?: boolean
  destino: (id: string) => string
}) {
  const [filas, setFilas] = useState<SaldoClienta[] | null>(null)
  const [buscar, setBuscar] = useState('')

  useEffect(() => {
    let q = supabase.from('v_saldos_clientas').select('*').order('nombre')
    if (soloConSaldo) q = q.gt('saldo', 0)
    q.then(({ data }) => setFilas((data as SaldoClienta[]) ?? []))
  }, [soloConSaldo])

  const lista = useMemo(() => {
    const b = buscar.trim().toLowerCase()
    return (filas ?? []).filter((c) => !b || c.nombre.toLowerCase().includes(b))
  }, [filas, buscar])

  return (
    <>
      <input
        type="search"
        placeholder="Buscar por nombre"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        className={estiloCampo}
      />
      {!filas ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio>{soloConSaldo ? 'Nadie te debe por ahora' : 'Todavía no hay clientas.'}</Vacio>
      ) : (
        lista.map((c) => (
          <EnlaceFila
            key={c.clienta_id}
            to={destino(c.clienta_id)}
            derecha={
              Number(c.saldo) > 0 ? (
                <span className="block">
                  <span className="block text-sm text-emara/70">Te debe</span>
                  <Dinero valor={c.saldo} className="text-xl font-bold text-emara" />
                </span>
              ) : (
                <span className="text-base text-green-700">Al día</span>
              )
            }
          >
            <span className="block text-xl font-semibold">{c.nombre}</span>
          </EnlaceFila>
        ))
      )}
    </>
  )
}

export default function Clientas() {
  return (
    <Pantalla titulo="👩 Clientas" volver="/">
      <EnlaceGrande to="/clientas/nueva" icono="➕">
        Nueva clienta
      </EnlaceGrande>
      <EnlaceFila to="/atrasadas" icono={<AlarmClock size={22} strokeWidth={1.6} />}>Clientas atrasadas en sus pagos</EnlaceFila>
      <ListaClientas destino={(id) => `/clientas/${id}`} />
    </Pantalla>
  )
}
