// Genera los iconos PNG de la app a partir de public/favicon.svg
// Uso: npm run iconos
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile('public/favicon.svg')
await sharp(svg).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/pwa-512.png')
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png')
// Versión "maskable": con margen para que Android la recorte en círculo sin cortar el diamante
await sharp(svg).resize(400, 400).extend({ top: 56, bottom: 56, left: 56, right: 56, background: '#7a3e5c' }).png().toFile('public/pwa-512-maskable.png')
console.log('Iconos listos')
