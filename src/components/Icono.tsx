import type { ReactNode } from 'react'
import {
  BadgeDollarSign,
  CalendarDays,
  Camera,
  ClipboardList,
  Gem,
  Images,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Package,
  Plus,
  Receipt,
  Save,
  Send,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * Íconos finos (de línea) en lugar de emojis, para un aspecto limpio y profesional.
 * Las pantallas siguen pasando el emoji de siempre; aquí se traduce al ícono.
 */
const MAPA: Record<string, LucideIcon> = {
  '📦': Package,
  '💍': Gem,
  '💵': BadgeDollarSign,
  '📋': ClipboardList,
  '➕': Plus,
  '✨': Sparkles,
  '💾': Save,
  '📩': Mail,
  '📲': Send,
  '📷': Camera,
  '📸': Camera,
  '🔐': KeyRound,
  '🔒': Lock,
  '🗓️': CalendarDays,
  '🚪': LogOut,
  '🧾': Receipt,
  '🖼️': Images,
}

export function Icono({ de, tamano = 26 }: { de: ReactNode; tamano?: number }) {
  if (typeof de === 'string') {
    const I = MAPA[de]
    if (I) return <I size={tamano} strokeWidth={1.6} aria-hidden />
  }
  return <span aria-hidden>{de}</span>
}

/** Quita el emoji del inicio de un título ("🗓️ Cheques" → "Cheques"). */
export function sinEmoji(t: ReactNode): ReactNode {
  return typeof t === 'string' ? t.replace(/^(\p{Extended_Pictographic}|️|‍)+\s*/u, '') : t
}
