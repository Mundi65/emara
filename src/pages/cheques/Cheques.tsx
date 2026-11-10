import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import {
  Aviso,
  Campo,
  CampoDinero,
  Cargando,
  Dinero,
  Fila,
  Opciones,
  Tarjeta,
  Vacio,
  estiloCampo,
  mensajeError,
} from '../../components/ui'
import { MESES_LARGOS, formatoDinero, formatoFecha, hoyISO } from '../../lib/formato'
import { chequesCercanos } from '../../lib/cheques'
import type { Cheque, Proveedora } from '../../lib/tipos'

type Vista = 'por_cobrar' | 'cobrado' | 'todos'

/** Cheques girados a las proveedoras: calendario, totales y avisos de fechas cruzadas. */
export default function Cheques() {
  return (
    <Pantalla titulo="🗓️ Cheques" volver="/informes">
      <SoloDuena>
        <ListaCheques />
      </SoloDuena>
    </Pantalla>
  )
}

function ListaCheques() {
  const [cheques, setCheques] = useState<Cheque[] | null>(null)
  const [vista, setVista] = useState<Vista>('por_cobrar')
  const [nuevo, setNuevo] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const { data, error } = await supabase.from('v_cheques').select('*').neq('estado', 'anulado').order('fecha_cobro')
    if (error) setError(mensajeError(error))
    setCheques((data as Cheque[]) ?? [])
  }
  useEffect(() => {
    cargar()
  }, [])

  const hoy = hoyISO()
  const totales = useMemo(() => {
    const t = { cobrado: 0, porCobrar: 0, vencidos: 0, esteMes: 0 }
    const mes = hoy.slice(0, 7)
    for (const c of cheques ?? []) {
      const m = Number(c.monto)
      if (c.estado === 'cobrado') t.cobrado += m
      else {
        t.porCobrar += m
        if (c.fecha_cobro <= hoy) t.vencidos += m
        if (c.fecha_cobro.startsWith(mes)) t.esteMes += m
      }
    }
    return t
  }, [cheques, hoy])

  const visibles = (cheques ?? []).filter((c) => vista === 'todos' || c.estado === vista)
  const porMes = useMemo(() => {
    const grupos = new Map<string, Cheque[]>()
    for (const c of visibles) {
      const k = c.fecha_cobro.slice(0, 7)
      grupos.set(k, [...(grupos.get(k) ?? []), c])
    }
    return [...grupos.entries()]
  }, [visibles])

  const pendientes = (cheques ?? []).filter((c) => c.estado === 'por_cobrar')

  async function marcarCobrado(c: Cheque, cobrado: boolean) {
    const { error } = await supabase
      .from('cheques')
      .update({ estado: cobrado ? 'cobrado' : 'por_cobrar', cobrado_en: cobrado ? hoy : null })
      .eq('id', c.id)
    if (error) return setError(mensajeError(error))
    setAbierto(null)
    cargar()
  }

  async function anular(c: Cheque) {
    const motivo = window.prompt('¿Por qué anulas este cheque? (queda registrado)')
    if (motivo === null) return
    const { error } = await supabase
      .from('cheques')
      .update({ estado: 'anulado', notas: [c.notas, `Anulado: ${motivo || 'sin motivo'}`].filter(Boolean).join(' · ') })
      .eq('id', c.id)
    if (error) return setError(mensajeError(error))
    setAbierto(null)
    cargar()
  }

  if (!cheques) return <Cargando />

  if (nuevo) return <NuevoCheque existentes={pendientes} alTerminar={() => { setNuevo(false); cargar() }} />

  return (
    <>
      <Tarjeta>
        <Fila etiqueta="Ya salió (cobrado)" valor={<Dinero valor={totales.cobrado} />} />
        <Fila fuerte etiqueta="Falta por salir" valor={<Dinero valor={totales.porCobrar} />} />
        <Fila etiqueta="Este mes" valor={<Dinero valor={totales.esteMes} />} />
        {totales.vencidos > 0 && (
          <Fila etiqueta="⚠️ Ya llegó la fecha" valor={<Dinero valor={totales.vencidos} className="text-red-700" />} />
        )}
      </Tarjeta>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Opciones
        opciones={[
          { valor: 'por_cobrar', texto: 'Por cobrar' },
          { valor: 'cobrado', texto: 'Cobrados' },
          { valor: 'todos', texto: 'Todos' },
        ]}
        valor={vista}
        onCambio={setVista}
      />
      {porMes.length === 0 ? (
        <Vacio>No hay cheques aquí.</Vacio>
      ) : (
        porMes.map(([mes, lista]) => {
          const [a, m] = mes.split('-').map(Number)
          const suma = lista.reduce((s, c) => s + Number(c.monto), 0)
          return (
            <section key={mes} className="flex flex-col gap-2">
              <h2 className="flex items-baseline justify-between text-xl font-bold capitalize">
                <span>{MESES_LARGOS[m - 1]} {a}</span>
                <Dinero valor={suma} className="text-lg" />
              </h2>
              {lista.map((c) => {
                const { mismoDia, mismaSemana } = chequesCercanos(c.fecha_cobro, pendientes, c.id)
                const cruce = c.estado === 'por_cobrar' && (mismoDia.length > 0 || mismaSemana.length > 0)
                const vencido = c.estado === 'por_cobrar' && c.fecha_cobro <= hoy
                return (
                  <Tarjeta key={c.id} className={`flex flex-col gap-1 ${c.estado === 'cobrado' ? 'opacity-70' : ''}`}>
                    <button type="button" onClick={() => setAbierto(abierto === c.id ? null : c.id)} className="text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xl font-semibold">{formatoFecha(c.fecha_cobro)}</span>
                        <Dinero valor={c.monto} className="text-xl font-bold" />
                      </div>
                      <p className="text-base text-emara/70">
                        {c.proveedora}
                        {c.lote ? ` · ${c.lote}` : ''}
                        {c.numero ? ` · N.º ${c.numero}` : ''}
                        {c.banco ? ` · ${c.banco}` : ''}
                      </p>
                      <p className="text-base font-semibold">
                        {c.estado === 'cobrado'
                          ? `✓ Cobrado${c.cobrado_en ? ` el ${formatoFecha(c.cobrado_en)}` : ''}`
                          : vencido
                            ? <span className="text-red-700">⚠️ Ya llegó la fecha</span>
                            : 'Por cobrar'}
                      </p>
                      {cruce && (
                        <p className="text-base text-amber-800">
                          {mismoDia.length > 0
                            ? `⚠️ Otro cheque cae el mismo día (${formatoDinero(mismoDia[0].monto)})`
                            : `⚠️ Hay ${mismaSemana.length} cheque(s) más esa misma semana`}
                        </p>
                      )}
                    </button>
                    {abierto === c.id && (
                      <div className="mt-2 flex flex-col gap-2">
                        {c.estado === 'por_cobrar' ? (
                          <BotonGrande onClick={() => marcarCobrado(c, true)} className="justify-center">
                            ✓ Ya lo cobraron
                          </BotonGrande>
                        ) : (
                          <BotonGrande variante="secundario" onClick={() => marcarCobrado(c, false)} className="justify-center">
                            Volver a "por cobrar"
                          </BotonGrande>
                        )}
                        <button type="button" onClick={() => anular(c)} className="min-h-14 text-lg font-semibold text-red-700 underline">
                          Anular este cheque
                        </button>
                      </div>
                    )}
                  </Tarjeta>
                )
              })}
            </section>
          )
        })
      )}
      <BotonGrande icono="➕" variante="secundario" onClick={() => setNuevo(true)}>
        Agregar un cheque suelto
      </BotonGrande>
      <p className="text-base text-emara/70">
        Los cheques de un lote se agregan al cerrarlo, desde la ficha del lote.
      </p>
    </>
  )
}

