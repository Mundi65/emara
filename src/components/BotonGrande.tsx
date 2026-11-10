import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variante = 'principal' | 'secundario'

const estilos: Record<Variante, string> = {
  principal: 'bg-emara text-white active:bg-emara-oscuro shadow-md',
  secundario: 'bg-white text-emara border-2 border-emara active:bg-dorado/40',
}

const base =
  'flex w-full min-h-14 items-center gap-4 rounded-2xl px-5 py-4 text-left text-xl font-semibold transition-colors disabled:opacity-50'

type Props = {
  icono?: ReactNode
  variante?: Variante
  children: ReactNode
}

/** Botón de al menos 56 px de alto (CLAUDE.md regla 7). */
export function BotonGrande({
  icono,
  variante = 'principal',
  children,
  className = '',
  ...resto
}: Props & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${estilos[variante]} ${className}`} {...resto}>
      {icono && <span className="text-3xl" aria-hidden>{icono}</span>}
      <span>{children}</span>
    </button>
  )
}

/** Igual que BotonGrande, pero lleva a otra pantalla. */
export function EnlaceGrande({ icono, variante = 'principal', children, to }: Props & { to: string }) {
  return (
    <Link to={to} className={`${base} ${estilos[variante]} min-h-20 text-2xl`}>
      {icono && <span className="text-4xl" aria-hidden>{icono}</span>}
      <span>{children}</span>
    </Link>
  )
}
