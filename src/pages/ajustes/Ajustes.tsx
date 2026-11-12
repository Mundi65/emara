import { KeyRound, ShieldCheck, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { Aviso, Campo, Cargando, EnlaceFila, Tarjeta, mensajeError } from '../../components/ui'
import { useSesion } from '../../hooks/useSesion'
import { usePin } from '../../hooks/usePin'
import { descargarRespaldo } from '../../lib/respaldo'
import { COLUMNAS_AJUSTES, type Ajustes as TAjustes } from '../../lib/tipos'

export default function Ajustes() {
  const { sesion } = useSesion()
  const { tienePin, modoDuena, salirModoDuena } = usePin()
  const [ajustes, setAjustes] = useState<TAjustes | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [respaldando, setRespaldando] = useState(false)

  useEffect(() => {
    supabase
      .from('ajustes')
      .select(COLUMNAS_AJUSTES)
      .single()
      .then(({ data }) => setAjustes(data as TAjustes))
  }, [])

  async function guardar() {
    if (!ajustes) return
    setGuardando(true)
    const { error } = await supabase
      .from('ajustes')
      .update({
        nombre_negocio: ajustes.nombre_negocio.trim() || 'Emara Joyas',
        telefono_duena: ajustes.telefono_duena?.trim() || null,
        texto_comprobante: ajustes.texto_comprobante,
        margen_por_defecto: ajustes.margen_por_defecto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
    setGuardando(false)
    setAviso(error ? { tipo: 'error', texto: mensajeError(error) } : { tipo: 'ok', texto: '✓ Guardado' })
  }

  async function respaldo() {
    setRespaldando(true)
    setAviso(null)
    try {
      await descargarRespaldo()
      setAviso({ tipo: 'ok', texto: '✓ Respaldo descargado. Guárdalo en un lugar seguro.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e) })
    }
    setRespaldando(false)
  }

  return (
    <Pantalla titulo="⚙️ Ajustes" volver="/">
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <h2 className="text-xl font-bold">Seguridad</h2>
      <EnlaceFila
        to="/ajustes/pin"
        icono={<KeyRound size={22} strokeWidth={1.6} />}
        derecha={tienePin ? '' : <span className="text-amber-700">Falta</span>}
      >
        {tienePin ? 'Cambiar mi PIN' : 'Crear mi PIN'}
      </EnlaceFila>
      <EnlaceFila to="/ajustes/seguridad" icono={<ShieldCheck size={22} strokeWidth={1.6} />}>Me robaron el celular / cambiar contraseña</EnlaceFila>
      {tienePin && modoDuena && (
        <BotonGrande variante="secundario" icono="🔒" onClick={salirModoDuena}>
          Cerrar Modo dueña ahora
        </BotonGrande>
      )}

      <h2 className="mt-4 text-xl font-bold">Mi negocio</h2>
      <EnlaceFila to="/proveedoras" icono={<Tag size={22} strokeWidth={1.6} />}>Proveedoras y comisiones</EnlaceFila>
      {!ajustes ? (
        <Cargando />
      ) : (
        <Tarjeta className="flex flex-col gap-4">
          <Campo
            etiqueta="Nombre del negocio"
            value={ajustes.nombre_negocio}
            onChange={(e) => setAjustes({ ...ajustes, nombre_negocio: e.target.value })}
          />
          <Campo
            etiqueta="Tu WhatsApp"
            ayuda="Para enviarte copia de los comprobantes"
            inputMode="tel"
            value={ajustes.telefono_duena ?? ''}
            onChange={(e) => setAjustes({ ...ajustes, telefono_duena: e.target.value })}
          />
          <Campo
            etiqueta="Margen sugerido (%)"
            ayuda="Para sugerir el precio de venta al recibir: costo + este %. Siempre lo puedes cambiar."
            inputMode="decimal"
            value={String(ajustes.margen_por_defecto ?? '')}
            onChange={(e) => setAjustes({ ...ajustes, margen_por_defecto: Number(e.target.value.replace(',', '.')) || 0 })}
          />
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Mensaje del comprobante</span>
            <textarea
              rows={2}
              value={ajustes.texto_comprobante}
              onChange={(e) => setAjustes({ ...ajustes, texto_comprobante: e.target.value })}
              className="w-full rounded-2xl border-2 border-linea bg-white p-4 text-xl outline-none focus:border-emara"
            />
          </label>
          <BotonGrande onClick={guardar} disabled={guardando} className="justify-center">
            {guardando ? 'Guardando…' : 'Guardar'}
          </BotonGrande>
        </Tarjeta>
      )}

      <h2 className="mt-4 text-xl font-bold">Respaldo</h2>
      <BotonGrande variante="secundario" icono="💾" onClick={respaldo} disabled={respaldando}>
        {respaldando ? 'Preparando…' : 'Descargar respaldo en Excel'}
      </BotonGrande>
      <p className="text-base text-emara/70">
        Todo ya está guardado en la nube al instante. Este archivo es una copia extra para guardar donde quieras.
      </p>

      <h2 className="mt-4 text-xl font-bold">Cuenta</h2>
      <Tarjeta>
        <p className="text-lg text-emara/70">Entraste como</p>
        <p className="text-xl font-semibold break-all">{sesion?.user.email}</p>
      </Tarjeta>
      <BotonGrande variante="secundario" icono="🚪" onClick={() => supabase.auth.signOut()}>
        Salir de la cuenta
      </BotonGrande>
    </Pantalla>
  )
}
