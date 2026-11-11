import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Pantalla } from '../../components/Pantalla'
import { TecladoPin } from '../../components/TecladoPin'
import { Aviso } from '../../components/ui'
import { usePin } from '../../hooks/usePin'

type Paso = 'actual' | 'nuevo' | 'repetir'

export default function CambiarPin() {
  const { tienePin, verificar, recargar } = usePin()
  const navegar = useNavigate()
  const [paso, setPaso] = useState<Paso>(tienePin ? 'actual' : 'nuevo')
  const [actual, setActual] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clave, setClave] = useState(0) // reinicia el teclado entre pasos

  async function alCompletar(pin: string) {
    setError(null)
    if (paso === 'actual') {
      const ok = await verificar(pin)
      if (ok) {
        setActual(pin)
        setPaso('nuevo')
        setClave((k) => k + 1)
      }
      return ok
    }
    if (paso === 'nuevo') {
      setNuevo(pin)
      setPaso('repetir')
      setClave((k) => k + 1)
      return true
    }
    if (pin !== nuevo) {
      setError('Los PIN no coinciden. Empecemos de nuevo.')
      setPaso('nuevo')
      setClave((k) => k + 1)
      return true
    }
    const { error } = await supabase.rpc('cambiar_pin', { p_nuevo: pin, p_actual: actual })
    if (error) {
      setError(error.message)
      return false
    }
    await recargar()
    navegar('/ajustes', { replace: true })
    return true
  }

  const titulos: Record<Paso, string> = {
    actual: 'Escribe tu PIN actual',
    nuevo: 'Escribe tu PIN nuevo',
    repetir: 'Repite el PIN nuevo',
  }

  return (
    <Pantalla titulo={tienePin ? 'Cambiar PIN' : 'Crear PIN'} volver="/ajustes">
      <p className="text-lg text-emara/80">
        El PIN protege tus costos y ganancias, y bloquea la app si no la usas por 5 minutos. Son 4 números que solo tú
        sabes.
      </p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <TecladoPin key={clave} titulo={titulos[paso]} onCompleto={alCompletar} />
    </Pantalla>
  )
}
