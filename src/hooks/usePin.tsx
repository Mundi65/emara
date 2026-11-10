import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

// Bloqueo con PIN:
// - Al abrir la app (o volver a ella) después de 5 minutos sin usarla, pide el PIN.
// - "Modo dueña" (ver costos, balance, cierres) pide el PIN y dura 10 minutos.

const MIN_BLOQUEO = 5
const MIN_DUENA = 10
const CLAVE_ACTIVIDAD = 'emara-ultima-actividad'

type Estado = {
  tienePin: boolean | null
  bloqueada: boolean
  modoDuena: boolean
  verificar: (pin: string) => Promise<boolean>
  entrarModoDuena: (pin: string) => Promise<boolean>
  salirModoDuena: () => void
  recargar: () => Promise<void>
}

const PinContext = createContext<Estado | null>(null)

function leerActividad(): number {
  try {
    return Number(localStorage.getItem(CLAVE_ACTIVIDAD) ?? 0)
  } catch {
    return 0
  }
}
function guardarActividad() {
  try {
    localStorage.setItem(CLAVE_ACTIVIDAD, String(Date.now()))
  } catch {
    /* sin almacenamiento: se pedirá el PIN cada vez */
  }
}

export function PinProvider({ children }: { children: ReactNode }) {
  const [tienePin, setTienePin] = useState<boolean | null>(null)
  const [bloqueada, setBloqueada] = useState(false)
  const [duenaHasta, setDuenaHasta] = useState(0)
  const [, setTic] = useState(0)
  const ultimoGuardado = useRef(0)

  const recargar = useCallback(async () => {
    const { data } = await supabase.rpc('tiene_pin')
    setTienePin(Boolean(data))
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  // ¿Hay que bloquear? Al abrir y al volver a la app.
  useEffect(() => {
    if (!tienePin) return
    const revisar = () => {
      if (Date.now() - leerActividad() > MIN_BLOQUEO * 60_000) setBloqueada(true)
    }
    revisar()
    const alVolver = () => document.visibilityState === 'visible' && revisar()
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [tienePin])

  // Registrar actividad (cada toque, como máximo cada 20 s)
  useEffect(() => {
    const tocar = () => {
      if (bloqueada) return
      if (Date.now() - ultimoGuardado.current > 20_000) {
        ultimoGuardado.current = Date.now()
        guardarActividad()
      }
    }
    window.addEventListener('pointerdown', tocar)
    window.addEventListener('keydown', tocar)
    return () => {
      window.removeEventListener('pointerdown', tocar)
      window.removeEventListener('keydown', tocar)
    }
  }, [bloqueada])

  // Para que el Modo dueña se apague solo al vencer
  useEffect(() => {
    if (!duenaHasta) return
    const t = setInterval(() => setTic((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [duenaHasta])

  const verificar = useCallback(async (pin: string) => {
    const { data } = await supabase.rpc('verificar_pin', { p_pin: pin })
    if (data) {
      guardarActividad()
      setBloqueada(false)
    }
    return Boolean(data)
  }, [])

  const entrarModoDuena = useCallback(
    async (pin: string) => {
      const ok = await verificar(pin)
      if (ok) setDuenaHasta(Date.now() + MIN_DUENA * 60_000)
      return ok
    },
    [verificar],
  )

  const valor: Estado = {
    tienePin,
    bloqueada: Boolean(tienePin) && bloqueada,
    // sin PIN creado todavía, el modo dueña está abierto (Ajustes invita a crear uno)
    modoDuena: tienePin === false || duenaHasta > Date.now(),
    verificar,
    entrarModoDuena,
    salirModoDuena: () => setDuenaHasta(0),
    recargar,
  }

  return <PinContext.Provider value={valor}>{children}</PinContext.Provider>
}

export function usePin() {
  const ctx = useContext(PinContext)
  if (!ctx) throw new Error('usePin fuera de PinProvider')
  return ctx
}
