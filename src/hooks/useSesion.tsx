import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Estado = {
  cargando: boolean
  sesion: Session | null
  /** true si la persona está en la tabla "miembros" (tiene permiso de ver datos) */
  esMiembro: boolean
  nombre: string | null
}

const inicial: Estado = { cargando: true, sesion: null, esMiembro: false, nombre: null }
const SesionContext = createContext<Estado>(inicial)

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(inicial)

  useEffect(() => {
    let activo = true

    async function revisar(sesion: Session | null) {
      if (!sesion) {
        if (activo) setEstado({ cargando: false, sesion: null, esMiembro: false, nombre: null })
        return
      }
      const { data } = await supabase
        .from('miembros')
        .select('nombre')
        .eq('user_id', sesion.user.id)
        .maybeSingle()
      if (activo) setEstado({ cargando: false, sesion, esMiembro: Boolean(data), nombre: data?.nombre ?? null })
    }

    supabase.auth.getSession().then(({ data }) => revisar(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      // se difiere para no llamar a Supabase dentro del aviso de cambio de sesión
      setTimeout(() => revisar(sesion), 0)
    })
    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <SesionContext.Provider value={estado}>{children}</SesionContext.Provider>
}

export function useSesion() {
  return useContext(SesionContext)
}
