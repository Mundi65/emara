import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { Cargando, Dinero, FotoJoya, Opciones, Vacio } from '../../components/ui'
import type { Categoria } from '../../lib/tipos'

type JoyaCatalogo = {
  id: string
  codigo: string
  categoria_id: string | null
  foto_joya_path: string | null
  foto_catalogo_path: string | null
  precio_venta_sugerido: number | null
  lotes: { proveedoras: { nombre: string; es_propio: boolean } | null } | null
}

type Vista = 'existencias' | 'clientas'

/**
 * Catálogo de todas las joyas disponibles (de todas las proveedoras y "Mis joyas").
 * - "Mis existencias": para Aida. Usa la foto sin ticket si existe; si no, la de recibir.
 * - "Para clientas": solo joyas con foto SIN ticket (la otra muestra el costo, CLAUDE.md regla 1).
 */
export default function Catalogo() {
  const [joyas, setJoyas] = useState<JoyaCatalogo[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filtro, setFiltro] = useState('todas')
  const [vista, setVista] = useState<Vista>('existencias')

  useEffect(() => {
    supabase
      .from('joyas')
      .select('id, codigo, categoria_id, foto_joya_path, foto_catalogo_path, precio_venta_sugerido, lotes(proveedoras(nombre, es_propio))')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .then(({ data }) => setJoyas((data as unknown as JoyaCatalogo[]) ?? []))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
  }, [])

  const deCategoria = useMemo(
    () => (joyas ?? []).filter((j) => filtro === 'todas' || j.categoria_id === filtro),
    [joyas, filtro],
  )
  const lista = vista === 'clientas' ? deCategoria.filter((j) => j.foto_catalogo_path) : deCategoria
  const sinFotoClientas = deCategoria.filter((j) => !j.foto_catalogo_path).length

  return (
    <Pantalla titulo="🖼️ Catálogo" volver="/">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm">
        {(
          [
            { v: 'existencias', t: 'Mis existencias' },
            { v: 'clientas', t: 'Para clientas' },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setVista(o.v)}
            className={`min-h-14 rounded-xl text-lg font-semibold ${vista === o.v ? 'bg-emara text-white' : 'text-emara'}`}
          >
            {o.t}
          </button>
        ))}
      </div>

      <Opciones
        opciones={[{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, texto: c.nombre }))]}
        valor={filtro}
        onCambio={setFiltro}
      />

      {joyas && (
        <p className="text-lg text-emara/80">
          {lista.length} {lista.length === 1 ? 'joya' : 'joyas'}
          {vista === 'existencias' ? ' disponibles' : ' para mostrar'}
        </p>
      )}

      {!joyas ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio>
          {vista === 'clientas' && sinFotoClientas > 0
            ? 'Ninguna tiene todavía su foto sin ticket.'
            : 'No hay joyas disponibles aquí.'}
        </Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lista.map((j) =>
            vista === 'clientas' ? (
              <div key={j.id} className="rounded-2xl bg-white p-2 shadow-sm">
                <FotoJoya ruta={j.foto_catalogo_path} />
                <p className="mt-1 text-center font-titulo text-2xl font-semibold text-emara">
                  {j.precio_venta_sugerido ? <Dinero valor={j.precio_venta_sugerido} /> : 'Consultar'}
                </p>
              </div>
            ) : (
              <Link key={j.id} to={`/joyas/${j.id}`} className="rounded-2xl bg-white p-2 shadow-sm">
                <FotoJoya ruta={j.foto_catalogo_path ?? j.foto_joya_path} codigo={j.codigo} />
                <p className="text-center font-titulo text-2xl font-semibold text-emara">
                  {j.precio_venta_sugerido ? <Dinero valor={j.precio_venta_sugerido} /> : '—'}
                </p>
                <p className="truncate text-center text-sm text-emara/60">
                  {j.lotes?.proveedoras?.es_propio ? 'Mis joyas' : j.lotes?.proveedoras?.nombre}
                </p>
                {!j.foto_catalogo_path && (
                  <p className="text-center text-sm font-semibold text-amber-700">Falta foto para clientas</p>
                )}
              </Link>
            ),
          )}
        </div>
      )}

      {vista === 'clientas' && sinFotoClientas > 0 && (
        <button
          type="button"
          onClick={() => setVista('existencias')}
          className="min-h-14 rounded-2xl bg-amber-50 px-4 text-lg font-semibold text-amber-900"
        >
          {sinFotoClientas} {sinFotoClientas === 1 ? 'joya no sale' : 'joyas no salen'} aquí porque les falta la foto sin
          ticket. Toca para verlas ›
        </button>
      )}
      {vista === 'existencias' && (
        <p className="text-base text-emara/70">
          Toca una joya para ver su ficha y tomarle la foto para clientas. Antes de enseñarle el catálogo a una clienta,
          cambia a "Para clientas".
        </p>
      )}
    </Pantalla>
  )
}