function NuevoCheque({ existentes, alTerminar }: { existentes: Cheque[]; alTerminar: () => void }) {
  const [proveedoras, setProveedoras] = useState<Proveedora[]>([])
  const [proveedoraId, setProveedoraId] = useState('')
  const [monto, setMonto] = useState<number | null>(null)
  const [fecha, setFecha] = useState('')
  const [numero, setNumero] = useState('')
  const [banco, setBanco] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('proveedoras')
      .select('*')
      .eq('es_propio', false)
      .order('nombre')
      .then(({ data }) => setProveedoras((data as Proveedora[]) ?? []))
  }, [])

  const { mismoDia, mismaSemana } = chequesCercanos(fecha, existentes)

  async function guardar() {
    setError(null)
    if (!proveedoraId) return setError('Elige a qué proveedora es el cheque.')
    if (!monto || monto <= 0) return setError('Escribe el valor del cheque.')
    if (!fecha) return setError('Elige la fecha de cobro.')
    setGuardando(true)
    const { error } = await supabase.from('cheques').insert({
      proveedora_id: proveedoraId,
      monto,
      fecha_cobro: fecha,
      numero: numero.trim() || null,
      banco: banco.trim() || null,
      notas: notas.trim() || null,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    alTerminar()
  }

  return (
    <>
      <h2 className="text-2xl font-bold">Nuevo cheque</h2>
      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold">Proveedora</span>
        <select value={proveedoraId} onChange={(e) => setProveedoraId(e.target.value)} className={estiloCampo}>
          <option value="">Elige…</option>
          {proveedoras.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </label>
      <CampoDinero etiqueta="Valor" valor={monto} onCambio={setMonto} />
      <Campo etiqueta="Fecha de cobro" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      {mismoDia.length > 0 && (
        <Aviso tipo="info">⚠️ Ya tienes un cheque de {formatoDinero(mismoDia[0].monto)} ese mismo día ({mismoDia[0].proveedora}).</Aviso>
      )}
      {mismoDia.length === 0 && mismaSemana.length > 0 && (
        <Aviso tipo="info">
          ⚠️ Esa semana ya salen {mismaSemana.length} cheque(s) por{' '}
          {formatoDinero(mismaSemana.reduce((s, c) => s + Number(c.monto), 0))}.
        </Aviso>
      )}
      <Campo etiqueta="Número de cheque (opcional)" value={numero} onChange={(e) => setNumero(e.target.value)} />
      <Campo etiqueta="Banco (opcional)" value={banco} onChange={(e) => setBanco(e.target.value)} />
      <Campo etiqueta="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <BotonGrande onClick={guardar} disabled={guardando} className="justify-center">
        {guardando ? 'Guardando…' : 'Guardar cheque'}
      </BotonGrande>
      <BotonGrande variante="secundario" onClick={alTerminar} className="justify-center">
        Cancelar
      </BotonGrande>
    </>
  )
}
