import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Marco común de cada pantalla: título grande y botón "Volver". */
export function Pantalla({
  titulo,
  volver = true,
  children,
}: {
  titulo: string
  volver?: boolean
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
      {volver && (
        <Link to="/" className="mb-2 inline-flex min-h-14 items-center text-lg font-semibold text-emara">
          ← Volver
        </Link>
      )}
      <h1 className="mb-6 text-3xl font-bold text-emara">{titulo}</h1>
      {children}
    </div>
  )
}
