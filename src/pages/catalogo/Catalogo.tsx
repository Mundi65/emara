import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { Cargando, Dinero, FotoJoya, Opciones, Vacio } from '../../components/ui'
import type { Categoria } from '../../lib/tipos'

type JoyaCatalogo = {
  id: string
  categoria_id: string | null
  codigo_ticket: string | null
  foto_catalogo_path: string | null
  precio_venta_sugerido: number | null
}

/**
 * Catálogo para mostrar a las clientas: foto SIN ticket y precio de venta.
 * Nunca usa la foto con ticket ni el precio de costo (CLAUDE.md regla 1).
 */
export default function Catalogo() {
  const [joyas, setJoyas] = useState<JoyaCatalogo[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filtro, setFiltro] = useState('todas')
  const [verFaltan, setVerFaltan] = useState(false)

  useEffect(() => {
    supabase
      .from('joyas')
      .select('id, categoria_id, codigo_ticket, foto_catalogo_path, precio_venta_sugerido')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .then(({ data }) => setJoyas((data as JoyaCatalogo[]) ?? []))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
  }, [])

  const conFoto = useMemo(
    () => (joyas ?? []).filter((j) => j.foto_catalogo_path && (filtro === 'todas' || j.categoria_id === filtro)),
    [joyas, filtro],
  )
  const faltan = (joyas ?? []).filter((j) => !j.foto_catalogo_path)

  if (verFaltan) {
    return (
      <Pantalla titulo="Faltan fotos para clientas" volver="/catalogo">
        <p className="text-lg text-emara/80">
          Toca una joya y toma su foto sin ticket. Cuando la tenga, aparece sola en el catálogo.
        </p>
        <button type="button" onClick={() => setVerFaltan(false)} className="self-start text-lg font-semibold text-emara underline">
          ← Volver al catálogo
        </button>
        {faltan.map((j) => (
          <Link
            key={j.id}
            to={`/joyas/${j.id}`}
            className="flex min-h-16 items-center justify-between rounded-2xl bg-white p-4 text-lg shadow-sm"
          >
            <span>{j.codigo_ticket ?? 'Sin código'}</span>
            <span className="font-semibold text-emara">Tomar foto ›</span>
          </Link>
        ))}
      </Pantalla>
    )
  }

  return (
    <Pantalla titulo="🖼️ Catálogo" volver="/">
      <Opciones
        opciones={[{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, texto: c.nombre }))]}
        valor={filtro}
        onCambio={setFiltro}
      />
      {!joyas ? (
        <Cargando />
      ) : conFoto.length === 0 ? (
        <Vacio>Aún no hay joyas con foto para clientas aquí.</Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {conFoto.map((j) => (
            <div key={j.id} className="rounded-2xl bg-white p-2 shadow-sm">
              <FotoJoya ruta={j.foto_catalogo_path} />
              <p className="mt-1 text-center text-xl font-bold text-emara">
                {j.precio_venta_sugerido ? <Dinero valor={j.precio_venta_sugerido} /> : 'Consultar'}
              </p>
            </div>
          ))}
        </div>
      )}
      {faltan.length > 0 && (
        <button
          type="button"
          onClick={() => setVerFaltan(true)}
          className="min-h-14 rounded-2xl bg-amber-50 px-4 text-lg font-semibold text-amber-900"
        >
          {faltan.length} {faltan.length === 1 ? 'joya no sale' : 'joyas no salen'} porque les falta la foto sin ticket ›
        </button>
      )}
    </Pantalla>
  )
}
