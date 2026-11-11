import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { Cargando, Dinero, FotoJoya, Opciones, Vacio } from '../../components/ui'
import type { Categoria } from '../../lib/tipos'

type JoyaCatalogo = { id: string; categoria_id: string | null; codigo_ticket: string | null; foto_joya_path: string | null; precio_venta_sugerido: number | null }

/**
 * Catálogo para mostrar a las clientas: foto y precio de venta.
 * Nunca pide ni muestra el precio de costo (CLAUDE.md regla 1).
 */
export default function Catalogo() {
  const [joyas, setJoyas] = useState<JoyaCatalogo[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    supabase
      .from('joyas')
      .select('id, categoria_id, codigo_ticket, foto_joya_path, precio_venta_sugerido')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .then(({ data }) => setJoyas((data as JoyaCatalogo[]) ?? []))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
  }, [])

  const lista = useMemo(() => (joyas ?? []).filter((j) => filtro === 'todas' || j.categoria_id === filtro), [joyas, filtro])

  return (
    <Pantalla titulo="🖼️ Catálogo" volver="/">
      <Opciones
        opciones={[{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, texto: c.nombre }))]}
        valor={filtro}
        onCambio={setFiltro}
      />
      {!joyas ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio>No hay joyas disponibles aquí.</Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lista.map((j) => (
            <div key={j.id} className="rounded-2xl bg-white p-2 shadow-sm">
              <FotoJoya ruta={j.foto_joya_path} codigo={j.codigo_ticket} />
              <p className="mt-1 text-center text-xl font-bold text-emara">
                {j.precio_venta_sugerido ? <Dinero valor={j.precio_venta_sugerido} /> : 'Consultar'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Pantalla>
  )
}
