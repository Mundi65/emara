import { supabase } from './supabase'

const BUCKET = 'fotos'

/** Achica la foto a ~1200 px y la pasa a JPG antes de subirla (ARQUITECTURA §3). */
export async function comprimirFoto(archivo: File, maxLado = 1200, calidad = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo preparar la foto'))), 'image/jpeg', calidad),
  )
}

/** Sube la foto al bucket privado y devuelve la ruta guardada. */
export async function subirFoto(ruta: string, archivo: File): Promise<string> {
  const blob = await comprimirFoto(archivo)
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  return ruta
}

const cache = new Map<string, { url: string; vence: number }>()

/** Enlace temporal (1 hora) para mostrar una foto privada. */
export async function urlFoto(ruta: string | null | undefined): Promise<string | null> {
  if (!ruta) return null
  const guardada = cache.get(ruta)
  if (guardada && guardada.vence > Date.now()) return guardada.url
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600)
  if (!data?.signedUrl) return null
  cache.set(ruta, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}
