import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false si faltan los datos de Supabase en .env.local (o en Vercel) */
export const supabaseConfigurado = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'sin-clave', {
  auth: {
    // "Recordarme": la sesión queda guardada en el celular y se renueva sola,
    // así Aida no tiene que entrar cada vez.
    persistSession: true,
    autoRefreshToken: true,
  },
})
