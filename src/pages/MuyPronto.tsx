import { Pantalla } from '../components/Pantalla'

/** Pantalla provisional para las secciones que se construyen en los siguientes pasos. */
export default function MuyPronto({ titulo }: { titulo: string }) {
  return (
    <Pantalla titulo={titulo}>
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-5xl" aria-hidden>🛠️</p>
        <p className="mt-4 text-xl">Esta parte está en construcción.</p>
        <p className="mt-2 text-lg text-emara/70">Muy pronto podrás usarla.</p>
      </div>
    </Pantalla>
  )
}
