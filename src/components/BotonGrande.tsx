import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icono } from './Icono'

type Variante = 'principal' | 'secundario'

const estilos: Record<Variante, string> = {
  principal: 'bg-emara text-white active:bg-emara-oscuro shadow-suave',
  secundario: 'bg-white text-emara border border-linea active:bg-arena shadow-suave',
}

const base =
  'flex w-full min-h-14 items-center gap-4 rounded-2xl px-5 py-4 text-left text-xl font-semibold transition-colors disabled:opacity-50'

const circulo: Record<Variante, string> = {
  principal: 'bg-white/15 text-dorado',
  secundario: 'bg-arena text-emara',
}

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
      {icono && <Icono de={icono} />}
      <span>{children}</span>
    </button>
  )
}

/** Igual que BotonGrande, pero lleva a otra pantalla. */
export function EnlaceGrande({ icono, variante = 'principal', children, to }: Props & { to: string }) {
  return (
    <Link to={to} className={`${base} ${estilos[variante]} min-h-20`}>
      {icono && (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${circulo[variante]}`}>
          <Icono de={icono} />
        </span>
      )}
      <span className="flex-1">{children}</span>
      <span aria-hidden className="text-2xl opacity-50">›</span>
    </Link>
  )
}
