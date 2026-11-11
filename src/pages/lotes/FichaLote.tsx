import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { EnlaceGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Cargando, Dinero, Fila, FotoJoya, Opciones, Tarjeta, Vacio } from '../../components/ui'
import { formatoFecha } from '../../lib/formato'
import type { Joya } from '../../lib/tipos'

type Resumen = {
  lote_id: string
  nombre: string
  proveedora: string
  proveedora_id: string
  es_propio: boolean
  estado: string
  fecha_recepcion: string
  comision_pct: number
  joyas_total: number
  joyas_disponibles: number
  joyas_vendidas: number
  total_ticket: number
  comision_valor: number
  valor_a_pagar: number
}

type Filtro = 'por_devolver' | 'vendidas' | 'todas'

function claveChecks(loteId: string) {
  return `emara-tickets-puestos-${loteId}`
}

export default function FichaLote() {
  const { id } = useParams()
  const [r, setR] = useState<Resumen | null>(null)
  const [joyas, setJoyas] = useState<Joya[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('por_devolver')
  const [puestos, setPuestos] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(claveChecks(id!)) ?? '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    supabase.from('v_liquidacion_lotes').select('*').eq('lote_id', id!).single().then(({ data }) => setR(data as Resumen))
    supabase
      .from('joyas')
      .select('*')
      .eq('lote_id', id!)
      .order('casilla')
      .then(({ data }) => setJoyas((data as Joya[]) ?? []))
  }, [id])

  function marcar(joyaId: string) {
    const nuevo = { ...puestos, [joyaId]: !puestos[joyaId] }
    setPuestos(nuevo)
    try {
      localStorage.setItem(claveChecks(id!), JSON.stringify(nuevo))
    } catch {
      /* sin almacenamiento */
    }
  }

  const lista = useMemo(() => {
    if (!joyas) return []
    if (filtro === 'por_devolver') return joyas.filter((j) => j.estado === 'disponible' || j.estado === 'devuelta')
    if (filtro === 'vendidas') return joyas.filter((j) => j.estado === 'vendida')
    return joyas
  }, [joyas, filtro])

  const porDevolver = joyas?.filter((j) => j.estado === 'disponible') ?? []
  const faltan = porDevolver.filter((j) => !puestos[j.id]).length
  const abierto = r?.estado !== 'cerrado'

  return (
    <Pantalla titulo={r ? r.nombre : 'Lote'} volver="/informes">
      {!r || !joyas ? (
        <Cargando />
      ) : (
        <>
          <p className="-mt-4 text-lg text-emara/70">
            {r.proveedora} · recibido {formatoFecha(r.fecha_recepcion)} · {abierto ? 'abierto' : 'cerrado'}
          </p>

          {abierto && (
            <EnlaceGrande to={`/recibir?lote=${r.lote_id}`} icono="📸">
              Recibir más joyas
            </EnlaceGrande>
          )}

          <SoloDuena>
            <Tarjeta>
              <Fila etiqueta="Joyas recibidas" valor={r.joyas_total} />
              <Fila etiqueta="Vendidas" valor={r.joyas_vendidas} />
              <Fila etiqueta="En mano" valor={r.joyas_disponibles} />
              <Fila etiqueta="Total ticket de lo vendido" valor={<Dinero valor={r.total_ticket} />} />
              {!r.es_propio && (
                <>
                  <Fila etiqueta={`Tu comisión (${Number(r.comision_pct)} %)`} valor={<Dinero valor={r.comision_valor} />} />
                  <Fila fuerte etiqueta="A pagar a la proveedora" valor={<Dinero valor={r.valor_a_pagar} />} />
                </>
              )}
            </Tarjeta>
            {abierto && !r.es_propio && (
              <EnlaceGrande to={`/lotes/${r.lote_id}/cerrar`} icono="🧾">
                Cerrar lote y registrar cheques
              </EnlaceGrande>
            )}
            {!abierto && (
              <Link to={`/lotes/${r.lote_id}/cierre`} className="text-center text-lg font-semibold text-emara underline">
                Ver el cierre de este lote
              </Link>
            )}
          </SoloDuena>

          <h2 className="mt-2 text-xl font-bold">Joyas por casilla</h2>
          {abierto && porDevolver.length > 0 && (
            <Tarjeta>
              <p className="text-lg">
                Para devolver: <strong>faltan {faltan} de {porDevolver.length}</strong> tickets por poner
              </p>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${((porDevolver.length - faltan) / porDevolver.length) * 100}%` }}
                />
              </div>
            </Tarjeta>
          )}
          <Opciones
            opciones={[
              { valor: 'por_devolver', texto: abierto ? 'En mano' : 'Devueltas' },
              { valor: 'vendidas', texto: 'Vendidas' },
              { valor: 'todas', texto: 'Todas' },
            ]}
            valor={filtro}
            onCambio={setFiltro}
          />
          {lista.length === 0 ? (
            <Vacio>No hay joyas aquí.</Vacio>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lista.map((j) => (
                <div key={j.id} className="rounded-2xl bg-white p-2 shadow-sm">
                  <Link to={`/joyas/${j.id}`}>
                    <FotoJoya ruta={j.foto_joya_path} codigo={j.codigo_ticket} />
                  </Link>
                  <p className="mt-1 text-center text-2xl font-bold text-emara">{j.casilla}</p>
                  {j.estado === 'disponible' && abierto ? (
                    <button
                      type="button"
                      onClick={() => marcar(j.id)}
                      className={`mt-1 min-h-12 w-full rounded-xl text-base font-semibold ${
                        puestos[j.id] ? 'bg-green-600 text-white' : 'border-2 border-emara/30 text-emara'
                      }`}
                    >
                      {puestos[j.id] ? '✓ Ticket puesto' : 'Poner ticket'}
                    </button>
                  ) : (
                    <p className="text-center text-base text-emara/70">{j.estado === 'vendida' ? 'Vendida' : j.estado === 'devuelta' ? 'Devuelta' : j.estado}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Pantalla>
  )
}
