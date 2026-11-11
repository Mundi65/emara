import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatoDinero, formatoFecha, hoyISO } from '../lib/formato'
import { EnlaceGrande } from '../components/BotonGrande'
import { useSesion } from '../hooks/useSesion'
import { APP } from '../config/app'

type Resumen = { total: number; clientas: number }
type Alertas = { atrasadas: number; cheque: { fecha_cobro: string; monto: number } | null }

export default function Inicio() {
  const { nombre } = useSesion()
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [alertas, setAlertas] = useState<Alertas>({ atrasadas: 0, cheque: null })

  useEffect(() => {
    // El saldo se CALCULA en la base de datos (view), nunca se guarda a mano.
    supabase
      .from('v_saldos_clientas')
      .select('saldo')
      .gt('saldo', 0)
      .then(({ data }) => {
        if (!data) return
        const total = data.reduce((suma, fila) => suma + Number(fila.saldo), 0)
        setResumen({ total, clientas: data.length })
      })
    supabase
      .from('v_clientas_atrasadas')
      .select('clienta_id', { count: 'exact', head: true })
      .then(({ count }) => setAlertas((a) => ({ ...a, atrasadas: count ?? 0 })))
    // próximo cheque en los siguientes 7 días
    const enSiete = new Date()
    enSiete.setDate(enSiete.getDate() + 7)
    supabase
      .from('cheques')
      .select('fecha_cobro, monto')
      .eq('estado', 'por_cobrar')
      .lte('fecha_cobro', enSiete.toISOString().slice(0, 10))
      .order('fecha_cobro')
      .limit(1)
      .then(({ data }) => setAlertas((a) => ({ ...a, cheque: data?.[0] ?? null })))
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
      <header className="mb-6">
        <p className="text-xl text-emara/80">Hola{nombre ? `, ${nombre}` : ''} 👋</p>
        <h1 className="text-3xl font-bold text-emara">{APP.nombre}</h1>
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          {resumen === null ? (
            <p className="text-xl text-emara/60">Cargando…</p>
          ) : resumen.clientas === 0 ? (
            <p className="text-xl">Nadie te debe por ahora ✨</p>
          ) : (
            <p className="text-xl">
              Te deben <strong className="text-2xl text-emara">{formatoDinero(resumen.total)}</strong>
              <span className="text-emara/70">
                {' '}
                · {resumen.clientas} {resumen.clientas === 1 ? 'clienta' : 'clientas'}
              </span>
            </p>
          )}
        </div>
        {alertas.atrasadas > 0 && (
          <Link to="/atrasadas" className="mt-3 flex min-h-14 items-center rounded-2xl bg-red-50 px-4 text-lg font-semibold text-red-800">
            ⏰ {alertas.atrasadas} {alertas.atrasadas === 1 ? 'clienta atrasada' : 'clientas atrasadas'} ›
          </Link>
        )}
        {alertas.cheque && (
          <Link to="/cheques" className="mt-3 flex min-h-14 items-center rounded-2xl bg-amber-50 px-4 text-lg font-semibold text-amber-900">
            🗓️ Cheque de {formatoDinero(alertas.cheque.monto)}{' '}
            {alertas.cheque.fecha_cobro < hoyISO() ? 'con fecha pasada' : `el ${formatoFecha(alertas.cheque.fecha_cobro)}`} ›
          </Link>
        )}
      </header>

      <nav className="flex flex-1 flex-col gap-4">
        <EnlaceGrande to="/recibir" icono="📦">Recibir joyas</EnlaceGrande>
        <EnlaceGrande to="/vender" icono="💍">Vender</EnlaceGrande>
        <EnlaceGrande to="/cobrar" icono="💵">Cobrar abono</EnlaceGrande>
        <EnlaceGrande to="/informes" icono="📋">Devolver / Informes</EnlaceGrande>
      </nav>

      <footer className="mt-8 grid grid-cols-3 gap-2">
        {[
          { to: '/clientas', texto: 'Clientas', icono: '👩' },
          { to: '/catalogo', texto: 'Catálogo', icono: '🖼️' },
          { to: '/ajustes', texto: 'Ajustes', icono: '⚙️' },
        ].map((e) => (
          <Link
            key={e.to}
            to={e.to}
            className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-white text-lg font-semibold text-emara shadow-sm active:bg-dorado/40"
          >
            <span aria-hidden className="text-2xl">{e.icono}</span>
            {e.texto}
          </Link>
        ))}
      </footer>
    </div>
  )
}
