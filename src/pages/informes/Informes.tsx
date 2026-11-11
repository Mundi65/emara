import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { EnlaceFila, Dinero } from '../../components/ui'
import { formatoFecha, hoyISO } from '../../lib/formato'

type LoteAbierto = { lote_id: string; nombre: string; proveedora: string; joyas_disponibles: number; joyas_vendidas: number }

/** Devolver lotes e informes: todo lo que no es vender ni cobrar. */
export default function Informes() {
  const [lotes, setLotes] = useState<LoteAbierto[]>([])
  const [atrasadas, setAtrasadas] = useState<number | null>(null)
  const [proximo, setProximo] = useState<{ fecha_cobro: string; monto: number } | null>(null)

  useEffect(() => {
    supabase
      .from('v_liquidacion_lotes')
      .select('lote_id, nombre, proveedora, joyas_disponibles, joyas_vendidas')
      .neq('estado', 'cerrado')
      .order('fecha_recepcion')
      .then(({ data }) => setLotes((data as LoteAbierto[]) ?? []))
    supabase
      .from('v_clientas_atrasadas')
      .select('clienta_id', { count: 'exact', head: true })
      .then(({ count }) => setAtrasadas(count ?? 0))
    supabase
      .from('cheques')
      .select('fecha_cobro, monto')
      .eq('estado', 'por_cobrar')
      .gte('fecha_cobro', hoyISO())
      .order('fecha_cobro')
      .limit(1)
      .then(({ data }) => setProximo(data?.[0] ?? null))
  }, [])

  return (
    <Pantalla titulo="📋 Devolver / Informes" volver="/">
      <h2 className="text-xl font-bold">Lotes abiertos (para devolver)</h2>
      {lotes.length === 0 ? (
        <p className="text-lg text-emara/70">No hay lotes abiertos.</p>
      ) : (
        lotes.map((l) => (
          <EnlaceFila
            key={l.lote_id}
            to={`/lotes/${l.lote_id}`}
            derecha={<span className="text-base text-emara/70">{l.joyas_disponibles} por devolver</span>}
          >
            <span className="block text-lg font-semibold">{l.nombre}</span>
            <span className="block text-base text-emara/70">{l.proveedora} · {l.joyas_vendidas} vendidas</span>
          </EnlaceFila>
        ))
      )}

      <h2 className="mt-4 text-xl font-bold">Informes</h2>
      <EnlaceFila
        to="/atrasadas"
        derecha={atrasadas ? <span className="font-bold text-red-700">{atrasadas}</span> : undefined}
      >
        <span className="text-lg font-semibold">⏰ Clientas atrasadas</span>
      </EnlaceFila>
      <EnlaceFila
        to="/cheques"
        derecha={
          proximo ? (
            <span className="text-base text-emara/70">
              {formatoFecha(proximo.fecha_cobro)}
              <br />
              <Dinero valor={proximo.monto} />
            </span>
          ) : undefined
        }
      >
        <span className="text-lg font-semibold">🗓️ Cheques 🔒</span>
      </EnlaceFila>
      <EnlaceFila to="/balance">
        <span className="text-lg font-semibold">📈 Mi balance y utilidad 🔒</span>
      </EnlaceFila>
      <EnlaceFila to="/proveedoras">
        <span className="text-lg font-semibold">🏷️ Proveedoras e inventario 🔒</span>
      </EnlaceFila>
      <EnlaceFila to="/clientas">
        <span className="text-lg font-semibold">👩 Todas las clientas</span>
      </EnlaceFila>
      <p className="text-base text-emara/70">🔒 = pide tu PIN (Modo dueña).</p>
    </Pantalla>
  )
}
