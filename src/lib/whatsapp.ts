// Enviar mensajes por WhatsApp con un toque (wa.me). Gratis: abre WhatsApp
// con el mensaje listo y Aida solo toca "Enviar".

/** Deja solo números y agrega el código de Ecuador (593) si el número empieza con 0. */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let n = telefono.replace(/\D/g, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('0')) n = '593' + n.slice(1)
  if (n.length === 9 && n.startsWith('9')) n = '593' + n
  return n.length >= 10 ? n : null
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string {
  const numero = normalizarTelefono(telefono)
  const texto = encodeURIComponent(mensaje)
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}

export function abrirWhatsApp(telefono: string | null | undefined, mensaje: string) {
  window.open(enlaceWhatsApp(telefono, mensaje), '_blank', 'noopener')
}
