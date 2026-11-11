import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { subirFoto } from '../../lib/fotos'
import { formatoDinero, formatoFecha } from '../../lib/formato'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande, EnlaceGrande } from '../../components/BotonGrande'
import { Aviso, Campo, CampoDinero, Cargando, EnlaceFila, Interruptor, Opciones, Tarjeta, mensajeError } from '../../components/ui'
import { COLUMNAS_AJUSTES, type Categoria, type Lote } from '../../lib/tipos'

type LoteConProv = Lote & { proveedoras: { nombre: string; es_propio: boolean } }

const GENEROS = [
  { valor: 'mujer', texto: 'Mujer' },
  { valor: 'hombre', texto: 'Hombre' },
  { valor: 'unisex', texto: 'Unisex' },
  { valor: 'nino', texto: 'Niño/a' },
] as const

type Genero = (typeof GENEROS)[number]['valor']

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

/** Pantalla para elegir el lote cuando se entra sin uno. */
function ElegirLote() {
  const [lotes, setLotes] = useState<LoteConProv[] | null>(null)
  useEffect(() => {
    supabase
      .from('lotes')
      .select('*, proveedoras(nombre, es_propio)')
      .neq('estado', 'cerrado')
      .order('fecha_recepcion', { ascending: false })
      .then(({ data }) => setLotes((data as LoteConProv[]) ?? []))
  }, [])
  return (
    <Pantalla titulo="📦 Recibir joyas" volver="/">
      <p className="text-lg text-emara/80">¿En qué lote vas a guardar las joyas?</p>
      {!lotes ? (
        <Cargando />
      ) : (
        lotes.map((l) => (
          <EnlaceFila key={l.id} to={`/recibir?lote=${l.id}`}>
            <span className="block text-xl font-semibold">{l.nombre}</span>
            <span className="block text-base text-emara/70">
              {l.proveedoras.nombre} · {formatoFecha(l.fecha_recepcion)}
            </span>
          </EnlaceFila>
        ))
      )}
      <EnlaceGrande to="/lotes/nuevo" icono="➕">
        Lote nuevo
      </EnlaceGrande>
    </Pantalla>
  )
}

export default function Recibir() {
  const [params] = useSearchParams()
  const loteId = params.get('lote')
  if (!loteId) return <ElegirLote />
  return <RecibirEnLote key={loteId} loteId={loteId} />
}

