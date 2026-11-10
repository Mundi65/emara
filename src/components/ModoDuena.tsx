import type { ReactNode } from 'react'
import { usePin } from '../hooks/usePin'
import { TecladoPin } from './TecladoPin'

/**
 * Lo que va dentro solo se ve en "Modo dueña" (con PIN).
 * Aquí van costos, comisiones, utilidad y cierres (CLAUDE.md regla 1).
 */
export function SoloDuena({ children }: { children: ReactNode }) {
  const { modoDuena, entrarModoDuena } = usePin()
  if (modoDuena) return <>{children}</>
  return (
    <div className="py-6">
      <TecladoPin
        titulo="🔒 Modo dueña"
        subtitulo="Escribe tu PIN para ver costos y ganancias"
        onCompleto={entrarModoDuena}
      />
    </div>
  )
}
