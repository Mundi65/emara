import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { SoloDuena } from '../../components/ModoDuena'
import { Aviso, Campo, CampoDinero, Opciones, mensajeError } from '../../components/ui'
import { formatoFecha, hoyISO, leerPorcentaje } from '../../lib/formato'
import type { Proveedora } from '../../lib/tipos'

export default function NuevoLote() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const [proveedoras, setProveedoras] = useState<Proveedora[]>([])
  const [proveedoraId, setProveedoraId] = useState<string | null>(params.get('proveedora'))
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [comision, setComision] = useState('')
  const [precioGramo, setPrecioGramo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('proveedoras')
      .select('*')
      .eq('activa', true)
      .order('es_propio')
      .order('nombre')
      .then(({ data }) => setProveedoras((data as Proveedora[]) ?? []))
  }, [])

  const prov = proveedoras.find((p) => p.id === proveedoraId)

  // al elegir proveedora, sugerir nombre y comisión (editables)
  useEffect(() => {
    if (!prov) return
    setComision(String(Number(prov.comision_pct)).replace('.', ','))
    setNombre((n) => n || `Lote ${formatoFecha(new Date())}`)
  }, [prov])

  async function guardar() {
    setError(null)
    if (!prov) return setError('Elige la proveedora.')
    const pct = prov.es_propio ? 0 : leerPorcentaje(comision)
    if (pct === null) return setError('La comisión debe ser un número entre 0 y 100.')
    if (!nombre.trim()) return setError('Ponle un nombre o fecha al lote.')
    setGuardando(true)
    const { data, error } = await supabase
      .from('lotes')
      .insert({
        proveedora_id: prov.id,
        nombre: nombre.trim(),
        fecha_recepcion: fecha,
        comision_pct: pct,
        precio_gramo: precioGramo,
      })
      .select('id')
      .single()
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    navegar(`/recibir?lote=${data.id}`, { replace: true })
  }

  return (
    <Pantalla titulo="📦 Nuevo lote">
      <SoloDuena>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Opciones
          etiqueta="¿De quién son las joyas?"
          opciones={proveedoras.map((p) => ({ valor: p.id, texto: p.nombre }))}
          valor={proveedoraId}
          onCambio={setProveedoraId}
        />
        {prov && (
          <>
            <Campo etiqueta="Nombre del lote" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Campo etiqueta="Fecha en que lo recibiste" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            {!prov.es_propio && (
              <Campo
                etiqueta="Comisión de este lote (%)"
                ayuda={`La de ${prov.nombre} es ${Number(prov.comision_pct)} %. Cámbiala solo si negociaron otra.`}
                inputMode="decimal"
                value={comision}
                onChange={(e) => setComision(e.target.value)}
              />
            )}
            <CampoDinero
              etiqueta="Precio por gramo (opcional)"
              ayuda="Para los tickets que vienen en gramos (ej. 2.77GR)"
              valor={precioGramo}
              onCambio={setPrecioGramo}
            />
            <BotonGrande onClick={guardar} disabled={guardando} icono="📸">
              {guardando ? 'Creando…' : 'Crear lote y empezar a recibir'}
            </BotonGrande>
          </>
        )}
      </SoloDuena>
    </Pantalla>
  )
}
