import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { Cargando, Dinero, Tarjeta, Vacio } from '../../components/ui'
import { formatoDinero, formatoFecha, textoDiaPago } from '../../lib/formato'
import { abrirWhatsApp } from '../../lib/whatsapp'

type Atrasada = {
  clienta_id: string
  nombre: string
  telefono_whatsapp: string | null
  saldo: number
  dia_pago: number
  enviar_saldo: boolean
  ultimo_pago_esperado: string
  cuota_esperada: number
  abonado_en_periodo: number
  dias_atraso: number
  ultimo_abono: string | null
}

export default function Atrasadas() {
  const [filas, setFilas] = useState<Atrasada[] | null>(null)
  const [negocio, setNegocio] = useState('')

  useEffect(() => {
    supabase
      .from('v_clientas_atrasadas')
      .select('*')
      .order('dias_atraso', { ascending: false })
      .then(({ data }) => setFilas((data as Atrasada[]) ?? []))
    supabase.from('ajustes').select('nombre_negocio').single().then(({ data }) => setNegocio(data?.nombre_negocio ?? ''))
  }, [])

  function recordar(a: Atrasada) {
    const falta = Number(a.cuota_esperada) - Number(a.abonado_en_periodo)
    const msg = [
      `Hola ${a.nombre.split(' ')[0]} 😊`,
      `Te escribo de ${negocio} para recordarte con cariño tu abono de este mes${a.enviar_saldo ? ` (${formatoDinero(falta)})` : ''}.`,
      a.enviar_saldo ? `Tu saldo pendiente es ${formatoDinero(a.saldo)}.` : '',
      '¡Gracias!',
    ]
      .filter(Boolean)
      .join('\n')
    abrirWhatsApp(a.telefono_whatsapp, msg)
  }

  return (
    <Pantalla titulo="⏰ Clientas atrasadas" volver="/informes">
      <p className="text-base text-emara/70">
        Aparecen las clientas que ya pasaron su día de pago y no han abonado su cuota del mes. Solo cuentan las que tienen
        día de pago configurado.
      </p>
      {!filas ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Vacio>¡Nadie está atrasada!</Vacio>
      ) : (
        filas.map((a) => (
          <Tarjeta key={a.clienta_id} className="flex flex-col gap-2">
            <Link to={`/clientas/${a.clienta_id}`} className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold">{a.nombre}</span>
              <span className="text-lg font-bold text-red-700">
                {a.dias_atraso} {a.dias_atraso === 1 ? 'día' : 'días'}
              </span>
            </Link>
            <p className="text-base text-emara/70">
              {textoDiaPago(a.dia_pago)} · debía abonar el {formatoFecha(a.ultimo_pago_esperado)}
            </p>
            <p className="text-lg">
              Cuota <Dinero valor={a.cuota_esperada} /> · abonó <Dinero valor={a.abonado_en_periodo} /> · debe en total{' '}
              <strong><Dinero valor={a.saldo} /></strong>
            </p>
            <p className="text-base text-emara/70">
              Último abono: {a.ultimo_abono ? formatoFecha(a.ultimo_abono) : 'ninguno'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => recordar(a)}
                className="min-h-14 rounded-2xl bg-green-600 text-lg font-semibold text-white"
              >
                Recordar
              </button>
              <Link
                to={`/cobrar/${a.clienta_id}`}
                className="flex min-h-14 items-center justify-center rounded-2xl bg-emara text-lg font-semibold text-white"
              >
                Abono
              </Link>
            </div>
          </Tarjeta>
        ))
      )}
    </Pantalla>
  )
}
