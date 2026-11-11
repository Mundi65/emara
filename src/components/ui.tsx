import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dineroParaCampo, formatoDinero, leerDinero } from '../lib/formato'
import { urlFoto } from '../lib/fotos'

export const estiloCampo =
  'w-full min-h-14 rounded-2xl border-2 border-emara/30 bg-white px-4 text-xl outline-none focus:border-emara'

export function Campo({
  etiqueta,
  ayuda,
  amarillo,
  className = '',
  ...resto
}: { etiqueta: string; ayuda?: string; amarillo?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-lg font-semibold">{etiqueta}</span>
      <input className={`${estiloCampo} ${amarillo ? 'border-amber-400 bg-amber-50' : ''} ${className}`} {...resto} />
      {ayuda && <span className="text-base text-emara/70">{ayuda}</span>}
    </label>
  )
}

/** Campo de dinero con el formato de los tickets ($1.234,50). */
export function CampoDinero({
  etiqueta,
  valor,
  onCambio,
  ayuda,
  amarillo,
  autoFocus,
}: {
  etiqueta: string
  valor: number | null
  onCambio: (n: number | null) => void
  ayuda?: string
  amarillo?: boolean
  autoFocus?: boolean
}) {
  const [texto, setTexto] = useState(dineroParaCampo(valor))
  // si el valor cambia desde afuera (p. ej. un precio sugerido), actualizar el campo
  useEffect(() => {
    if (leerDinero(texto) !== valor) setTexto(dineroParaCampo(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])
  const n = leerDinero(texto)
  const malo = texto !== '' && n === null
  return (
    <label className="flex flex-col gap-2">
      <span className="text-lg font-semibold">{etiqueta}</span>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-emara/60">$</span>
        <input
          inputMode="decimal"
          autoFocus={autoFocus}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            onCambio(leerDinero(e.target.value))
          }}
          onBlur={() => n !== null && setTexto(dineroParaCampo(n))}
          className={`${estiloCampo} pl-9 ${amarillo || malo ? 'border-amber-400 bg-amber-50' : ''}`}
        />
      </div>
      {malo ? (
        <span className="text-base text-amber-700">Escribe como en el ticket: 1.234,50</span>
      ) : (
        ayuda && <span className="text-base text-emara/70">{ayuda}</span>
      )}
    </label>
  )
}

export function Opciones<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta?: string
  opciones: { valor: T; texto: string }[]
  valor: T | null
  onCambio: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {etiqueta && <span className="text-lg font-semibold">{etiqueta}</span>}
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            onClick={() => onCambio(o.valor)}
            className={`min-h-14 rounded-2xl border-2 px-4 text-lg font-semibold ${
              valor === o.valor ? 'border-emara bg-emara text-white' : 'border-emara/30 bg-white text-emara'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Interruptor({
  etiqueta,
  ayuda,
  valor,
  onCambio,
}: {
  etiqueta: string
  ayuda?: string
  valor: boolean
  onCambio: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      onClick={() => onCambio(!valor)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-white p-4 text-left shadow-sm"
    >
      <span>
        <span className="block text-lg font-semibold">{etiqueta}</span>
        {ayuda && <span className="block text-base text-emara/70">{ayuda}</span>}
      </span>
      <span className={`flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition ${valor ? 'bg-emara' : 'bg-gray-300'}`}>
        <span className={`h-7 w-7 rounded-full bg-white shadow transition ${valor ? 'translate-x-7' : ''}`} />
      </span>
    </button>
  )
}

export function Aviso({ tipo = 'ok', children }: { tipo?: 'ok' | 'error' | 'info'; children: ReactNode }) {
  const color =
    tipo === 'ok' ? 'bg-green-50 text-green-900' : tipo === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-2xl p-4 text-lg ${color}`}>
      {children}
    </div>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function Fila({ etiqueta, valor, fuerte }: { etiqueta: ReactNode; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${fuerte ? 'text-xl font-bold' : 'text-lg'}`}>
      <span className={fuerte ? '' : 'text-emara/80'}>{etiqueta}</span>
      <span className="text-right">{valor}</span>
    </div>
  )
}

export function Dinero({ valor, className = '' }: { valor: number | string | null | undefined; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatoDinero(valor)}</span>
}

export function Cargando() {
  return <p className="py-8 text-center text-xl text-emara/60">Cargando…</p>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-white p-6 text-center text-lg text-emara/70 shadow-sm">{children}</p>
}

export function EnlaceFila({ to, children, derecha }: { to: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm active:bg-dorado/30"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {derecha && <span className="shrink-0 text-right">{derecha}</span>}
      <span aria-hidden className="text-2xl text-emara/40">›</span>
    </Link>
  )
}

/** La foto identifica la joya; el código va pequeño debajo (CLAUDE.md regla 2). */
export function FotoJoya({
  ruta,
  codigo,
  tamano = 'md',
}: {
  ruta: string | null | undefined
  codigo?: string | null
  tamano?: 'sm' | 'md' | 'lg'
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    urlFoto(ruta).then((u) => vivo && setUrl(u))
    return () => {
      vivo = false
    }
  }, [ruta])
  const lado = tamano === 'sm' ? 'h-16 w-16' : tamano === 'lg' ? 'aspect-square w-full' : 'aspect-square w-full'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${lado} overflow-hidden rounded-xl bg-crema`}>
        {url ? (
          <img src={url} alt={codigo ?? 'Joya'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>💍</div>
        )}
      </div>
      {codigo && <span className="max-w-full truncate text-sm text-emara/60">{codigo}</span>}
    </div>
  )
}

/** Mensaje de error de Supabase en palabras simples */
export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/fetch|network|Failed/i.test(m)) return 'No hay internet. Revisa la conexión y vuelve a intentar.'
  if (m && !/[{}[\]]/.test(m) && m.length < 160) return m
  return 'Algo salió mal. Vuelve a intentar.'
}
