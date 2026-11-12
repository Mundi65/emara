import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { BotonGrande } from '../components/BotonGrande'
import { APP } from '../config/app'

const campo =
  'w-full min-h-14 rounded-2xl border-2 border-linea bg-white px-4 text-xl outline-none transition focus:border-emara focus:ring-4 focus:ring-dorado/30'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
    setEnviando(false)
    if (error) {
      setError(
        error.message.toLowerCase().includes('invalid')
          ? 'El correo o la contraseña no coinciden. Revisa y vuelve a intentar.'
          : 'No pudimos entrar. Revisa que tengas internet y vuelve a intentar.',
      )
    }
    // Si sale bien, la app cambia sola a la pantalla de Inicio.
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <img src="/marca/ave-cafe.png" alt="" className="mx-auto mb-3 h-28 w-auto" />
        <h1 className="text-6xl font-semibold text-emara">{APP.nombre}</h1>
        <p className="mt-1 text-sm tracking-[0.3em] text-emara/70 uppercase">Fashion jewelry</p>
        <div className="mx-auto mt-4 h-px w-12 bg-dorado" aria-hidden />
        <p className="mt-4 text-lg text-emara/80">{APP.lema}</p>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">Tu correo</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={campo}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">Tu contraseña</span>
          <div className="flex gap-2">
            <input
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className={campo}
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="min-h-14 shrink-0 rounded-2xl border-2 border-linea bg-white px-4 text-lg font-semibold text-emara"
            >
              {verClave ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </label>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg text-red-800">
            {error}
          </p>
        )}

        <BotonGrande type="submit" disabled={enviando} className="mt-2 justify-center text-center">
          {enviando ? 'Entrando…' : 'Entrar'}
        </BotonGrande>

        <p className="text-center text-base text-emara/70">Te quedarás dentro, no tendrás que entrar cada vez.</p>
      </form>
    </div>
  )
}
