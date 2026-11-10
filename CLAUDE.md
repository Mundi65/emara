# CLAUDE.md — Emara

Emara es la app y también la asistente con IA que vive dentro de ella (ver `ARQUITECTURA.md` §4b). La usuaria se llama Aida.

Lee `ARQUITECTURA.md` antes de cualquier cambio. Es la fuente de verdad.

## Sobre quién pide y quién usa
- El dueño del proyecto (Mundi) **no es programador**: explica en español simple, da archivos completos y comandos exactos, un paso a la vez. Pide confirmación antes de cambios grandes.
- La usuaria final (su esposa) **no es técnica**: cada pantalla debe entenderse sin explicación.

## Stack
React + Vite + TypeScript + Tailwind + vite-plugin-pwa · Supabase (Postgres, Storage, Auth, Edge Functions) · API de Claude con visión desde Edge Functions · Deploy en Vercel · Repo en GitHub (Mundi65).

## Reglas que no se rompen
1. **El precio de costo nunca aparece** en catálogo, comprobantes ni nada que vea una clienta. Solo en "Modo dueña" (PIN) y en el informe para la proveedora.
2. La **foto** identifica la joya en toda la UI; el código va pequeño debajo.
3. La API key de Anthropic **solo** vive en secretos de Supabase. Nunca en el frontend ni en el repo.
4. Los saldos se **calculan** (view), no se guardan a mano.
5. No borrar joyas vendidas ni abonos: anular con registro.
6. Si la IA falla, la app sigue: campos editables marcados en amarillo.
7. UI: botones ≥ 56 px, texto ≥ 18 px, una acción principal por pantalla, todo en español de Ecuador, USD con el formato de los tickets: `$1.234,50` (punto = miles, coma = decimales).
9. Ver `ARQUITECTURA.md` §1b: los tickets reales traen códigos variados, juegos (`A+B`), precio por gramos (`2.77GR`) y manuscritos. Probar la lectura IA con las fotos de `docs/tickets-ejemplo/` antes de dar por buena la función.
8. RLS activado en todas las tablas.

10. La asistente Emara **nunca escribe en la base de datos por sí sola**: sus herramientas solo preparan; Aida confirma con un botón.

## Orden de trabajo
Seguir las fases de `ARQUITECTURA.md` §8. Terminar y probar en el celular cada paso antes del siguiente. Al cerrar cada paso: decir qué se hizo, cómo probarlo en el celular y cuál es el siguiente.

## Comandos
- `npm run dev -- --host` → probar en el celular en la misma red Wi-Fi.
- `npm run build` → verificar antes de subir.
- Migraciones en `supabase/migrations/` con nombre `AAAAMMDD_descripcion.sql`.
