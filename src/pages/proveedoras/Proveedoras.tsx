import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { EnlaceGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Cargando, Dinero, EnlaceFila } from '../../components/ui'

type Fila = {
  proveedora_id: string
  nombre: string
  es_propio: boolean
  comision_pct: number
  tope_credito: number | null
  joyas_disponibles: number
  credito_usado: number
  lotes_abiertos: number
}

export function BarraTope({ usado, tope }: { usado: number; tope: number | null }) {
  if (!tope) return null
  const pct = Math.min(100, Math.round((usado / tope) * 100))
  const color = pct >= 100 ? 'bg-red-600' : pct >= 85 ? 'bg-amber-500' : 'bg-green-600'
  return (
    <div className="mt-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-base ${pct >= 85 ? 'font-semibold text-amber-800' : 'text-emara/70'}`}>
        Usado <Dinero valor={usado} /> de <Dinero valor={tope} /> ({pct} %)
        {pct >= 100 ? ' · ¡Llegaste al tope!' : pct >= 85 ? ' · Cerca del tope' : ''}
      </p>
    </div>
  )
}

export default function Proveedoras() {
  const [filas, setFilas] = useState<Fila[] | null>(null)

  useEffect(() => {
    supabase
      .from('v_inventario_proveedoras')
      .select('*')
      .order('es_propio')
      .order('nombre')
      .then(({ data }) => setFilas((data as Fila[]) ?? []))
  }, [])

  return (
    <Pantalla titulo="🏷️ Proveedoras" volver="/informes">
      <SoloDuena>
        {!filas ? (
          <Cargando />
        ) : (
          filas.map((p) => (
            <EnlaceFila
              key={p.proveedora_id}
              to={`/proveedoras/${p.proveedora_id}`}
              derecha={!p.es_propio && <span className="text-xl font-bold text-emara">{Number(p.comision_pct)} %</span>}
            >
              <span className="block text-xl font-semibold">
                                {p.nombre}
              </span>
              <span className="block text-base text-emara/70">
                {p.joyas_disponibles} joyas en mano · {p.lotes_abiertos} {p.lotes_abiertos === 1 ? 'lote abierto' : 'lotes abiertos'}
              </span>
              <BarraTope usado={Number(p.credito_usado)} tope={p.tope_credito ? Number(p.tope_credito) : null} />
            </EnlaceFila>
          ))
        )}
        <EnlaceGrande to="/proveedoras/nueva" icono="➕">
          Nueva proveedora
        </EnlaceGrande>
      </SoloDuena>
    </Pantalla>
  )
}
