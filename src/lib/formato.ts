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

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatoFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
