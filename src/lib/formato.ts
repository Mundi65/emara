// Formatos iguales a los tickets: $1.234,50 (punto = miles, coma = decimales)
// y fechas como "10 nov 2026".

const dinero = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatoDinero(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  const signo = n < 0 ? '-' : ''
  return `${signo}$${dinero.format(Math.abs(n))}`
}

/** Número para mostrar dentro de un campo editable: 1234.5 → "1.234,50" */
export function dineroParaCampo(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return ''
  return dinero.format(Number(valor))
}

/**
 * Lee lo que Aida escribe, con el formato de los tickets:
 * "1.110" = mil ciento diez · "1.937,58" = mil novecientos treinta y siete con 58.
 * Devuelve null si no es un número.
 */
export function leerDinero(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
  if (limpio === '' || !/^\d*\.?\d{0,2}$/.test(limpio)) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

/** Porcentaje: acepta "20" o "12,5" */
export function leerPorcentaje(texto: string): number | null {
  const limpio = texto.replace(/[%\s]/g, '').replace(',', '.')
  if (limpio === '') return null
  const n = Number(limpio)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Las fechas sin hora ("2027-05-10") se leen como día local, no UTC. */
function aFecha(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [a, m, d] = fecha.split('-').map(Number)
    return new Date(a, m - 1, d)
  }
  return new Date(fecha)
}

export function formatoFecha(fecha: string | Date): string {
  const d = aFecha(fecha)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/** "2027-05-10" para guardar en la base de datos */
export function fechaISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function hoyISO(): string {
  return fechaISO(new Date())
}

export function textoDiaPago(dia: number | null | undefined): string {
  if (!dia) return 'Sin día de pago'
  if (dia === 5) return 'Inicio de mes (día 5)'
  if (dia === 15) return 'Mediados de mes (día 15)'
  if (dia === 30) return 'Fin de mes (día 30)'
  return `Día ${dia} de cada mes`
}

export function textoPlazo(meses: number | null | undefined): string {
  if (!meses) return 'De contado'
  return meses === 1 ? '1 mes' : `${meses} meses`
}
