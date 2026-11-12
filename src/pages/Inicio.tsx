import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatoDinero, formatoFecha, hoyISO } from '../lib/formato'
import { EnlaceGrande } from '../components/BotonGrande'
import { useSesion } from '../hooks/useSesion'
import { APP } from '../config/app'
import { AlarmClock, CalendarDays, Images, Settings, Users } from 'lucide-react'

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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-6">
      {/* Cabecera café con el colibrí del logo */}
      <header className="relative mb-5 overflow-hidden rounded-3xl bg-emara px-5 pt-5 pb-6 text-white shadow-suave">
        <img
          src="/marca/ave-beige.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-3 right-3 w-32 opacity-25"
        />
        <p className="text-lg text-dorado">Hola{nombre ? `, ${nombre}` : ''}</p>
        <h1 className="text-5xl font-semibold tracking-wide">{APP.nombre}</h1>
        <p className="mt-1 text-sm tracking-[0.3em] text-white/70 uppercase">Fashion jewelry</p>

        <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3">
          {resumen === null ? (
            <p className="text-lg text-white/70">Cargando…</p>
          ) : resumen.clientas === 0 ? (
            <p className="text-lg">Nadie te debe por ahora</p>
          ) : (
            <>
              <p className="text-base text-white/80">Te deben</p>
              <p className="font-titulo text-4xl font-semibold text-dorado tabular-nums">{formatoDinero(resumen.total)}</p>
              <p className="text-base text-white/80">
                {resumen.clientas} {resumen.clientas === 1 ? 'clienta' : 'clientas'}
              </p>
            </>
          )}
        </div>
      </header>

      {(alertas.atrasadas > 0 || alertas.cheque) && (
        <div className="mb-5 flex flex-col gap-3">
          {alertas.atrasadas > 0 && (
            <Link
              to="/atrasadas"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 text-lg font-semibold text-red-800"
            >
              <AlarmClock size={24} strokeWidth={1.7} aria-hidden />
              <span className="flex-1">
                {alertas.atrasadas} {alertas.atrasadas === 1 ? 'clienta atrasada' : 'clientas atrasadas'}
              </span>
              <span aria-hidden>›</span>
            </Link>
          )}
          {alertas.cheque && (
            <Link
              to="/cheques"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-lg font-semibold text-amber-900"
            >
              <CalendarDays size={24} strokeWidth={1.7} aria-hidden />
              <span className="flex-1">
                Cheque de {formatoDinero(alertas.cheque.monto)}{' '}
                {alertas.cheque.fecha_cobro < hoyISO() ? 'con fecha pasada' : `el ${formatoFecha(alertas.cheque.fecha_cobro)}`}
              </span>
              <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-3">
        <EnlaceGrande to="/vender" icono="💍">Vender</EnlaceGrande>
        <EnlaceGrande to="/cobrar" icono="💵" variante="secundario">Cobrar abono</EnlaceGrande>
        <EnlaceGrande to="/recibir" icono="📦" variante="secundario">Recibir joyas</EnlaceGrande>
        <EnlaceGrande to="/informes" icono="📋" variante="secundario">Devolver / Informes</EnlaceGrande>
      </nav>

      <footer className="mt-6 grid grid-cols-3 gap-3">
        {[
          { to: '/clientas', texto: 'Clientas', Icono: Users },
          { to: '/catalogo', texto: 'Catálogo', Icono: Images },
          { to: '/ajustes', texto: 'Ajustes', Icono: Settings },
        ].map((e) => (
          <Link
            key={e.to}
            to={e.to}
            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-linea bg-white text-base font-semibold text-emara shadow-suave active:bg-arena"
          >
            <e.Icono size={26} strokeWidth={1.6} aria-hidden />
            {e.texto}
          </Link>
        ))}
      </footer>
    </div>
  )
}