function RecibirEnLote({ loteId }: { loteId: string }) {
  const [lote, setLote] = useState<LoteConProv | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [prefijos, setPrefijos] = useState<{ prefijo: string; categoria_id: string }[]>([])
  const [margen, setMargen] = useState(100)
  const [contador, setContador] = useState(0)

  // formulario
  const [foto, setFoto] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [fotoCat, setFotoCat] = useState<File | null>(null)
  const [vistaCat, setVistaCat] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [tipoCosto, setTipoCosto] = useState<'precio' | 'peso'>('precio')
  const [costo, setCosto] = useState<number | null>(null)
  const [gramos, setGramos] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [genero, setGenero] = useState<Genero | null>('mujer')
  const [precioVenta, setPrecioVenta] = useState<number | null>(null)
  const [ventaEditada, setVentaEditada] = useState(false)
  const [esJuego, setEsJuego] = useState(false)
  const [componentes, setComponentes] = useState('')
  const [manuscrito, setManuscrito] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarBajo, setConfirmarBajo] = useState(false)
  const [confirmarRepetido, setConfirmarRepetido] = useState(false)
  const [guardada, setGuardada] = useState<{ casilla: string; codigo: string; codigoApp: string } | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)
  const inputCat = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('lotes')
      .select('*, proveedoras(nombre, es_propio)')
      .eq('id', loteId)
      .single()
      .then(({ data }) => setLote(data as LoteConProv))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
    supabase.from('prefijos').select('prefijo, categoria_id').then(({ data }) => setPrefijos(data ?? []))
    supabase
      .from('ajustes')
      .select(COLUMNAS_AJUSTES)
      .single()
      .then(({ data }) => data && setMargen(Number(data.margen_por_defecto)))
    supabase
      .from('joyas')
      .select('id', { count: 'exact', head: true })
      .eq('lote_id', loteId)
      .then(({ count }) => setContador(count ?? 0))
  }, [loteId])

  // costo por gramos
  useEffect(() => {
    if (tipoCosto !== 'peso' || !lote?.precio_gramo) return
    const g = Number(gramos.replace(',', '.'))
    if (g > 0) setCosto(redondear(g * Number(lote.precio_gramo)))
  }, [gramos, tipoCosto, lote])

  // precio de venta sugerido = costo + margen (editable)
  useEffect(() => {
    if (!ventaEditada && costo) setPrecioVenta(redondear(costo * (1 + margen / 100)))
  }, [costo, margen, ventaEditada])

  // el prefijo del código sugiere la categoría
  useEffect(() => {
    if (categoriaId || !codigo) return
    const c = codigo.toUpperCase()
    const encontrado = [...prefijos].sort((a, b) => b.prefijo.length - a.prefijo.length).find((p) => c.startsWith(p.prefijo))
    if (encontrado) setCategoriaId(encontrado.categoria_id)
    if (c.includes('+')) {
      setEsJuego(true)
      setComponentes((x) => x || codigo)
    }
  }, [codigo, prefijos, categoriaId])

  function elegirFoto(archivo: File | null) {
    setFoto(archivo)
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
    setVistaPrevia(archivo ? URL.createObjectURL(archivo) : null)
  }

  function elegirFotoCat(archivo: File | null) {
    setFotoCat(archivo)
    if (vistaCat) URL.revokeObjectURL(vistaCat)
    setVistaCat(archivo ? URL.createObjectURL(archivo) : null)
  }

  function limpiar() {
    elegirFoto(null)
    elegirFotoCat(null)
    setCodigo('')
    setTipoCosto('precio')
    setCosto(null)
    setGramos('')
    setCategoriaId(null)
    setPrecioVenta(null)
    setVentaEditada(false)
    setEsJuego(false)
    setComponentes('')
    setManuscrito(false)
    setConfirmarBajo(false)
    setConfirmarRepetido(false)
    setError(null)
    setGuardada(null)
  }

  async function guardar() {
    setError(null)
    if (costo !== null && costo < 50 && !confirmarBajo) {
      setConfirmarBajo(true)
      return
    }
    setGuardando(true)
    try {
      if (codigo.trim()) {
        const { count } = await supabase
          .from('joyas')
          .select('id', { count: 'exact', head: true })
          .eq('lote_id', loteId)
          .eq('codigo_ticket', codigo.trim())
        if (count && !confirmarRepetido) {
          setGuardando(false)
          setError(`Ya hay una joya con el código ${codigo.trim()} en este lote (¿foto repetida?). Si es otra joya, vuelve a tocar Guardar.`)
          setConfirmarRepetido(true)
          return
        }
      }
      const id = crypto.randomUUID()
      let ruta: string | null = null
      if (foto) ruta = await subirFoto(`${loteId}/${id}_joya.jpg`, foto)
      let rutaCat: string | null = null
      if (fotoCat) rutaCat = await subirFoto(`${loteId}/${id}_catalogo.jpg`, fotoCat)
      const g = Number(gramos.replace(',', '.'))
      const { data, error } = await supabase
        .from('joyas')
        .insert({
          id,
          lote_id: loteId,
          categoria_id: categoriaId,
          genero,
          codigo_ticket: codigo.trim() || null,
          tipo_costo: tipoCosto,
          precio_costo: costo,
          peso_gramos: tipoCosto === 'peso' && g > 0 ? g : null,
          es_juego: esJuego,
          componentes: esJuego ? componentes.trim() || null : null,
          ticket_manuscrito: manuscrito,
          precio_venta_sugerido: precioVenta,
          foto_joya_path: ruta,
          foto_catalogo_path: rutaCat,
        })
        .select('casilla, codigo')
        .single()
      if (error) throw error
      setContador((n) => n + 1)
      setGuardada({ casilla: data.casilla, codigo: codigo.trim(), codigoApp: data.codigo })
    } catch (e) {
      setError(mensajeError(e))
    }
    setGuardando(false)
  }

  if (!lote) return <Pantalla titulo="📦 Recibir joyas" volver="/recibir"><Cargando /></Pantalla>

  if (guardada) {
    return (
      <Pantalla titulo="✓ Joya guardada" volver={`/lotes/${loteId}`}>
        <Tarjeta className="py-8 text-center">
          <p className="text-xl">Guarda este ticket{guardada.codigo ? ` (${guardada.codigo})` : ''} en la</p>
          <p className="mt-2 text-2xl font-semibold text-emara">CASILLA</p>
          <p className="text-7xl font-black tracking-wider text-emara">{guardada.casilla}</p>
          <p className="mt-4 text-lg text-emara/70">Código de la joya en Emara: <strong>{guardada.codigoApp}</strong></p>
        </Tarjeta>
        <p className="text-center text-xl">Llevas {contador} joyas en este lote</p>
        <BotonGrande icono="📸" onClick={limpiar} className="min-h-20 text-2xl">
          Siguiente joya
        </BotonGrande>
        <Link to={`/lotes/${loteId}`} className="text-center text-lg font-semibold text-emara underline">
          Terminé por ahora
        </Link>
      </Pantalla>
    )
  }

  const sinCosto = costo === null
  return (
    <Pantalla titulo="📸 Recibir joya" volver={`/lotes/${loteId}`}>
      <p className="-mt-4 text-lg text-emara/70">
        {lote.nombre} · {lote.proveedoras.nombre} · llevas {contador}
      </p>

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
      />
      {vistaPrevia ? (
        <button type="button" onClick={() => inputFoto.current?.click()} className="overflow-hidden rounded-2xl">
          <img src={vistaPrevia} alt="Foto de la joya" className="max-h-80 w-full object-contain bg-white" />
          <span className="block py-2 text-base text-emara/70">Toca la foto para tomarla de nuevo</span>
        </button>
      ) : (
        <BotonGrande icono="📷" onClick={() => inputFoto.current?.click()} className="min-h-24 text-2xl">
          Tomar foto de la joya con su ticket
        </BotonGrande>
      )}
      <p className="text-base text-emara/70">Una joya por foto, fondo claro, el ticket de frente y bien visible.</p>

      <input
        ref={inputCat}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => elegirFotoCat(e.target.files?.[0] ?? null)}
      />
      {vistaCat ? (
        <button type="button" onClick={() => inputCat.current?.click()} className="overflow-hidden rounded-2xl">
          <img src={vistaCat} alt="Foto para clientas" className="max-h-60 w-full object-contain bg-white" />
          <span className="block py-2 text-base text-emara/70">Foto para clientas · toca para tomarla de nuevo</span>
        </button>
      ) : (
        <BotonGrande variante="secundario" icono="✨" onClick={() => inputCat.current?.click()}>
          Foto para clientas (joya sola, sin ticket)
        </BotonGrande>
      )}
      <p className="text-base text-emara/70">
        Es la única foto que sale en el catálogo. Si no la tomas ahora, puedes tomarla después en la ficha de la joya.
      </p>

      <Campo
        etiqueta="Código del ticket (si tiene)"
        ayuda="Si el ticket no trae código, déjalo vacío: la app le pone uno propio."
        value={codigo}
        autoCapitalize="characters"
        onChange={(e) => {
          setCodigo(e.target.value)
          setConfirmarRepetido(false)
        }}
      />

      <Opciones
        etiqueta="El ticket trae"
        opciones={[
          { valor: 'precio', texto: 'Precio' },
          { valor: 'peso', texto: 'Gramos' },
        ]}
        valor={tipoCosto}
        onCambio={setTipoCosto}
      />
      {tipoCosto === 'peso' && (
        <Campo
          etiqueta="Gramos"
          inputMode="decimal"
          value={gramos}
          onChange={(e) => setGramos(e.target.value)}
          ayuda={
            lote.precio_gramo
              ? `Precio por gramo del lote: ${formatoDinero(lote.precio_gramo)}`
              : 'Este lote no tiene precio por gramo: escribe el costo abajo.'
          }
        />
      )}
      <CampoDinero
        etiqueta={lote.proveedoras.es_propio ? 'Lo que pagaste' : 'Precio del ticket (costo)'}
        valor={costo}
        onCambio={(n) => {
          setCosto(n)
          setConfirmarBajo(false)
        }}
        amarillo={sinCosto || manuscrito}
      />
      {confirmarBajo && costo !== null && costo < 50 && (
        <Aviso tipo="info">
          ¿Seguro que el costo es {formatoDinero(costo)}? Recuerda: en el ticket, $1.110 es mil ciento diez. Si está bien,
          toca Guardar otra vez.
        </Aviso>
      )}

      <Opciones
        etiqueta="Tipo de joya"
        opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
        valor={categoriaId}
        onCambio={setCategoriaId}
      />
      <Opciones etiqueta="Para" opciones={[...GENEROS]} valor={genero} onCambio={setGenero} />

      <CampoDinero
        etiqueta="Precio de venta sugerido"
        ayuda={`Costo + ${margen} %. Puedes cambiarlo.`}
        valor={precioVenta}
        onCambio={(n) => {
          setPrecioVenta(n)
          setVentaEditada(true)
        }}
      />

      <Interruptor etiqueta="Es un juego (varias piezas, un ticket)" valor={esJuego} onCambio={setEsJuego} />
      {esJuego && (
        <Campo
          etiqueta="¿Qué piezas trae?"
          placeholder="Cadena CAD0028 + Dije DIJE000016"
          value={componentes}
          onChange={(e) => setComponentes(e.target.value)}
        />
      )}
      <Interruptor etiqueta="El ticket está escrito a mano" valor={manuscrito} onCambio={setManuscrito} />

      {error && <Aviso tipo="error">{error}</Aviso>}
      <BotonGrande onClick={guardar} disabled={guardando} className="min-h-20 justify-center text-2xl">
        {guardando ? 'Guardando…' : 'Guardar joya'}
      </BotonGrande>
    </Pantalla>
  )
}
