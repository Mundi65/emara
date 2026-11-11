import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      {volver !== false && (
        <div className="mb-2 flex items-center justify-between">
          <Link to={volver} className="inline-flex min-h-14 items-center text-lg font-semibold text-emara">
            ← Volver
          </Link>
          {volver !== '/' && (
            <Link to="/" className="inline-flex min-h-14 items-center px-2 text-lg font-semibold text-emara/70">
              🏠 Inicio
            </Link>
          )}
        </div>
      )}
      <h1 className="mb-6 text-3xl font-bold text-emara">{titulo}</h1>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
