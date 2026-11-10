import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { EnlaceGrande } from '../../components/BotonGrande'
import { Cargando, Dinero, Tarjeta, Vacio } from '../../components/ui'
import { formatoDinero, formatoFecha, textoDiaPago } from '../../lib/formato'
import { abrirWhatsApp } from '../../lib/whatsapp'
import type { Clienta, MovimientoTarjeta } from '../../lib/tipos'

/** La tarjeta de la clienta: cuenta corriente (compras suman, abonos restan). */
export default function FichaClienta() {
  const { id } = useParams()
  const [c, setC] = useState<Clienta | null>(null)
  const [movs, setMovs] = useState<MovimientoTarjeta[] | null>(null)
  const [negocio, setNegocio] = useState('')

  useEffect(() => {
    supabase.from('clientas').select('*').eq('id', id!).single().then(({ data }) => setC(data as Clienta))
    supabase
      .from('v_tarjeta_clienta')
      .select('*')
      .eq('clienta_id', id!)
      .order('fecha')
      .order('tipo', { ascending: false })
      .then(({ data }) => setMovs((data as MovimientoTarjeta[]) ?? []))
    supabase.from('ajustes').select('nombre_negocio').single().then(({ data }) => setNegocio(data?.nombre_negocio ?? ''))
  }, [id])

  if (!c || !movs) return <Pantalla titulo="Clienta"><Cargando /></Pantalla>

  const saldo = movs.length ? Number(movs[movs.length - 1].saldo_acumulado) : 0

  function enviarEstado() {
    if (!c) return
    const lineas = movs!
      .slice(-10)
      .map((m) =>
        m.tipo === 'compra'
          ? `${formatoFecha(m.fecha)} · Compra ${m.detalle ? `(${m.detalle}) ` : ''}+${formatoDinero(m.compro)}`
          : `${formatoFecha(m.fecha)} · Abono −${formatoDinero(m.abono)}`,
      )
    const msg = [
      `*${negocio}*`,
      `Estado de cuenta de ${c.nombre}`,
      '',
      ...lineas,
      '',
      `*Saldo pendiente: ${formatoDinero(saldo)}*`,
    ].join('\n')
    abrirWhatsApp(c.telefono_whatsapp, msg)
  }

  return (
    <Pantalla titulo={c.nombre} volver="/clientas">
      <Tarjeta className="text-center">
        <p className="text-xl text-emara/80">{saldo > 0 ? 'Te debe' : 'Está al día'}</p>
        <p className="text-5xl font-black text-emara">
          <Dinero valor={saldo} />
        </p>
        <p className="mt-2 text-base text-emara/70">
          {textoDiaPago(c.dia_pago)} · {c.enviar_saldo ? 'Se le envía el saldo' : 'No se le envía el saldo'}
        </p>
      </Tarjeta>

      <div className="grid grid-cols-2 gap-3">
        <EnlaceGrande to={`/cobrar/${c.id}`} icono="💵">Abono</EnlaceGrande>
        <EnlaceGrande to={`/vender?clienta=${c.id}`} icono="💍">Compra</EnlaceGrande>
      </div>

      <h2 className="mt-2 text-xl font-bold">Su tarjeta</h2>
      {movs.length === 0 ? (
        <Vacio>Todavía no tiene compras ni abonos.</Vacio>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-base">
            <thead className="bg-dorado/40 text-left">
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2 text-right">Compró</th>
                <th className="p-2 text-right">Abonó</th>
                <th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.movimiento_id} className="border-t border-emara/10">
                  <td className="p-2">
                    {formatoFecha(m.fecha)}
                    {m.detalle && m.tipo === 'compra' && <span className="block text-sm text-emara/60">{m.detalle}</span>}
                  </td>
                  <td className="p-2 text-right">{m.tipo === 'compra' && <Dinero valor={m.compro} />}</td>
                  <td className="p-2 text-right text-green-700">{m.tipo === 'abono' && <Dinero valor={m.abono} />}</td>
                  <td className="p-2 text-right font-semibold"><Dinero valor={m.saldo_acumulado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={enviarEstado}
        className="min-h-14 rounded-2xl border-2 border-green-600 bg-white text-lg font-semibold text-green-700"
      >
        📲 Enviar estado de cuenta por WhatsApp
      </button>
      <Link to={`/clientas/${c.id}/editar`} className="min-h-14 py-3 text-center text-lg font-semibold text-emara underline">
        ✏️ Editar datos, día de pago y "enviar saldo"
      </Link>
    </Pantalla>
  )
}
