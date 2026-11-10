import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { Aviso, Campo, Cargando, Interruptor, Opciones, Tarjeta, mensajeError } from '../../components/ui'
import type { Clienta } from '../../lib/tipos'

const vacia: Clienta = {
  id: '',
  nombre: '',
  telefono_whatsapp: null,
  direccion: null,
  notas: null,
  dia_pago: null,
  enviar_saldo: false,
}

/** Crear o editar los datos de una clienta (día de pago y "enviar saldo" incluidos). */
export default function EditarClienta() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nueva = !id
  const navegar = useNavigate()
  const [c, setC] = useState<Clienta | null>(nueva ? vacia : null)
  const [otroDia, setOtroDia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (nueva) return
    supabase
      .from('clientas')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data }) => {
        setC(data as Clienta)
        if (data?.dia_pago && ![5, 15, 30].includes(data.dia_pago)) setOtroDia(String(data.dia_pago))
      })
  }, [id, nueva])

  if (!c) return <Pantalla titulo="Clienta"><Cargando /></Pantalla>

  const opcionDia = c.dia_pago === null ? 0 : [5, 15, 30].includes(c.dia_pago) ? c.dia_pago : -1

  async function guardar() {
    if (!c) return
    setError(null)
    if (!c.nombre.trim()) return setError('Escribe el nombre de la clienta.')
    let dia = c.dia_pago
    if (opcionDia === -1) {
      const n = Number(otroDia)
      if (!Number.isInteger(n) || n < 1 || n > 31) return setError('El día de pago debe ser un número del 1 al 31.')
      dia = n
    }
    setGuardando(true)
    const datos = {
      nombre: c.nombre.trim(),
      telefono_whatsapp: c.telefono_whatsapp?.trim() || null,
      direccion: c.direccion?.trim() || null,
      notas: c.notas?.trim() || null,
      dia_pago: dia,
      enviar_saldo: c.enviar_saldo,
    }
    const { data, error } = nueva
      ? await supabase.from('clientas').insert(datos).select('id').single()
      : await supabase.from('clientas').update(datos).eq('id', c.id).select('id').single()
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    const volverA = params.get('volver')
    navegar(volverA ? volverA.replace(':id', data!.id) : `/clientas/${data!.id}`, { replace: true })
  }

  return (
    <Pantalla titulo={nueva ? 'Nueva clienta' : `Editar ${c.nombre}`}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Campo etiqueta="Nombre" value={c.nombre} autoFocus={nueva} onChange={(e) => setC({ ...c, nombre: e.target.value })} />
      <Campo
        etiqueta="WhatsApp"
        inputMode="tel"
        placeholder="0991234567"
        value={c.telefono_whatsapp ?? ''}
        onChange={(e) => setC({ ...c, telefono_whatsapp: e.target.value })}
      />
      <Opciones
        etiqueta="¿Cuándo quedó en abonar?"
        opciones={[
          { valor: 5, texto: 'Inicio de mes' },
          { valor: 15, texto: 'Mediados' },
          { valor: 30, texto: 'Fin de mes' },
          { valor: -1, texto: 'Otro día' },
          { valor: 0, texto: 'Sin día' },
        ]}
        valor={opcionDia}
        onCambio={(v) => setC({ ...c, dia_pago: v === 0 ? null : v === -1 ? Number(otroDia) || 1 : v })}
      />
      {opcionDia === -1 && (
        <Campo etiqueta="Día del mes (1 a 31)" inputMode="numeric" value={otroDia} onChange={(e) => setOtroDia(e.target.value)} />
      )}
      <Interruptor
        etiqueta="Enviar saldo en el comprobante"
        ayuda="Si está apagado, el comprobante de WhatsApp solo dice cuánto abonó, no cuánto debe."
        valor={c.enviar_saldo}
        onCambio={(v) => setC({ ...c, enviar_saldo: v })}
      />
      <Tarjeta className="flex flex-col gap-4">
        <Campo etiqueta="Dirección (opcional)" value={c.direccion ?? ''} onChange={(e) => setC({ ...c, direccion: e.target.value })} />
        <Campo etiqueta="Notas (opcional)" value={c.notas ?? ''} onChange={(e) => setC({ ...c, notas: e.target.value })} />
      </Tarjeta>
      <BotonGrande onClick={guardar} disabled={guardando} className="justify-center">
        {guardando ? 'Guardando…' : 'Guardar'}
      </BotonGrande>
    </Pantalla>
  )
}
