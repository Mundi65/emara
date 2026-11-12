import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, House } from 'lucide-react'
import { sinEmoji } from './Icono'

/**
 * Marco común de cada pantalla: botón "Volver" y título grande.
 * "Volver" siempre lleva a una pantalla fija (nunca al historial),
 * así nunca se queda dando vueltas entre dos pantallas.
 */
export function Pantalla({
  titulo,
  volver = '/',
  children,
}: {
  titulo: ReactNode
  /** ruta a la que lleva "Volver" (por defecto, Inicio) · false = sin botón */
  volver?: string | false
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
      {volver !== false && (
        <div className="mb-1 flex items-center justify-between">
          <Link to={volver} className="-ml-2 inline-flex min-h-14 items-center gap-1 px-2 text-lg font-semibold text-emara">
            <ChevronLeft size={24} strokeWidth={1.8} aria-hidden />
            Volver
          </Link>
          {volver !== '/' && (
            <Link
              to="/"
              aria-label="Inicio"
              className="inline-flex min-h-14 items-center gap-2 px-2 text-lg font-semibold text-emara/70"
            >
              <House size={22} strokeWidth={1.6} aria-hidden />
              Inicio
            </Link>
          )}
        </div>
      )}
      <h1 className="mb-2 text-4xl leading-tight font-semibold text-emara">{sinEmoji(titulo)}</h1>
      <div className="mb-6 h-px w-12 bg-dorado" aria-hidden />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
