import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Aviso, Campo, CampoDinero, Cargando, Dinero, Fila, Tarjeta, mensajeError } from '../../components/ui'
import { formatoDinero, formatoFecha, hoyISO } from '../../lib/formato'
import { chequesCercanos, sumarMeses } from '../../lib/cheques'
import type { Cheque } from '../../lib/tipos'

type Resumen = {
  lote_id: string
  nombre: string
  proveedora: string
  proveedora_id: string
  es_propio: boolean
  estado: string
  comision_pct: number
  joyas_total: number
  joyas_disponibles: number
  joyas_vendidas: number
  total_ticket: number
  comision_valor: number
  valor_a_pagar: number
}

type FilaCheque = { numero: string; banco: string; monto: number | null; fecha_cobro: string }

export default function CerrarLote() {
  return (
    <Pantalla titulo="🧾 Cerrar lote">
      <SoloDuena>
        <Formulario />
      </SoloDuena>
    </Pantalla>
  )
}

/** Reparte el total en N cheques iguales (el último absorbe los centavos). */
function repartir(total: number, n: number, primera: string, cadaMeses: number, banco: string): FilaCheque[] {
  if (n <= 0) return []
  const base = Math.floor((total / n) * 100) / 100
  return Array.from({ length: n }, (_, i) => ({
    numero: '',
    banco,
    monto: i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base,
    fecha_cobro: primera ? sumarMeses(primera, i * cadaMeses) : '',
  }))
}

