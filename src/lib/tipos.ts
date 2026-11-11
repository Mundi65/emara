// Formas de los datos que vienen de Supabase (ver supabase/migrations)

export type Proveedora = {
  id: string
  nombre: string
  telefono: string | null
  notas: string | null
  comision_pct: number
  tope_credito: number | null
  es_propio: boolean
  activa: boolean
}

export type Lote = {
  id: string
  proveedora_id: string
  nombre: string
  fecha_recepcion: string
  fecha_devolucion_estimada: string | null
  estado: 'abierto' | 'en_devolucion' | 'cerrado'
  precio_gramo: number | null
  comision_pct: number | null
  notas: string | null
}

export type Categoria = { id: string; nombre: string; orden: number }

export type Joya = {
  id: string
  lote_id: string
  categoria_id: string | null
  genero: 'mujer' | 'hombre' | 'unisex' | 'nino' | null
  codigo: string
  codigo_ticket: string | null
  tipo_costo: 'precio' | 'peso'
  precio_costo: number | null
  peso_gramos: number | null
  es_juego: boolean
  componentes: string | null
  ticket_manuscrito: boolean
  precio_venta_sugerido: number | null
  casilla: string | null
  foto_joya_path: string | null
  foto_ticket_path: string | null
  foto_catalogo_path: string | null
  estado: 'disponible' | 'vendida' | 'devuelta' | 'perdida'
  notas: string | null
  created_at: string
}

export type Clienta = {
  id: string
  nombre: string
  telefono_whatsapp: string | null
  direccion: string | null
  notas: string | null
  dia_pago: number | null
  enviar_saldo: boolean
}

export type SaldoClienta = {
  clienta_id: string
  nombre: string
  telefono_whatsapp: string | null
  total_compras: number
  total_abonos: number
  saldo: number
  ultimo_movimiento: string | null
  ultimo_abono: string | null
}

export type MovimientoTarjeta = {
  clienta_id: string
  fecha: string
  tipo: 'compra' | 'abono'
  movimiento_id: string
  detalle: string
  compro: number
  abono: number
  saldo_acumulado: number
}

export type Cheque = {
  id: string
  proveedora_id: string
  cierre_id: string | null
  numero: string | null
  banco: string | null
  monto: number
  fecha_cobro: string
  estado: 'por_cobrar' | 'cobrado' | 'anulado'
  cobrado_en: string | null
  notas: string | null
  proveedora: string
  lote: string | null
}

export type Ajustes = {
  nombre_negocio: string
  telefono_duena: string | null
  margen_por_defecto: number
  puestos_por_bolsa: number
  texto_comprobante: string
}

export const COLUMNAS_AJUSTES = 'nombre_negocio, telefono_duena, margen_por_defecto, puestos_por_bolsa, texto_comprobante'
