import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { usePin } from '../../hooks/usePin'
import { Aviso, Campo, CampoDinero, Cargando, FotoJoya, Interruptor, Opciones, Tarjeta, mensajeError } from '../../components/ui'
import { subirFoto } from '../../lib/fotos'
import type { Categoria, Joya } from '../../lib/tipos'

const ESTADOS: Record<Joya['estado'], string> = {
  disponible: 'Disponible',
  vendida: 'Vendida',
  devuelta: 'Devuelta a la proveedora',
  perdida: 'Perdida',
}

/** Ver y corregir cualquier dato de una joya. El costo solo se ve en Modo dueña. */
export default function FichaJoya() {
  const { id } = useParams()
  const { modoDuena } = usePin()
  const [j, setJ] = useState<Joya | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoCat, setFotoCat] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.from('joyas').select('*').eq('id', id!).single().then(({ data }) => setJ(data as Joya))
    supabase.from('categorias').select('*').order('orden').then(({ data }) => setCategorias((data as Categoria[]) ?? []))
  }, [id])

  if (!j) return <Pantalla titulo="Joya" volver="/"><Cargando /></Pantalla>

  const cambiar = (c: Partial<Joya>) => {
    setOk(false)
    setJ({ ...j, ...c })
  }

  async function guardar() {
    if (!j) return
    setError(null)
    setGuardando(true)
    try {
      let ruta = j.foto_joya_path
      if (foto) ruta = await subirFoto(`${j.lote_id}/${j.id}_joya_${Date.now()}.jpg`, foto)
      let rutaCat = j.foto_catalogo_path
      if (fotoCat) rutaCat = await subirFoto(`${j.lote_id}/${j.id}_catalogo_${Date.now()}.jpg`, fotoCat)
      const datos: Partial<Joya> = {
        codigo_ticket: j.codigo_ticket?.trim() || null,
        categoria_id: j.categoria_id,
        genero: j.genero,
        precio_venta_sugerido: j.precio_venta_sugerido,
        es_juego: j.es_juego,
        componentes: j.componentes?.trim() || null,
        ticket_manuscrito: j.ticket_manuscrito,
        casilla: j.casilla?.trim() || null,
        notas: j.notas?.trim() || null,
        foto_joya_path: ruta,
        foto_catalogo_path: rutaCat,
      }
      if (modoDuena) Object.assign(datos, { precio_costo: j.precio_costo, peso_gramos: j.peso_gramos })
      const { error } = await supabase.from('joyas').update(datos).eq('id', j.id)
      if (error) throw error
      setFoto(null)
      setFotoCat(null)
      setJ({ ...j, foto_joya_path: ruta, foto_catalogo_path: rutaCat })
      setOk(true)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  async function marcarPerdida() {
    if (!j || !window.confirm('¿Marcar esta joya como perdida? Queda registrado y deja de aparecer para vender.')) return
    const { error } = await supabase.from('joyas').update({ estado: 'perdida' }).eq('id', j.id)
    if (error) return setError(mensajeError(error))
    setJ({ ...j, estado: 'perdida' })
  }

  return (
    <Pantalla titulo="Joya" volver={`/lotes/${j.lote_id}`}>
      <div className="mx-auto w-full max-w-xs">
        <FotoJoya ruta={j.foto_joya_path} codigo={j.codigo} tamano="lg" />
      </div>
      <p className="text-center text-xl">
        {ESTADOS[j.estado]}
        {j.casilla && <> · Casilla <strong>{j.casilla}</strong></>}
      </p>
      <Link to={`/lotes/${j.lote_id}`} className="text-center text-lg font-semibold text-emara underline">
        Ver su lote
      </Link>

      <label className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-emara bg-white text-lg font-semibold text-emara">
        📷 {foto ? 'Foto nueva lista (toca Guardar)' : 'Cambiar foto con ticket'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </label>

      <Tarjeta className="flex flex-col gap-3">
        <p className="text-lg font-bold">✨ Foto para clientas (sin ticket)</p>
        {j.foto_catalogo_path ? (
          <div className="mx-auto w-40">
            <FotoJoya ruta={j.foto_catalogo_path} />
          </div>
        ) : (
          <p className="text-base text-amber-800">Falta: esta joya no sale en el catálogo hasta que tenga su foto sin ticket.</p>
        )}
        <label className="flex min-h-14 items-center justify-center rounded-2xl bg-emara text-lg font-semibold text-white">
          {fotoCat ? '✓ Foto lista (toca Guardar)' : j.foto_catalogo_path ? 'Cambiar foto para clientas' : 'Tomar foto para clientas'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFotoCat(e.target.files?.[0] ?? null)} />
        </label>
      </Tarjeta>

      <Campo etiqueta="Código del ticket (si tiene)" value={j.codigo_ticket ?? ''} onChange={(e) => cambiar({ codigo_ticket: e.target.value })} />
      <Opciones
        etiqueta="Tipo"
        opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
        valor={j.categoria_id}
        onCambio={(v) => cambiar({ categoria_id: v })}
      />
      <Opciones
        etiqueta="Para"
        opciones={[
          { valor: 'mujer', texto: 'Mujer' },
          { valor: 'hombre', texto: 'Hombre' },
          { valor: 'unisex', texto: 'Unisex' },
          { valor: 'nino', texto: 'Niño/a' },
        ]}
        valor={j.genero}
        onCambio={(v) => cambiar({ genero: v })}
      />
      <CampoDinero
        etiqueta="Precio de venta sugerido"
        valor={j.precio_venta_sugerido}
        onCambio={(n) => cambiar({ precio_venta_sugerido: n })}
      />

      {modoDuena ? (
        <Tarjeta className="flex flex-col gap-3">
          <p className="text-lg font-bold">🔒 Solo tú ves esto</p>
          <CampoDinero etiqueta="Precio del ticket (costo)" valor={j.precio_costo} onCambio={(n) => cambiar({ precio_costo: n })} />
          {j.tipo_costo === 'peso' && (
            <Campo
              etiqueta="Gramos"
              inputMode="decimal"
              value={j.peso_gramos ?? ''}
              onChange={(e) => cambiar({ peso_gramos: Number(e.target.value.replace(',', '.')) || null })}
            />
          )}
        </Tarjeta>
      ) : (
        <p className="text-base text-emara/70">🔒 El precio del ticket se ve y se corrige en Modo dueña.</p>
      )}

      <Interruptor etiqueta="Es un juego (varias piezas)" valor={j.es_juego} onCambio={(v) => cambiar({ es_juego: v })} />
      {j.es_juego && (
        <Campo etiqueta="Piezas del juego" value={j.componentes ?? ''} onChange={(e) => cambiar({ componentes: e.target.value })} />
      )}
      <Interruptor etiqueta="Ticket escrito a mano" valor={j.ticket_manuscrito} onCambio={(v) => cambiar({ ticket_manuscrito: v })} />
      <Campo etiqueta="Casilla" value={j.casilla ?? ''} onChange={(e) => cambiar({ casilla: e.target.value })} />
      <Campo etiqueta="Notas" value={j.notas ?? ''} onChange={(e) => cambiar({ notas: e.target.value })} />

      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && <Aviso>✓ Guardado</Aviso>}
      <BotonGrande onClick={guardar} disabled={guardando} className="justify-center">
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </BotonGrande>
      {j.estado === 'disponible' && (
        <button type="button" onClick={marcarPerdida} className="min-h-14 text-lg font-semibold text-red-700 underline">
          Marcar como perdida
        </button>
      )}
    </Pantalla>
  )
}
