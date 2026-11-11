import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { SoloDuena } from '../../components/ModoDuena'
import { Aviso, Cargando, Dinero, Fila, FotoJoya, Opciones, Tarjeta, Vacio, mensajeError } from '../../components/ui'
import { fechaISO, formatoFecha, textoPlazo } from '../../lib/formato'

type FilaBalance = {
  venta_id: string
  fecha: string
  clienta: string
  plazo_meses: number
  joya_id: string
  codigo_ticket: string | null
  foto_joya_path: string | null
  lote: string
  proveedora_id: string
  proveedora: string
  precio_ticket: number
  comision_pct: number | null
  comision_valor: number
  precio_venta: number
  excedente: number
  utilidad: number
}

type Periodo = 'mes' | 'tres' | 'anio' | 'todo'

function pct(parte: number, total: number) {
  if (!total) return ''
  return `${(Math.round((parte / total) * 1000) / 10).toLocaleString('es-EC')}%`
}

/** Balance privado de Aida: precio real de venta, comisión y utilidad. Solo con PIN. */
export default function Balance() {
  return (
    <Pantalla titulo="📈 Mi balance" volver="/informes">
      <SoloDuena>
        <Contenido />
      </SoloDuena>
    </Pantalla>
  )
}

function Contenido() {
  const [filas, setFilas] = useState<FilaBalance[] | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [proveedora, setProveedora] = useState('todas')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const { data, error } = await supabase.from('v_balance_ventas').select('*').order('fecha', { ascending: false })
    if (error) setError(mensajeError(error))
    setFilas((data as FilaBalance[]) ?? [])
  }
  useEffect(() => {
    cargar()
  }, [])

  const desde = useMemo(() => {
    const h = new Date()
    if (periodo === 'mes') return fechaISO(new Date(h.getFullYear(), h.getMonth(), 1))
    if (periodo === 'tres') return fechaISO(new Date(h.getFullYear(), h.getMonth() - 2, 1))
    if (periodo === 'anio') return fechaISO(new Date(h.getFullYear(), 0, 1))
    return ''
  }, [periodo])

  const proveedoras = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of filas ?? []) m.set(f.proveedora_id, f.proveedora)
    return [...m.entries()]
  }, [filas])

  const visibles = (filas ?? []).filter(
    (f) => (!desde || f.fecha.slice(0, 10) >= desde) && (proveedora === 'todas' || f.proveedora_id === proveedora),
  )

  const t = visibles.reduce(
    (s, f) => ({
      ticket: s.ticket + Number(f.precio_ticket),
      comision: s.comision + Number(f.comision_valor),
      venta: s.venta + Number(f.precio_venta),
      excedente: s.excedente + Number(f.excedente),
      utilidad: s.utilidad + Number(f.utilidad),
    }),
    { ticket: 0, comision: 0, venta: 0, excedente: 0, utilidad: 0 },
  )

  async function anular(f: FilaBalance) {
    const motivo = window.prompt(
      `¿Anular la venta del ${formatoFecha(f.fecha)} a ${f.clienta}? Toda esa venta se anula, las joyas vuelven a estar disponibles y queda registrado.\n\nEscribe el motivo:`,
    )
    if (!motivo) return
    const { error } = await supabase.rpc('anular_venta', { p_venta_id: f.venta_id, p_motivo: motivo })
    if (error) return setError(mensajeError(error))
    setAbierta(null)
    cargar()
  }

  if (!filas) return <Cargando />

  return (
    <>
      <Opciones
        opciones={[
          { valor: 'mes', texto: 'Este mes' },
          { valor: 'tres', texto: '3 meses' },
          { valor: 'anio', texto: 'Este año' },
          { valor: 'todo', texto: 'Todo' },
        ]}
        valor={periodo}
        onCambio={setPeriodo}
      />
      {proveedoras.length > 1 && (
        <Opciones
          opciones={[{ valor: 'todas', texto: 'Todas' }, ...proveedoras.map(([id, n]) => ({ valor: id, texto: n }))]}
          valor={proveedora}
          onCambio={setProveedora}
        />
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}

      <Tarjeta>
        <Fila etiqueta={`Joyas vendidas`} valor={visibles.length} />
        <Fila etiqueta="Vendiste en" valor={<Dinero valor={t.venta} />} />
        <Fila etiqueta="Precio de ticket" valor={<Dinero valor={t.ticket} />} />
        <Fila etiqueta={`Comisión (${pct(t.comision, t.ticket)} del ticket)`} valor={<Dinero valor={t.comision} />} />
        <Fila etiqueta="Excedente (venta − ticket)" valor={<Dinero valor={t.excedente} />} />
        <Fila fuerte etiqueta={`Utilidad (${pct(t.utilidad, t.venta)} de la venta)`} valor={<Dinero valor={t.utilidad} />} />
      </Tarjeta>

      {visibles.length === 0 ? (
        <Vacio>No hay ventas en este periodo.</Vacio>
      ) : (
        visibles.map((f) => (
          <Tarjeta key={f.venta_id + f.joya_id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setAbierta(abierta === f.joya_id ? null : f.joya_id)}
              className="flex gap-3 text-left"
            >
              <div className="w-20 shrink-0">
                <FotoJoya ruta={f.foto_joya_path} codigo={f.codigo_ticket} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{f.clienta}</p>
                <p className="text-base text-emara/70">
                  {formatoFecha(f.fecha)} · {textoPlazo(f.plazo_meses)} · {f.proveedora}
                </p>
                <p className="text-lg">
                  Utilidad <strong><Dinero valor={f.utilidad} /></strong>
                </p>
              </div>
            </button>
            {abierta === f.joya_id && (
              <div>
                <Fila etiqueta="Precio de ticket" valor={<Dinero valor={f.precio_ticket} />} />
                <Fila etiqueta={`Comisión ${Number(f.comision_pct ?? 0)}%`} valor={<Dinero valor={f.comision_valor} />} />
                <Fila etiqueta="Precio de venta" valor={<Dinero valor={f.precio_venta} />} />
                <Fila etiqueta="Excedente" valor={<Dinero valor={f.excedente} />} />
                <Fila fuerte etiqueta={`Utilidad (${pct(Number(f.utilidad), Number(f.precio_venta))})`} valor={<Dinero valor={f.utilidad} />} />
                <p className="text-base text-emara/70">Lote: {f.lote}</p>
                <button type="button" onClick={() => anular(f)} className="mt-2 min-h-14 text-lg font-semibold text-red-700 underline">
                  Anular esta venta
                </button>
              </div>
            )}
          </Tarjeta>
        ))
      )}
    </>
  )
}
