import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { BotonGrande } from '../../components/BotonGrande'
import { Aviso, Campo, Tarjeta, mensajeError } from '../../components/ui'

export default function Seguridad() {
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  async function bloquear() {
    setAviso(null)
    if (clave.length < 8) return setAviso({ tipo: 'error', texto: 'La contraseña nueva debe tener al menos 8 letras o números.' })
    if (clave !== repetir) return setAviso({ tipo: 'error', texto: 'Las dos contraseñas no son iguales.' })
    setEnviando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: clave })
      if (error) throw error
      // Cierra la sesión en todos los demás celulares y computadoras
      const { error: e2 } = await supabase.auth.signOut({ scope: 'others' })
      if (e2) throw e2
      setClave('')
      setRepetir('')
      setAviso({
        tipo: 'ok',
        texto: '✓ Listo. Cambiaste tu contraseña y cerraste Emara en todos los demás aparatos. Tus datos siguen seguros en la nube.',
      })
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e) })
    }
    setEnviando(false)
  }

  return (
    <Pantalla titulo="🛡️ Seguridad" volver="/ajustes">
      <Tarjeta>
        <p className="text-lg">
          <strong>¿Te robaron o perdiste el celular?</strong> Entra a Emara desde otro celular o computadora, ven aquí y
          cambia tu contraseña. Emara se cierra en todos los demás aparatos y nadie más podrá ver tus datos.
        </p>
      </Tarjeta>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Campo
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
      />
      <Campo
        etiqueta="Repite la contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
      />
      <BotonGrande icono="🔐" onClick={bloquear} disabled={enviando}>
        {enviando ? 'Cambiando…' : 'Cambiar contraseña y cerrar en los demás aparatos'}
      </BotonGrande>
    </Pantalla>
  )
}
