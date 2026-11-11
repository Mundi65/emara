import { supabase } from './supabase'
import { hoyISO } from './formato'

// Respaldo en Excel de toda la información (una hoja por tabla).

const HOJAS: { tabla: string; hoja: string; orden?: string }[] = [
  { tabla: 'v_saldos_clientas', hoja: 'Saldos clientas', orden: 'nombre' },
  { tabla: 'clientas', hoja: 'Clientas', orden: 'nombre' },
  { tabla: 'ventas', hoja: 'Ventas', orden: 'fecha' },
  { tabla: 'v_balance_ventas', hoja: 'Balance ventas', orden: 'fecha' },
  { tabla: 'abonos', hoja: 'Abonos', orden: 'fecha' },
  { tabla: 'proveedoras', hoja: 'Proveedoras', orden: 'nombre' },
  { tabla: 'lotes', hoja: 'Lotes', orden: 'fecha_recepcion' },
  { tabla: 'joyas', hoja: 'Joyas', orden: 'created_at' },
  { tabla: 'cierres', hoja: 'Cierres de lote', orden: 'fecha' },
  { tabla: 'v_cheques', hoja: 'Cheques', orden: 'fecha_cobro' },
]

async function leerTodo(tabla: string, orden?: string): Promise<Record<string, unknown>[]> {
  const filas: Record<string, unknown>[] = []
  const paso = 1000
  for (let desde = 0; ; desde += paso) {
    let q = supabase.from(tabla).select('*').range(desde, desde + paso - 1)
    if (orden) q = q.order(orden)
    const { data, error } = await q
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < paso) break
  }
  return filas
}

function aCelda(v: unknown) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  // números que Postgres devuelve como texto
  if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 16) return Number(s)
  return s
}

export async function descargarRespaldo() {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const hojas = []
  for (const h of HOJAS) {
    const filas = await leerTodo(h.tabla, h.orden)
    const columnas = filas.length ? Object.keys(filas[0]) : ['(sin datos)']
    const data = [
      columnas.map((c) => ({ value: c, fontWeight: 'bold' as const })),
      ...filas.map((f) => columnas.map((c) => aCelda(f[c]))),
    ]
    hojas.push({ data, sheet: h.hoja, stickyRowsCount: 1 })
  }
  await writeXlsxFile(hojas).toFile(`Emara-respaldo-${hoyISO()}.xlsx`)
}
