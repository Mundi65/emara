import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { Aviso, CampoDinero, Cargando, Dinero, Fila, Opciones, Tarjeta, mensajeError } from '../../components/ui'
import { ListaClientas } from '../clientas/Clientas'
import { formatoDinero, formatoFecha } from '../../lib/formato'
import { abrirWhatsApp } from '../../lib/whatsapp'
import { COLUMNAS_AJUSTES, type Ajustes, type Clienta } from '../../lib/tipos'

export function ElegirClientaCobrar() {
  return (
    <Pantalla titulo="💵 Cobrar abono" volver="/">
      <p className="text-lg text-emara/80">¿Quién te abona?</p>
      <ListaClientas soloConSaldo destino={(id) => `/cobrar/${id}`} />
    </Pantalla>
  )
}

type Metodo = 'efectivo' | 'transferencia' | 'otro'

type Hecho = { abonoId: string; monto: number; metodo: Metodo; saldoAntes: number; saldoDespues: number; fecha: Date }

export default function Cobrar() {
  const { id } = useParams()
  const [c, setC] = useState<Clienta | null>(null)
  const [saldo, setSaldo] = useState<number | null>(null)
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [monto, setMonto] = useState<number | null>(null)
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [hecho, setHecho] = useState<Hecho | null>(null)

  useEffect(() => {
    supabase.from('clientas').select('*').eq('id', id!).single().then(({ data }) => setC(data as Clienta))
    supabase
      .from('v_saldos_clientas')
      .select('saldo')
      .eq('clienta_id', id!)
      .single()
      .then(({ data }) => setSaldo(Number(data?.saldo ?? 0)))
    supabase.from('ajustes').select(COLUMNAS_AJUSTES).single().then(({ data }) => setAjustes(data as Ajustes))
  }, [id])

  async function guardar() {
    setError(null)
    if (!monto || monto <= 0) return setError('Escribe cuánto abonó.')
    if (saldo !== null && monto > saldo) return setError(`El abono es mayor a lo que debe (${formatoDinero(saldo)}).`)
    setGuardando(true)
    const { data, error } = await supabase
      .from('abonos')
      .insert({ clienta_id: id, monto, metodo })
      .select('id, fecha')
      .single()
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    setHecho({
      abonoId: data.id,
      monto,
      metodo,
      saldoAntes: saldo ?? 0,
      saldoDespues: (saldo ?? 0) - monto,
      fecha: new Date(data.fecha),
    })
  }

  function mensaje(conSaldo: boolean) {
    if (!hecho || !c) return ''
    const lineas = [
      `*${ajustes?.nombre_negocio ?? 'Emara'}*`,
      '🧾 Comprobante de abono',
      '',
      `Clienta: ${c.nombre}`,
      `Fecha: ${formatoFecha(hecho.fecha)}`,
      `*Abono: ${formatoDinero(hecho.monto)}*${hecho.metodo !== 'efectivo' ? ` (${hecho.metodo})` : ''}`,
    ]
    if (conSaldo) {
      lineas.push(`Saldo anterior: ${formatoDinero(hecho.saldoAntes)}`, `*Saldo pendiente: ${formatoDinero(hecho.saldoDespues)}*`)
    }
    if (ajustes?.texto_comprobante) lineas.push('', ajustes.texto_comprobante)
    return lineas.join('\n')
  }

  async function enviarClienta() {
    if (!c || !hecho) return
    abrirWhatsApp(c.telefono_whatsapp, mensaje(c.enviar_saldo))
    await supabase.from('abonos').update({ enviado_clienta: true }).eq('id', hecho.abonoId)
  }

  if (!c || saldo === null) return <Pantalla titulo="💵 Cobrar abono" volver="/cobrar"><Cargando /></Pantalla>

  if (hecho) {
    return (
      <Pantalla titulo="✓ Abono guardado" volver={`/clientas/${c.id}`}>
        <Tarjeta>
          <p className="text-center text-lg text-emara/70">{ajustes?.nombre_negocio}</p>
          <p className="mb-2 text-center text-xl font-bold">Comprobante de abono</p>
          <Fila etiqueta="Clienta" valor={c.nombre} />
          <Fila etiqueta="Fecha" valor={formatoFecha(hecho.fecha)} />
          <Fila fuerte etiqueta="Abono" valor={<Dinero valor={hecho.monto} />} />
          <Fila etiqueta="Saldo anterior" valor={<Dinero valor={hecho.saldoAntes} />} />
          <Fila fuerte etiqueta="Saldo nuevo" valor={<Dinero valor={hecho.saldoDespues} />} />
        </Tarjeta>
        <p className="text-base text-emara/70">
          {c.enviar_saldo
            ? 'A la clienta le llega el abono y su saldo.'
            : 'A la clienta le llega solo el abono (sin saldo). Puedes cambiarlo en su ficha.'}
        </p>
        <BotonGrande icono="📲" onClick={enviarClienta} className="bg-green-600 active:bg-green-700">
          Enviar a la clienta
        </BotonGrande>
        <BotonGrande variante="secundario" icono="📩" onClick={() => abrirWhatsApp(ajustes?.telefono_duena, mensaje(true))}>
          Enviarme copia
        </BotonGrande>
        <Link to={`/clientas/${c.id}`} className="min-h-14 py-3 text-center text-lg font-semibold text-emara underline">
          Listo
        </Link>
      </Pantalla>
    )
  }

  return (
    <Pantalla titulo={`💵 Abono de ${c.nombre}`} volver="/cobrar">
      <Tarjeta className="text-center">
        <p className="text-lg text-emara/80">Te debe</p>
        <p className="text-4xl font-black text-emara"><Dinero valor={saldo} /></p>
      </Tarjeta>
      {saldo <= 0 ? (
        <Aviso tipo="info">Esta clienta no tiene saldo pendiente.</Aviso>
      ) : (
        <>
          <CampoDinero etiqueta="¿Cuánto abonó?" valor={monto} onCambio={setMonto} autoFocus />
          <Opciones
            etiqueta="¿Cómo pagó?"
            opciones={[
              { valor: 'efectivo', texto: 'Efectivo' },
              { valor: 'transferencia', texto: 'Transferencia' },
              { valor: 'otro', texto: 'Otro' },
            ]}
            valor={metodo}
            onCambio={setMetodo}
          />
          {monto !== null && monto > 0 && monto <= saldo && (
            <p className="text-center text-lg">
              Le quedará debiendo <strong><Dinero valor={saldo - monto} /></strong>
            </p>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
          <BotonGrande onClick={guardar} disabled={guardando} className="min-h-20 justify-center text-2xl">
            {guardando ? 'Guardando…' : 'Guardar abono'}
          </BotonGrande>
        </>
      )}
    </Pantalla>
  )
}
