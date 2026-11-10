// Ayudas para no cruzar cheques: avisa si dos caen el mismo día o la misma semana.

function aDia(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return Math.round(new Date(a, m - 1, d).getTime() / 86_400_000)
}

export type ChequeSimple = { id?: string; fecha_cobro: string; monto: number; proveedora?: string }

/** Cheques que caen el mismo día (o a menos de 7 días) que la fecha dada. */
export function chequesCercanos<T extends ChequeSimple>(fecha: string, otros: T[], ignorarId?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mismoDia: [] as T[], mismaSemana: [] as T[] }
  const dia = aDia(fecha)
  const mismoDia: T[] = []
  const mismaSemana: T[] = []
  for (const o of otros) {
    if (ignorarId && o.id === ignorarId) continue
    const dif = Math.abs(aDia(o.fecha_cobro) - dia)
    if (dif === 0) mismoDia.push(o)
    else if (dif < 7) mismaSemana.push(o)
  }
  return { mismoDia, mismaSemana }
}

/** Suma de días a una fecha "AAAA-MM-DD" → "AAAA-MM-DD" (sumar meses respeta fin de mes). */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const destino = new Date(a, m - 1 + meses, 1)
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(d, ultimo))
  const mm = String(destino.getMonth() + 1).padStart(2, '0')
  const dd = String(destino.getDate()).padStart(2, '0')
  return `${destino.getFullYear()}-${mm}-${dd}`
}
