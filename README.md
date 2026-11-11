# Emara

App para el celular que ayuda a Aida a vender joyas a consignación y a crédito.
La documentación completa está en [`ARQUITECTURA.md`](ARQUITECTURA.md) y las reglas en [`CLAUDE.md`](CLAUDE.md).

---

## Poner en marcha (Fase 1, paso 1)

Haz estos pasos **una sola vez**, en orden.

### 1. Crear las tablas en Supabase

1. Entra a [supabase.com](https://supabase.com), abre el proyecto **EMARA**.
2. En el menú de la izquierda, toca **SQL Editor** → **New query**.
3. Abre el archivo [`supabase/migrations/20261110_base_datos.sql`](supabase/migrations/20261110_base_datos.sql), copia **todo** su contenido, pégalo y toca **Run**. Debe decir *Success*.
4. Haz lo mismo con [`supabase/migrations/20261110_bucket_fotos.sql`](supabase/migrations/20261110_bucket_fotos.sql).

### 2. Crear la cuenta de Aida

1. En Supabase: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe el correo de Aida y una contraseña. Marca **Auto Confirm User**. Toca **Create user**.
3. Repite si tú (Mundi) también quieres una cuenta.
4. Dale permiso en la app: ve a **SQL Editor** → **New query**, pega esto (cambia el correo) y toca **Run**:

   ```sql
   insert into public.miembros (user_id, nombre)
   select id, 'Aida' from auth.users where email = 'CORREO-DE-AIDA@ejemplo.com';
   ```

5. Para que nadie más pueda crear cuentas: **Authentication** → **Sign In / Providers** → apaga **Allow new users to sign up**.
   (Aunque alguien lograra crear una cuenta, sin estar en `miembros` no ve nada.)

### 3. Conectar la app con Supabase

1. En Supabase: **Project Settings** → **API**. Copia la **Project URL** y la **anon / publishable key**.
   *Nunca* uses la `service_role` key en la app.
2. En la carpeta del proyecto, copia el archivo `.env.example` con el nombre `.env.local` y pega ahí esos dos valores.

### 4. Probar en el celular (misma red Wi-Fi)

```bash
npm install
npm run dev -- --host
```

En la pantalla aparece una dirección tipo `http://192.168.1.20:5173`. Ábrela en el navegador del celular.

### 5. Publicar en internet (Vercel) e instalar

1. En [vercel.com](https://vercel.com): **Add New → Project** → elige el repositorio **emara**.
2. En **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores.
3. Toca **Deploy**. Abre la dirección que te da Vercel en el celular de Aida.
4. Para instalarla: en Chrome (Android) toca los **tres puntos ⋮** → **Instalar app** (o *Agregar a pantalla principal*).
   En iPhone (Safari): botón **Compartir** → **Agregar a inicio**.

---

## Para programar

| Comando | Para qué |
|---|---|
| `npm run dev -- --host` | Probar en el celular en la misma red Wi-Fi |
| `npm run build` | Verificar que todo compila antes de subir |
| `npm run iconos` | Volver a generar los iconos a partir de `public/favicon.svg` |

Migraciones en `supabase/migrations/` con nombre `AAAAMMDD_descripcion.sql`.
