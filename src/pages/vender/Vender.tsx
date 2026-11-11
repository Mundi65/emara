import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import {
  Aviso,
  Campo,
  CampoDinero,
  Cargando,
  Dinero,
  Fila,
  FotoJoya,
  Opciones,
  Tarjeta,
  Vacio,
  estiloCampo,
  mensajeError,
} from '../../components/ui'
import { formatoDinero, formatoFecha, textoPlazo } from '../../lib/formato'
import { abrirWhatsApp } from '../../lib/whatsapp'
import type { Categoria, Clienta, Joya, SaldoClienta } from '../../lib/tipos'

type Paso = 'joyas' | 'clienta' | 'precio' | 'listo'

const PLAZOS = [
  { valor: 0, texto: 'Contado' },
  { valor: 3, texto: '3 meses' },
  { valor: 6, texto: '6 meses' },
  { valor: 12, texto: '12 meses' },
  { valor: -1, texto: 'Otro' },
]

export default function Vender() {
  const [params] = useSearchParams()
  const [paso, setPaso] = useState<Paso>('joyas')
  const [joyas, setJoyas] = useState<Joya[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filtroCat, setFiltroCat] = useState<string>('todas')
  const [buscar, setBuscar] = useState('')
  const [elegidas, setElegidas] = useState<string[]>([])
  const [precios, setPrecios] = useState<Record<string, number | null>>({})

  const [clientas, setClientas] = useState<SaldoClienta[]>([])
  const [clientaId, setClientaId] = useState<string | null>(params.get('clienta'))
  const [clienta, setClienta] = useState<Clienta | null>(null)
  const [saldoAnterior, setSaldoAnterior] = useState(0)
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [nuevaTel, setNuevaTel] = useState('')

  const [plazoOpcion, setPlazoOpcion] = useState(0)
  const [plazoOtro, setPlazoOtro] = useState('')
  const [cuota, setCuota] = useState<number | null>(null)
  const [cuotaEditada, setCuotaEditada] = useState(false)
  const [abonoInicial, setAbonoInicial] = useState<number | null>(null)
  const [negocio, setNegocio] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('joyas')
      .select('*')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .then(({ data }) => setJoyas((data as Joya[]) ?? []))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
    supabase.from('v_saldos_clientas').select('*').order('nombre').then(({ data }) => setClientas((data as SaldoClienta[]) ?? []))
    supabase.from('ajustes').select('nombre_negocio').single().then(({ data }) => setNegocio(data?.nombre_negocio ?? ''))
  }, [])

  useEffect(() => {
    if (!clientaId) return setClienta(null)
    supabase.from('clientas').select('*').eq('id', clientaId).single().then(({ data }) => setClienta(data as Clienta))
    supabase
      .from('v_saldos_clientas')
      .select('saldo')
      .eq('clienta_id', clientaId)
      .single()
      .then(({ data }) => setSaldoAnterior(Number(data?.saldo ?? 0)))
  }, [clientaId])

  const lista = useMemo(() => {
    const b = buscar.trim().toLowerCase()
    return (joyas ?? []).filter(
      (j) =>
        (filtroCat === 'todas' || j.categoria_id === filtroCat) &&
        (!b || j.codigo.toLowerCase().includes(b) || (j.codigo_ticket ?? '').toLowerCase().includes(b)),
    )
  }, [joyas, filtroCat, buscar])

  const joyasElegidas = (joyas ?? []).filter((j) => elegidas.includes(j.id))
  const total = joyasElegidas.reduce((s, j) => s + (precios[j.id] ?? 0), 0)
  const plazo = plazoOpcion === -1 ? Number(plazoOtro) || 0 : plazoOpcion
  const deuda = Math.max(0, total - (abonoInicial ?? 0))

  // cuota sugerida = (compra − abono inicial) ÷ plazo; siempre editable
  useEffect(() => {
    if (cuotaEditada) return
    setCuota(plazo > 0 && deuda > 0 ? Math.round((deuda / plazo) * 100) / 100 : null)
  }, [plazo, deuda, cuotaEditada])

  function alternar(j: Joya) {
    setElegidas((xs) => (xs.includes(j.id) ? xs.filter((x) => x !== j.id) : [...xs, j.id]))
    setPrecios((p) => (j.id in p ? p : { ...p, [j.id]: j.precio_venta_sugerido }))
  }

  async function crearClienta() {
    setError(null)
    if (!nuevaNombre.trim()) return setError('Escribe el nombre de la clienta.')
    const { data, error } = await supabase
      .from('clientas')
      .insert({ nombre: nuevaNombre.trim(), telefono_whatsapp: nuevaTel.trim() || null })
      .select('id')
      .single()
    if (error) return setError(mensajeError(error))
    setClientaId(data.id)
    setPaso('precio')
  }

  async function guardar() {
    setError(null)
    if (!clientaId) return setError('Elige la clienta.')
    if (joyasElegidas.some((j) => !precios[j.id])) return setError('Escribe el precio de venta de cada joya.')
    if ((abonoInicial ?? 0) > total) return setError('El abono inicial no puede ser mayor que la compra.')
    if (plazoOpcion === -1 && !(plazo > 0)) return setError('Escribe el plazo en meses.')
    setGuardando(true)
    const { error } = await supabase.rpc('registrar_venta', {
      p_clienta_id: clientaId,
      p_items: joyasElegidas.map((j) => ({ joya_id: j.id, precio_venta: precios[j.id] })),
      p_plazo_meses: plazo,
      p_cuota_mensual: plazo > 0 ? cuota : null,
      p_abono_inicial: abonoInicial ?? 0,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    setPaso('listo')
  }

  function enviarComprobante() {
    if (!clienta) return
    const lineas = [
      `*${negocio}*`,
      '🛍️ Comprobante de compra',
      '',
      `Clienta: ${clienta.nombre}`,
      `Fecha: ${formatoFecha(new Date())}`,
      `${joyasElegidas.length} ${joyasElegidas.length === 1 ? 'joya' : 'joyas'}: *${formatoDinero(total)}*`,
      abonoInicial ? `Abono inicial: ${formatoDinero(abonoInicial)}` : '',
      plazo > 0 ? `Plazo: ${textoPlazo(plazo)}${cuota ? ` · cuota ${formatoDinero(cuota)}` : ''}` : '',
      clienta.enviar_saldo ? `*Saldo pendiente: ${formatoDinero(saldoAnterior + deuda)}*` : '',
      '',
      '¡Gracias por tu compra! 💍',
    ]
    abrirWhatsApp(clienta.telefono_whatsapp, lineas.filter((l, i, a) => l || a[i - 1]).join('\n'))
  }

  // ---------------- pantallas ----------------

  if (paso === 'listo') {
    return (
      <Pantalla titulo="✓ Venta guardada" volver="/">
        <Tarjeta>
          <Fila etiqueta="Saldo anterior" valor={<Dinero valor={saldoAnterior} />} />
          <Fila etiqueta="Esta compra" valor={<Dinero valor={total} />} />
          {abonoInicial ? <Fila etiqueta="Abono inicial" valor={<>−<Dinero valor={abonoInicial} /></>} /> : null}
          <Fila fuerte etiqueta="Nuevo saldo" valor={<Dinero valor={saldoAnterior + deuda} />} />
        </Tarjeta>
        <BotonGrande icono="📲" onClick={enviarComprobante} className="bg-green-600 active:bg-green-700">
          Enviar comprobante por WhatsApp
        </BotonGrande>
        <Link to={`/clientas/${clientaId}`} className="min-h-14 py-3 text-center text-lg font-semibold text-emara underline">
          Ver la tarjeta de {clienta?.nombre}
        </Link>
      </Pantalla>
    )
  }

  if (paso === 'clienta') {
    return (
      <Pantalla titulo="¿Para quién es?" volver="/">
        <BotonGrande variante="secundario" onClick={() => setPaso('joyas')}>← Cambiar joyas</BotonGrande>
        {clientas.map((c) => (
          <button
            key={c.clienta_id}
            type="button"
            onClick={() => {
              setClientaId(c.clienta_id)
              setPaso('precio')
            }}
            className="flex min-h-16 items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm active:bg-dorado/30"
          >
            <span className="text-xl font-semibold">{c.nombre}</span>
            {Number(c.saldo) > 0 && (
              <span className="text-base text-emara/70">debe <Dinero valor={c.saldo} /></span>
            )}
          </button>
        ))}
        <Tarjeta className="flex flex-col gap-3">
          <p className="text-xl font-bold">Clienta nueva</p>
          <Campo etiqueta="Nombre" value={nuevaNombre} onChange={(e) => setNuevaNombre(e.target.value)} />
          <Campo etiqueta="WhatsApp" inputMode="tel" value={nuevaTel} onChange={(e) => setNuevaTel(e.target.value)} />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <BotonGrande onClick={crearClienta} className="justify-center">Crear y seguir</BotonGrande>
        </Tarjeta>
      </Pantalla>
    )
  }

  if (paso === 'precio') {
    return (
      <Pantalla titulo={`Venta a ${clienta?.nombre ?? '…'}`} volver="/">
        <button type="button" onClick={() => setPaso('clienta')} className="self-start text-lg font-semibold text-emara underline">
          Cambiar clienta
        </button>
        {joyasElegidas.map((j) => (
          <Tarjeta key={j.id} className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <FotoJoya ruta={j.foto_catalogo_path ?? j.foto_joya_path} codigo={j.codigo} />
            </div>
            <div className="flex-1">
              <CampoDinero
                etiqueta="Precio de venta"
                valor={precios[j.id] ?? null}
                onCambio={(n) => setPrecios((p) => ({ ...p, [j.id]: n }))}
              />
            </div>
          </Tarjeta>
        ))}
        <Opciones etiqueta="Plazo para pagar" opciones={PLAZOS} valor={plazoOpcion} onCambio={setPlazoOpcion} />
        {plazoOpcion === -1 && (
          <Campo etiqueta="¿Cuántos meses?" inputMode="numeric" value={plazoOtro} onChange={(e) => setPlazoOtro(e.target.value)} />
        )}
        <CampoDinero etiqueta="Abono inicial (opcional)" valor={abonoInicial} onCambio={setAbonoInicial} />
        {plazo > 0 && (
          <CampoDinero
            etiqueta="Cuota mensual"
            ayuda="Sugerida: lo que queda ÷ plazo. Puedes cambiarla."
            valor={cuota}
            onCambio={(n) => {
              setCuota(n)
              setCuotaEditada(true)
            }}
          />
        )}
        <Tarjeta>
          <Fila etiqueta="Saldo anterior" valor={<Dinero valor={saldoAnterior} />} />
          <Fila etiqueta="+ Esta compra" valor={<Dinero valor={total} />} />
          {abonoInicial ? <Fila etiqueta="− Abono inicial" valor={<Dinero valor={abonoInicial} />} /> : null}
          <Fila fuerte etiqueta="Nuevo saldo" valor={<Dinero valor={saldoAnterior + deuda} />} />
        </Tarjeta>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <BotonGrande onClick={guardar} disabled={guardando} className="min-h-20 justify-center text-2xl">
          {guardando ? 'Guardando…' : 'Guardar venta'}
        </BotonGrande>
      </Pantalla>
    )
  }

  // paso 'joyas'
  return (
    <Pantalla titulo="💍 Vender" volver="/">
      <p className="text-lg text-emara/80">Toca las joyas que se lleva.</p>
      <input
        type="search"
        placeholder="🔍 Buscar por código"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        className={estiloCampo}
      />
      <Opciones
        opciones={[{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, texto: c.nombre }))]}
        valor={filtroCat}
        onCambio={setFiltroCat}
      />
      {!joyas ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio>No hay joyas disponibles aquí.</Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lista.map((j) => {
            const sel = elegidas.includes(j.id)
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => alternar(j)}
                className={`rounded-2xl bg-white p-2 text-left shadow-sm ${sel ? 'ring-4 ring-emara' : ''}`}
              >
                <FotoJoya ruta={j.foto_catalogo_path ?? j.foto_joya_path} codigo={j.codigo} />
                <p className="mt-1 text-center text-lg font-semibold">
                  {j.precio_venta_sugerido ? <Dinero valor={j.precio_venta_sugerido} /> : '—'}
                </p>
                {sel && <p className="text-center text-base font-bold text-emara">✓ Elegida</p>}
              </button>
            )
          })}
        </div>
      )}
      <div className="sticky bottom-4">
        <BotonGrande
          disabled={elegidas.length === 0}
          onClick={() => setPaso(clientaId ? 'precio' : 'clienta')}
          className="justify-center shadow-xl"
        >
          Siguiente ({elegidas.length})
        </BotonGrande>
      </div>
    </Pantalla>
  )
}