function Formulario() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [r, setR] = useState<Resumen | null>(null)
  const [existentes, setExistentes] = useState<Cheque[]>([])
  const [cantidad, setCantidad] = useState('1')
  const [primera, setPrimera] = useState(sumarMeses(hoyISO(), 6))
  const [cadaMeses, setCadaMeses] = useState('1')
  const [banco, setBanco] = useState('')
  const [filas, setFilas] = useState<FilaCheque[]>([])
  const [fecha, setFecha] = useState(hoyISO())
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('v_liquidacion_lotes')
      .select('*')
      .eq('lote_id', id!)
      .single()
      .then(({ data }) => {
        const res = data as Resumen
        setR(res)
        if (res && !res.es_propio) setFilas(repartir(Number(res.valor_a_pagar), 1, sumarMeses(hoyISO(), 6), 1, ''))
      })
    supabase
      .from('v_cheques')
      .select('*')
      .eq('estado', 'por_cobrar')
      .then(({ data }) => setExistentes((data as Cheque[]) ?? []))
  }, [id])

  const sumaCheques = useMemo(() => filas.reduce((s, f) => s + (f.monto ?? 0), 0), [filas])

  if (!r) return <Cargando />
  if (r.estado === 'cerrado') return <Aviso tipo="info">Este lote ya está cerrado.</Aviso>

  const valor = Number(r.valor_a_pagar)
  const diferencia = Math.round((sumaCheques - valor) * 100) / 100

  function generar() {
    setFilas(repartir(valor, Math.max(0, Number(cantidad) || 0), primera, Math.max(0, Number(cadaMeses) || 0), banco))
  }

  function cambiarFila(i: number, cambio: Partial<FilaCheque>) {
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambio } : f)))
  }

  async function cerrar() {
    if (!r) return
    setError(null)
    for (const [i, f] of filas.entries()) {
      if (!f.monto || f.monto <= 0) return setError(`Escribe el valor del cheque ${i + 1}.`)
      if (!f.fecha_cobro) return setError(`Elige la fecha del cheque ${i + 1}.`)
    }
    const aviso = [
      `Vas a cerrar "${r.nombre}".`,
      `${r.joyas_disponibles} joyas no vendidas quedan como DEVUELTAS.`,
      !r.es_propio ? `Se guardan ${filas.length} cheque(s) por ${formatoDinero(sumaCheques)}.` : '',
      diferencia !== 0 ? `Ojo: los cheques no suman lo que toca pagar (${formatoDinero(valor)}).` : '',
      '¿Seguir?',
    ]
      .filter(Boolean)
      .join('\n\n')
    if (!window.confirm(aviso)) return
    setGuardando(true)
    const { error } = await supabase.rpc('cerrar_lote', {
      p_lote_id: r.lote_id,
      p_cheques: filas.map((f) => ({
        numero: f.numero.trim() || null,
        banco: f.banco.trim() || null,
        monto: f.monto,
        fecha_cobro: f.fecha_cobro,
      })),
      p_notas: notas.trim() || null,
      p_fecha: fecha,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    navegar(`/lotes/${r.lote_id}/cierre`, { replace: true })
  }

  return (
    <>
      <Tarjeta>
        <p className="mb-2 text-xl font-bold">{r.nombre} · {r.proveedora}</p>
        <Fila etiqueta="Joyas vendidas" valor={r.joyas_vendidas} />
        <Fila etiqueta="Joyas que devuelves" valor={r.joyas_disponibles} />
        <Fila etiqueta="Suma de tickets vendidos" valor={<Dinero valor={r.total_ticket} />} />
        <Fila etiqueta={`− Tu comisión (${Number(r.comision_pct)}%)`} valor={<Dinero valor={r.comision_valor} />} />
        <Fila fuerte etiqueta="Valor final a pagar" valor={<Dinero valor={valor} />} />
      </Tarjeta>
      <p className="text-base text-emara/70">
        Antes de cerrar, revisa en la ficha del lote que todas las joyas no vendidas tengan su ticket puesto.
      </p>

      {r.es_propio ? (
        <Aviso tipo="info">Son tus joyas: no hay que pagar a nadie ni girar cheques.</Aviso>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-bold">Cheques</h2>
          <Tarjeta className="flex flex-col gap-3">
            <Campo etiqueta="¿Cuántos cheques?" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            <Campo etiqueta="Fecha del primero" type="date" value={primera} onChange={(e) => setPrimera(e.target.value)} />
            <Campo etiqueta="Uno cada cuántos meses" inputMode="numeric" value={cadaMeses} onChange={(e) => setCadaMeses(e.target.value)} />
            <Campo etiqueta="Banco (opcional)" value={banco} onChange={(e) => setBanco(e.target.value)} />
            <BotonGrande variante="secundario" onClick={generar} className="justify-center">
              Repartir {formatoDinero(valor)} en cheques
            </BotonGrande>
          </Tarjeta>

          {filas.map((f, i) => {
            const { mismoDia, mismaSemana } = chequesCercanos(f.fecha_cobro, existentes)
            const enEsteCierre = filas.filter((g, j) => j !== i && g.fecha_cobro === f.fecha_cobro).length
            return (
              <Tarjeta key={i} className="flex flex-col gap-3">
                <p className="text-xl font-bold">Cheque {i + 1}</p>
                <CampoDinero etiqueta="Valor" valor={f.monto} onCambio={(n) => cambiarFila(i, { monto: n })} />
                <Campo etiqueta="Fecha de cobro" type="date" value={f.fecha_cobro} onChange={(e) => cambiarFila(i, { fecha_cobro: e.target.value })} />
                {(mismoDia.length > 0 || enEsteCierre > 0) && (
                  <Aviso tipo="info">
                    ⚠️ Ese mismo día ya sale otro cheque
                    {mismoDia[0] ? ` (${mismoDia[0].proveedora}, ${formatoDinero(mismoDia[0].monto)})` : ''}.
                  </Aviso>
                )}
                {mismoDia.length === 0 && enEsteCierre === 0 && mismaSemana.length > 0 && (
                  <Aviso tipo="info">
                    ⚠️ Esa semana ya salen {mismaSemana.length} cheque(s):{' '}
                    {mismaSemana.map((c) => `${formatoFecha(c.fecha_cobro)} ${formatoDinero(c.monto)}`).join(', ')}.
                  </Aviso>
                )}
                <Campo etiqueta="Número (opcional)" value={f.numero} onChange={(e) => cambiarFila(i, { numero: e.target.value })} />
                <Campo etiqueta="Banco (opcional)" value={f.banco} onChange={(e) => cambiarFila(i, { banco: e.target.value })} />
                <button
                  type="button"
                  onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))}
                  className="min-h-14 self-start text-lg font-semibold text-red-700 underline"
                >
                  Quitar este cheque
                </button>
              </Tarjeta>
            )
          })}
          <BotonGrande
            variante="secundario"
            icono="➕"
            onClick={() => setFilas((fs) => [...fs, { numero: '', banco, monto: null, fecha_cobro: '' }])}
          >
            Agregar otro cheque
          </BotonGrande>
          <Tarjeta>
            <Fila etiqueta="Suman los cheques" valor={<Dinero valor={sumaCheques} />} />
            <Fila etiqueta="Toca pagar" valor={<Dinero valor={valor} />} />
            {diferencia !== 0 && (
              <Fila
                fuerte
                etiqueta={diferencia > 0 ? 'Sobra' : 'Falta'}
                valor={<Dinero valor={Math.abs(diferencia)} className="text-amber-700" />}
              />
            )}
          </Tarjeta>
        </>
      )}

      <Campo etiqueta="Fecha del cierre" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <Campo etiqueta="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <BotonGrande onClick={cerrar} disabled={guardando} className="min-h-20 justify-center text-2xl">
        {guardando ? 'Cerrando…' : 'Cerrar el lote'}
      </BotonGrande>
    </>
  )
}
