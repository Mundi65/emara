import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/** Marco común de cada pantalla: botón "Volver" y título grande. */
export function Pantalla({
  titulo,
  volver = true,
  children,
}: {
  titulo: ReactNode
  /** true = vuelve a la pantalla anterior · texto = vuelve a esa ruta · false = sin botón */
  volver?: boolean | string
  children: ReactNode
}) {
  const navegar = useNavigate()
  const clase = 'mb-2 inline-flex min-h-14 items-center text-lg font-semibold text-emara'
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      {typeof volver === 'string' ? (
        <Link to={volver} className={clase}>← Volver</Link>
      ) : volver ? (
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navegar(-1) : navegar('/'))}
          className={`${clase} self-start`}
        >
          ← Volver
        </button>
      ) : null}
      <h1 className="mb-6 text-3xl font-bold text-emara">{titulo}</h1>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
