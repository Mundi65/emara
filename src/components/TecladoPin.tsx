import { useState } from 'react'
import { Delete } from 'lucide-react'
import { sinEmoji } from './Icono'

/** Teclado grande para escribir un PIN de 4 números. */
export function TecladoPin({
  titulo,
  subtitulo,
  onCompleto,
}: {
  titulo: string
  subtitulo?: string
  /** Devuelve true si el PIN es correcto (o se aceptó). */
  onCompleto: (pin: string) => Promise<boolean>
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [revisando, setRevisando] = useState(false)

  async function tecla(d: string) {
    if (revisando) return
    setError(false)
    const nuevo = (pin + d).slice(0, 4)
    setPin(nuevo)
    if (nuevo.length === 4) {
      setRevisando(true)
      const ok = await onCompleto(nuevo)
      setRevisando(false)
      if (!ok) {
        setError(true)
        setPin('')
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-6">
      <div className="text-center">
        <p className="font-titulo text-4xl font-semibold text-emara">{sinEmoji(titulo)}</p>
        {subtitulo && <p className="mt-1 text-lg text-emara/70">{subtitulo}</p>}
      </div>
      <div className="flex gap-4" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-2 border-emara ${i < pin.length ? 'bg-emara' : ''}`}
          />
        ))}
      </div>
      <p className="h-7 text-lg text-red-700" role="alert">
        {error ? 'PIN incorrecto, intenta otra vez' : revisando ? 'Revisando…' : ''}
      </p>
      <div className="grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => tecla(d)}
            className="h-16 rounded-2xl border border-linea bg-white text-3xl font-medium text-emara shadow-sm active:bg-arena"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => tecla('0')}
          className="h-16 rounded-2xl border border-linea bg-white text-3xl font-medium text-emara shadow-sm active:bg-arena"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="h-16 rounded-2xl text-xl font-semibold text-emara active:bg-arena"
          aria-label="Borrar"
        >
          <Delete size={28} strokeWidth={1.6} className="mx-auto" aria-hidden />
        </button>
      </div>
    </div>
  )
}
