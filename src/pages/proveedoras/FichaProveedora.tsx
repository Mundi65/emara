import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande, EnlaceGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Aviso, Campo, CampoDinero, Cargando, EnlaceFila, Tarjeta, mensajeError } from '../../components/ui'
import { formatoFecha, leerPorcentaje } from '../../lib/formato'
import type { Lote, Proveedora } from '../../lib/tipos'

const vacia: Proveedora = {
  id: '',
  nombre: '',
  telefono: null,
  notas: null,
  comision_pct: 0,
  tope_credito: null,
  es_propio: false,
  activa: true,
}

export default function FichaProveedora() {
  const { id } = useParams()
  const nueva = id === 'nueva'
  const navegar = useNavigate()
  const [p, setP] = useState<Proveedora | null>(nueva ? vacia : null)
  const [comision, setComision] = useState('')
  const [lotes, setLotes] = useState<Lote[]>([])
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (nueva) return
    supabase
      .from('proveedoras')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data }) => {
        setP(data as Proveedora)
        setComision(String(Number(data?.comision_pct ?? 0)).replace('.', ','))
      })
    supabase
      .from('lotes')
      .select('*')
      .eq('proveedora_id', id!)
      .order('fecha_recepcion', { ascending: false })
      .then(({ data }) => setLotes((data as Lote[]) ?? []))
  }, [id, nueva])

  async function guardar() {
    if (!p) return
    setAviso(null)
    const pct = p.es_propio ? 0 : leerPorcentaje(comision)
    if (!p.nombre.trim()) return setAviso({ tipo: 'error', texto: 'Escribe el nombre de la proveedora.' })
    if (pct === null) return setAviso({ tipo: 'error', texto: 'La comisión debe ser un número entre 0 y 100.' })
    setGuardando(true)
    const datos = {
      nombre: p.nombre.trim(),
      telefono: p.telefono?.trim() || null,
      notas: p.notas?.trim() || null,
      comision_pct: pct,
      tope_credito: p.tope_credito,
    }
    const { data, error } = nueva
      ? await supabase.from('proveedoras').insert(datos).select('id').single()
      : await supabase.from('proveedoras').update(datos).eq('id', p.id).select('id').single()
    setGuardando(false)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    if (nueva) navegar(`/proveedoras/${data!.id}`, { replace: true })
    else setAviso({ tipo: 'ok', texto: '✓ Guardado. La comisión nueva se usará en los lotes nuevos.' })
  }

  return (
    <Pantalla titulo={nueva ? 'Nueva proveedora' : p?.nombre ?? 'Proveedora'} volver="/proveedoras">
      <SoloDuena>
        {!p ? (
          <Cargando />
        ) : (
          <>
            {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
            <Tarjeta className="flex flex-col gap-4">
              <Campo etiqueta="Nombre" value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} />
              {!p.es_propio && (
                <>
                  <Campo
                    etiqueta="Teléfono"
                    inputMode="tel"
                    value={p.telefono ?? ''}
                    onChange={(e) => setP({ ...p, telefono: e.target.value })}
                  />
                  <Campo
                    etiqueta="Comisión que te paga (%)"
                    ayuda="Se calcula sobre el precio del ticket de cada joya vendida"
                    inputMode="decimal"
                    value={comision}
                    onChange={(e) => setComision(e.target.value)}
                  />
                  <CampoDinero
                    etiqueta="Tope de crédito (opcional)"
                    ayuda="Lo máximo que te puede dejar entre joyas en mano y vendidas sin liquidar. Te aviso al acercarte."
                    valor={p.tope_credito}
                    onCambio={(n) => setP({ ...p, tope_credito: n })}
                  />
                </>
              )}
              {p.es_propio && (
                <p className="text-lg text-emara/80">
                  Aquí van tus propias joyas. No tienen comisión: el costo es lo que tú pagaste por cada una.
                </p>
              )}
              <Campo etiqueta="Notas" value={p.notas ?? ''} onChange={(e) => setP({ ...p, notas: e.target.value })} />
              <BotonGrande onClick={guardar} disabled={guardando} className="justify-center">
                {guardando ? 'Guardando…' : 'Guardar'}
              </BotonGrande>
            </Tarjeta>

            {!nueva && (
              <>
                <h2 className="mt-4 text-xl font-bold">Lotes</h2>
                <EnlaceGrande to={`/lotes/nuevo?proveedora=${p.id}`} icono="📦">
                  Nuevo lote
                </EnlaceGrande>
                {lotes.map((l) => (
                  <EnlaceFila
                    key={l.id}
                    to={`/lotes/${l.id}`}
                    derecha={
                      <span className={l.estado === 'cerrado' ? 'text-emara/50' : 'font-semibold text-green-700'}>
                        {l.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}
                      </span>
                    }
                  >
                    <span className="block text-lg font-semibold">{l.nombre}</span>
                    <span className="block text-base text-emara/70">Recibido {formatoFecha(l.fecha_recepcion)}</span>
                  </EnlaceFila>
                ))}
              </>
            )}
          </>
        )}
      </SoloDuena>
    </Pantalla>
  )
}
