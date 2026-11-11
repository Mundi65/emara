import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande, EnlaceGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Cargando, Dinero, Fila, FotoJoya, Tarjeta, Vacio } from '../../components/ui'
import { formatoDinero, formatoFecha } from '../../lib/formato'
import { abrirWhatsApp } from '../../lib/whatsapp'
import type { Cheque, Joya } from '../../lib/tipos'

type Cierre = {
  id: string
  lote_id: string
  fecha: string
  joyas_vendidas: number
  joyas_devueltas: number
  total_ticket: number
  comision_pct: number
  comision_valor: number
  valor_final: number
  notas: string | null
}

/**
 * Ficha del cierre de un lote. El informe para la proveedora muestra
 * solo los precios de ticket: nunca el precio al que Aida vendió.
 */
export default function VerCierre() {
  return (
    <Pantalla titulo="🧾 Cierre del lote" volver={`/lotes/${useParams().id}`}>
      <SoloDuena>
        <Contenido />
      </SoloDuena>
    </Pantalla>
  )
}

function Contenido() {
  const { id } = useParams()
  const [cierre, setCierre] = useState<Cierre | null | undefined>(undefined)
  const [lote, setLote] = useState<{ nombre: string; proveedora: string; telefono: string | null } | null>(null)
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [vendidas, setVendidas] = useState<Joya[]>([])

  useEffect(() => {
    supabase
      .from('cierres')
      .select('*')
      .eq('lote_id', id!)
      .maybeSingle()
      .then(({ data }) => {
        setCierre((data as Cierre) ?? null)
        if (data)
          supabase
            .from('v_cheques')
            .select('*')
            .eq('cierre_id', data.id)
            .order('fecha_cobro')
            .then(({ data: ch }) => setCheques((ch as Cheque[]) ?? []))
      })
    supabase
      .from('lotes')
      .select('nombre, proveedoras(nombre, telefono)')
      .eq('id', id!)
      .single()
      .then(({ data }) => {
        const p = (data as unknown as { nombre: string; proveedoras: { nombre: string; telefono: string | null } }) ?? null
        if (p) setLote({ nombre: p.nombre, proveedora: p.proveedoras?.nombre ?? '', telefono: p.proveedoras?.telefono ?? null })
      })
    supabase
      .from('joyas')
      .select('*')
      .eq('lote_id', id!)
      .eq('estado', 'vendida')
      .order('casilla')
      .then(({ data }) => setVendidas((data as Joya[]) ?? []))
  }, [id])

  if (cierre === undefined || !lote) return <Cargando />
  if (cierre === null) {
    return (
      <>
        <Vacio>Este lote todavía no está cerrado.</Vacio>
        <EnlaceGrande to={`/lotes/${id}/cerrar`} icono="🧾">Cerrar el lote</EnlaceGrande>
      </>
    )
  }

  function informeProveedora() {
    if (!cierre || !lote) return
    const lineas = [
      `*Liquidación ${lote.nombre}*`,
      `Fecha: ${formatoFecha(cierre.fecha)}`,
      '',
      `Joyas vendidas: ${cierre.joyas_vendidas}`,
      ...vendidas.map((j) => `• ${j.codigo_ticket ?? j.codigo} — ${formatoDinero(j.precio_costo)}`),
      '',
      `Suma de tickets: ${formatoDinero(cierre.total_ticket)}`,
      `Comisión ${Number(cierre.comision_pct)}%: −${formatoDinero(cierre.comision_valor)}`,
      `*Valor a pagar: ${formatoDinero(cierre.valor_final)}*`,
      `Joyas devueltas: ${cierre.joyas_devueltas}`,
      '',
      cheques.length ? `Cheques (${cheques.length}):` : '',
      ...cheques.map(
        (c) => `• ${formatoFecha(c.fecha_cobro)} — ${formatoDinero(c.monto)}${c.numero ? ` (N.º ${c.numero})` : ''}`,
      ),
    ]
    abrirWhatsApp(lote.telefono, lineas.filter((l, i, a) => l || a[i - 1]).join('\n'))
  }

  const sumaCheques = cheques.reduce((s, c) => s + Number(c.monto), 0)

  return (
    <>
      <Tarjeta>
        <p className="mb-2 text-xl font-bold">{lote.nombre} · {lote.proveedora}</p>
        <Fila etiqueta="Cerrado el" valor={formatoFecha(cierre.fecha)} />
        <Fila etiqueta="Joyas vendidas" valor={cierre.joyas_vendidas} />
        <Fila etiqueta="Joyas devueltas" valor={cierre.joyas_devueltas} />
        <Fila etiqueta="Suma de tickets" valor={<Dinero valor={cierre.total_ticket} />} />
        <Fila etiqueta={`Comisión (${Number(cierre.comision_pct)}%)`} valor={<Dinero valor={cierre.comision_valor} />} />
        <Fila fuerte etiqueta="Valor final" valor={<Dinero valor={cierre.valor_final} />} />
        {cierre.notas && <p className="mt-2 text-base text-emara/70">{cierre.notas}</p>}
      </Tarjeta>

      <h2 className="mt-2 text-xl font-bold">Cheques ({cheques.length}) · <Dinero valor={sumaCheques} /></h2>
      {cheques.length === 0 ? (
        <Vacio>Sin cheques.</Vacio>
      ) : (
        cheques.map((c) => (
          <Tarjeta key={c.id} className="flex items-baseline justify-between">
            <span className="text-lg">
              {formatoFecha(c.fecha_cobro)}
              <span className="block text-base text-emara/70">
                {c.estado === 'cobrado' ? '✓ Cobrado' : c.estado === 'anulado' ? 'Anulado' : 'Por cobrar'}
                {c.numero ? ` · N.º ${c.numero}` : ''}
              </span>
            </span>
            <Dinero valor={c.monto} className="text-xl font-bold" />
          </Tarjeta>
        ))
      )}
      <EnlaceGrande to="/cheques" variante="secundario" icono="🗓️">Ver calendario de cheques</EnlaceGrande>

      <h2 className="mt-2 text-xl font-bold">Joyas vendidas de este lote</h2>
      <div className="grid grid-cols-3 gap-2">
        {vendidas.map((j) => (
          <FotoJoya key={j.id} ruta={j.foto_joya_path} codigo={j.codigo} />
        ))}
      </div>

      <BotonGrande icono="📲" onClick={informeProveedora} className="bg-green-600 active:bg-green-700">
        Enviar informe a la proveedora
      </BotonGrande>
      <p className="text-base text-emara/70">
        El informe lleva los precios de ticket, la comisión y los cheques. Nunca el precio al que tú vendiste.
      </p>
    </>
  )
}
