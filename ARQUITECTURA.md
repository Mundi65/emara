# Emara — Arquitectura

> Asistente en el celular para vender joyas a consignación, a crédito.
> Usuaria: una persona con poca experiencia en tecnología. **Todo debe ser obvio, grande y con pocos pasos.**
> **Emara** es el nombre de la app y también de su **asistente con IA**: Emara le ayuda a Aida con las cuentas, los precios y todo el negocio (ver §4b). Nombre y textos en `src/config/app.ts`.

---

## 1. El problema que resolvemos

| Dolor | Solución en la app |
|---|---|
| Recibir un lote y registrar cada joya a mano | **Modo Recibir**: 2 fotos por joya (joya + ticket). La IA lee el **código y precio de costo** del ticket y sugiere la **categoría**. Ella solo confirma. |
| Quitar los tickets para vender a otro precio | Al recibir, la app asigna a cada joya un **número de casilla** (ej. `B3-07` = bolsa 3, puesto 7). Ella guarda el ticket en esa casilla. |
| **Volver a poner los tickets al devolver el lote (dolor principal)** | **Modo Devolver**: lista de joyas no vendidas, ordenada por casilla, con foto grande. Y al revés: toma foto al ticket suelto → la app le muestra **a qué joya pertenece**. Respaldo: imprimir etiquetas nuevas con código y costo. |
| Que la clienta no vea el costo | El costo está **oculto por defecto**. Se ve solo con PIN ("Modo dueña"). El catálogo para mostrar a clientas nunca muestra costo. |
| Ventas a crédito, abonos | Tarjeta por clienta con sus compras, saldo y abonos. Registrar un abono = 3 toques. |
| Enviar comprobante de abono por WhatsApp | Al guardar un abono se genera un **comprobante (imagen)** y se comparte por WhatsApp a la clienta y/o a ella misma con un toque. |
| Informe para la dueña de las joyas | PDF por lote: vendidas y no vendidas, con foto, código y costo, totales. |
| Saber cuánto gané | Reporte por clienta y total: costo, precio de venta, ganancia, cobrado y pendiente. |

**La foto es la constancia.** En toda la app se identifica la joya primero por su foto; el código va en letra pequeña debajo.

---

## 1b. Lo que muestran los tickets reales (proveedora: Alexandra Jewelry)

Revisados con fotos reales. La app debe manejar todo esto:

1. **Formato del ticket**: línea 1 = código, línea 2 = precio de costo, logo "ALEXANDRA JEWELRY". Los tickets aparecen girados o de cabeza: la IA debe leerlos en cualquier orientación.
2. **Formato del precio**: punto = miles y coma = decimales. `$1.110` = mil ciento diez; `$1.937,58` = mil novecientos treinta y siete con 58. **Nunca interpretar `$1.110` como $1.11.** Validar: si el costo leído es menor a $50, pedir confirmación.
3. **Códigos muy variados**: `AUOP003-25`, `BR000044`, `CL-AU000011`, `CL00014`, `AVIS06`, `877483`, `512939`, `41-262-63`, `PULS110625`, `CAD0032`. El código se guarda tal cual (texto), sin asumir formato.
4. **Juegos en un solo ticket**: `CAD0028+DIJE000016` = cadena + dije con un solo precio. Se registra como **una joya tipo "juego"** con sus componentes; si se vende una parte por separado, se puede dividir.
5. **Precio por peso**: `CAD0032 / 2.77GR` trae gramos en vez de precio. Campo `peso_gramos` y costo = gramos × precio por gramo (configurable por lote) o escrito a mano.
6. **Tickets escritos a mano** (ej. `$4.218`): la IA los intenta leer, pero se marcan en amarillo para revisar.
7. **Etiquetas con código de barras** de otro formato en algunas piezas: guardar `codigo_barras` opcional y permitir escanearlo (fase 2).
8. **Pares de aretes**: un ticket por par → una sola joya; en la foto deben salir ambos.
9. **Los prefijos parecen indicar la categoría** (`CL`, `BR`, `CAD`, `DIJE`, `PULS`, `AU`, `AV`…). Tabla `prefijos` editable (prefijo → categoría) que confirma Aida; la IA la usa como pista, la foto decide.

---

## 2. Tecnología

| Pieza | Elección | Por qué |
|---|---|---|
| App | **PWA** con React + Vite + TypeScript + Tailwind | Se instala en el celular desde el navegador ("Agregar a pantalla de inicio"), sin Play Store. Una sola base de código. |
| Base de datos, fotos y login | **Supabase** (Postgres + Storage + Auth) | Ya lo conoces (Nylayra). Respaldo en la nube: si se pierde el celular no se pierde nada. |
| Lectura del ticket y categoría | **Supabase Edge Function** que llama a la **API de Claude con visión** (modelo económico, ej. `claude-haiku-5-5`) | La API key queda en el servidor, nunca en el celular. Costo por joya: centavos. |
| PDFs (informes, etiquetas) | `@react-pdf/renderer` en el navegador | Sin servidor extra. |
| Comprobante de abono | Imagen generada con `html-to-image` + **Web Share API** / enlace `wa.me` | Gratis, funciona hoy con su WhatsApp normal. |
| Hosting | **Vercel** | Ya lo usas. HTTPS automático (necesario para la cámara). |
| Trabajo sin internet | Fase 2: cola local con IndexedDB (Dexie) | Las fotos se guardan y suben solas cuando vuelve la señal. |

### Sobre WhatsApp (importante)
- **Fase 1 (gratis):** al guardar el abono aparece el botón grande **"Enviar por WhatsApp"**, abre WhatsApp con el comprobante y el mensaje listos; ella solo toca enviar. Para guardarlo ella misma, botón **"Enviarme copia"** (a su propio número / chat "Tú").
- **Fase 3 (opcional, de pago):** envío 100 % automático con WhatsApp Business Cloud API de Meta. Requiere número aparte, plantillas aprobadas y cuesta por mensaje. No hace falta para empezar.

---

## 3. Modelo de datos (Supabase / Postgres)

```
proveedoras        (dueña de las joyas)
  id, nombre, telefono, notas, created_at

lotes
  id, proveedora_id, nombre ("Lote Nov 2026"), fecha_recepcion,
  fecha_devolucion_estimada, estado [abierto | en_devolucion | cerrado],
  notas, created_at

categorias         (editable; se cargan por defecto)
  id, nombre (Anillo, Aretes, Pulsera, Collar, Cadena, Dije, Reloj, Juego, Otro),
  orden

prefijos           (pista para la IA; Aida la confirma)
  prefijo ("CAD", "BR", "CL"...), categoria_id

lotes: agregar  precio_gramo  (para tickets que vienen por peso)

joyas
  id, lote_id, categoria_id,
  genero [mujer | hombre | unisex | nino],
  codigo_ticket          -- leído por IA, editable, texto libre
  codigo_barras          -- opcional
  tipo_costo [precio | peso]
  precio_costo           -- leído por IA, editable
  peso_gramos            -- si el ticket trae GR
  es_juego (bool), componentes (texto, ej. "Cadena CAD0028 + Dije DIJE000016")
  ticket_manuscrito (bool), confianza_ia (0-1)
  precio_venta_sugerido  -- ella lo pone (o regla: costo x margen)
  casilla                -- ej. "B3-07", asignado automático
  foto_joya_path, foto_ticket_path, (fotos_extra[])
  estado [disponible | vendida | devuelta | perdida],
  descripcion_ia, notas, created_at

historial_costos   (por si cambia el costo; casi nunca)
  id, joya_id, costo_anterior, costo_nuevo, motivo, fecha

clientas
  id, nombre, telefono_whatsapp, direccion, notas, created_at

-- La TARJETA de cada clienta es una CUENTA CORRIENTE (como un kardex):
-- las compras suman a lo que debe, los abonos restan. Un abono NO se
-- asigna a una venta específica: va al saldo total de la clienta.
-- Así, si compra algo nuevo teniendo deuda anterior, todo sigue en la
-- misma tarjeta y el saldo se arrastra solo.

ventas             (movimiento de COMPRA en la tarjeta: suma al saldo)
  id, clienta_id, fecha, total_venta, total_costo (calculado), notas,
  anulada (bool)

venta_items
  id, venta_id, joya_id, precio_venta, precio_costo_al_vender

abonos             (movimiento de ABONO en la tarjeta: resta del saldo)
  id, clienta_id, fecha, monto, metodo [efectivo | transferencia | otro],
  comprobante_path, enviado_clienta (bool), notas, anulado (bool)

v_tarjeta_clienta  (VIEW: une ventas + abonos en orden de fecha)
  clienta_id, fecha, tipo [compra | abono], detalle, compro (+), abono (−),
  saldo_acumulado

ajustes            (una fila)
  pin_dueña (hash), margen_por_defecto, nombre_negocio, telefono_dueña,
  texto_comprobante
```

**Reglas clave**
- Saldo de una clienta = Σ compras − Σ abonos (sin anuladas). Se calcula con *views* (`v_saldos_clientas`, `v_tarjeta_clienta`), nunca se guarda a mano.
- Una clienta puede comprar aunque tenga saldo pendiente: la compra se suma a su tarjeta y la app muestra "Saldo anterior → Esta compra → Nuevo saldo".
- Para el informe de la proveedora no importa qué abono pagó qué joya: cuenta la joya como vendida al registrar la venta.
- Al vender, la joya pasa a `vendida` y se copia el costo en `venta_items` (el informe queda fijo aunque luego cambie el costo).
- Una joya vendida no se puede borrar; solo "anular venta" (regresa a `disponible`).
- Abono mayor al saldo: avisar y no permitir.
- Storage: bucket privado `fotos/{lote_id}/{joya_id}_joya.jpg` y `_ticket.jpg`. Comprimir a ~1200 px antes de subir.
- Seguridad: RLS activado; solo usuarios autenticados de la cuenta. Login con email + "recordarme" para que ella no tenga que entrar cada vez.

---

## 4. Pantallas (pensadas para el pulgar)

### Inicio — 4 botones gigantes
```
┌────────────────────────┐
│  📦  RECIBIR JOYAS      │
│  💍  VENDER             │
│  💵  COBRAR ABONO       │
│  📋  DEVOLVER / INFORMES│
└────────────────────────┘
  Abajo: Clientas · Catálogo · Ajustes
  Resumen arriba: "Te deben $1.240 · 8 clientas"
```

### 📦 Recibir joyas (flujo en bucle, sin salir)
1. Elegir/crear lote (una vez).
2. **Una sola foto: la joya CON su ticket todavía puesto**, el ticket bien visible al lado (guía en pantalla: "una joya por foto, fondo claro, ticket de frente"). Esta foto es la **constancia** que une joya y ticket.
3. (Opcional) Foto extra de la joya sola, más bonita, para el catálogo futuro.
4. La IA devuelve: código, costo (o peso), categoría y género sugeridos → pantalla de confirmación con todo prellenado y botones grandes de categoría.
5. La app muestra en grande: **"Guarda este ticket en la CASILLA B3-07"**.
6. Botón **"Siguiente joya"** → vuelve al paso 2. Contador: "Llevas 37 joyas".
- Si la IA no lee bien el ticket: campos vacíos en amarillo para escribir a mano. Nunca bloquear.
- Aviso si el código ya existe en el lote (posible foto repetida).

### 💍 Vender
1. Buscar joya: cuadrícula de fotos filtrable por categoría/género (o tomar foto del ticket/código).
2. Tocar una o varias → elegir clienta (o crear nueva: nombre + WhatsApp).
3. Precio de venta (prellenado con el sugerido), abono inicial opcional.
4. Guardar → ofrece enviar comprobante de compra por WhatsApp.

### 💵 Cobrar abono
1. Lista de clientas con saldo (foto de lo que compró + saldo en grande), buscador.
2. Tocar clienta → teclado numérico grande → "Guardar abono".
3. Se genera el comprobante: nombre del negocio, clienta, fecha, abono, saldo anterior, **saldo nuevo**, miniaturas de las joyas. **Sin costos.**
4. Botones: **"Enviar a la clienta"** · **"Enviarme copia"** · "Listo".

### 🧾 Tarjeta de la clienta (cuenta corriente)
Arriba, en grande: nombre y **"Te debe $185.00"**. Debajo, la tarjeta como un cuaderno:

```
Fecha     Detalle               Compró   Abonó   Saldo
02 jun    [foto] Anillo + aretes  $120             $120
20 jun    Abono                           $40      $80
15 jul    Abono                           $30      $50
10 nov    [foto] Pulsera          $135             $185
```
- Las compras se ven con la foto de las joyas (tocar = ver grande).
- Botones: **"Nueva compra"** · **"Registrar abono"** · "Enviar estado de cuenta por WhatsApp".
- Al vender a una clienta con deuda: "Saldo anterior $50 + esta compra $135 = **nuevo saldo $185**".

### 📋 Devolver / Informes
- **Modo Devolver lote** (el corazón de la app):
  - Lista de joyas no vendidas **ordenada por casilla**, foto grande, código y costo, check "✓ ticket puesto".
  - Botón **"Tengo un ticket suelto"**: foto al ticket → IA lee el código → muestra la foto de la joya y su casilla.
  - Botón **"Leer varios tickets"**: Aida riega 10–15 tickets en la mesa y toma UNA foto; la IA lee todos los códigos y la app muestra, por cada ticket, la foto de su joya (y avisa si alguno es de una joya ya vendida → ese ticket va al informe de la dueña).
  - Barra de progreso: "Faltan 12 de 85".
  - Respaldo: **"Imprimir etiquetas"** (PDF con código + costo por joya no vendida) por si se perdió algún ticket.
  - Al terminar: "Cerrar lote" (no vendidas → `devuelta`).
- **Informe para la dueña** (PDF por lote): resumen (recibidas, vendidas, devueltas, total a pagar a costo) + tabla con foto, código, categoría, costo, estado. Compartir por WhatsApp.
- **Informe de ganancias** (solo con PIN): por clienta y total — costo, venta, ganancia, cobrado, pendiente.

### Catálogo (para mostrar a clientas)
Galería de disponibles con precio de venta; **nunca muestra costo ni código**. Base de la futura tienda online.

### Ajustes
Nombre del negocio, su WhatsApp, PIN, margen por defecto, categorías, texto del comprobante, exportar todo a Excel (respaldo).

---

## 4b. Emara, la asistente

Emara es una asistente con IA dentro de la app. Aida le habla **por voz o por texto**, como si le escribiera por WhatsApp. Siempre visible: botón flotante **"Pregúntale a Emara"** en todas las pantallas.

**Personalidad**: cálida, paciente, tutea a Aida, español de Ecuador, frases cortas, nunca usa palabras técnicas. Responde también en voz alta si Aida quiere.

**Qué hace Emara**
| Aida dice… | Emara… |
|---|---|
| "¿Cuánto me debe la Rosita?" | Busca la clienta y responde el saldo con sus últimos abonos. |
| "La Rosita me abonó 50" | Prepara el abono y muestra la tarjeta para confirmar con un botón; luego ofrece enviar el comprobante. |
| "¿A cuánto vendo esta pulsera?" (con foto o código) | Sugiere precio de venta según costo × margen habitual y lo que Aida ha cobrado por piezas parecidas. |
| "¿Quiénes no me pagan hace más de un mes?" | Lista de clientas atrasadas con botón para enviarles un recordatorio amable por WhatsApp. |
| "¿Cuánto llevo vendido de este lote?" | Resumen: vendido, costo a pagar a la dueña, ganancia, pendiente de cobro. |
| "¿Dónde está el ticket del anillo CL00014?" | Muestra la foto de la joya y su casilla. |
| "¿Cuánto le debo a Alexandra?" | Costo total de lo vendido del lote. |
| "Hazme el informe para devolver" | Genera el PDF del lote. |

**Reglas de Emara**
1. **Nunca guarda, cambia ni borra nada sin que Aida toque "Sí, confirmar"** (abonos, ventas, precios).
2. Si no está segura (dos clientas con nombre parecido, monto raro), **pregunta** en vez de adivinar.
3. Nunca pone el **precio de costo** en mensajes para clientas.
4. Solo habla del negocio; si no sabe algo, lo dice.
5. Cada respuesta con números sale de la base de datos, nunca inventada.

**Cómo funciona (técnico)**
- Edge Function `emara-chat` → API de Claude con **herramientas** (tool use) que consultan Supabase:
  `buscar_clienta`, `saldo_clienta`, `tarjeta_clienta`, `preparar_abono`, `preparar_venta`, `buscar_joya` (por código, foto o descripción), `sugerir_precio`, `resumen_lote`, `clientas_atrasadas`, `generar_informe`.
- Las herramientas `preparar_*` **no escriben**: devuelven una tarjeta de confirmación; la escritura la hace la app cuando Aida confirma.
- Voz: grabar con el micrófono y transcribir (Web Speech API o transcripción en el servidor); respuesta en voz con `speechSynthesis` (voz femenina en español).
- Tabla `emara_mensajes` (id, rol, texto, fecha) para que Emara recuerde la conversación del día.
- Modelo: uno económico para el día a día; el prompt de Emara vive en `supabase/functions/emara-chat/prompt.md` para ajustarlo sin tocar código.

---

## 5. Reglas de diseño (usuaria no técnica)
- Botones mínimo 56 px de alto, texto 18 px+, máximo 1 acción principal por pantalla.
- Palabras simples: "Te debe", "Abonó", "Guardar". Nada de "sincronizar", "registro", "ID".
- Confirmaciones verdes grandes ("✓ Abono guardado"), errores en lenguaje humano y con solución.
- Deshacer en vez de "¿Estás segura?" cuando se pueda.
- Todo en español, moneda USD, **mismo formato que los tickets**: `$1.234,50` (punto miles, coma decimales). Fechas `10 nov 2026`.
- Funciona en celulares Android de gama media; probar en pantalla de 360 px.
- Costos siempre ocultos fuera de "Modo dueña".

---

## 6. Edge Function `leer-joya`
- Entrada: foto de la joya + foto del ticket (base64 o rutas de Storage).
- Llama a la API de Claude con ambas imágenes y pide **JSON estricto**:
  `{ codigo, precio_costo, categoria, genero, descripcion_corta, confianza }`
- Si `confianza` es baja o falta algún dato → la app marca el campo en amarillo.
- Secreto `ANTHROPIC_API_KEY` en Supabase (`create_edge_function_secret`), nunca en el frontend.
- Variante `leer-ticket` (solo ticket → código) para el botón "Tengo un ticket suelto".
- Antes de construir: probar el prompt con 10 fotos reales de tickets de ella y ajustar.

---

## 7. Estructura del proyecto
```
emara/
├── CLAUDE.md
├── ARQUITECTURA.md
├── supabase/
│   ├── migrations/          # tablas, views, RLS, bucket
│   └── functions/
│       ├── leer-joya/
│       ├── leer-ticket/
│       └── emara-chat/      # asistente Emara (prompt.md + herramientas)
├── src/
│   ├── config/app.ts        # nombre, colores, moneda
│   ├── lib/supabase.ts
│   ├── lib/ia.ts            # llamadas a las edge functions
│   ├── lib/whatsapp.ts      # wa.me + Web Share
│   ├── lib/pdf/             # informe dueña, etiquetas, estado de cuenta
│   ├── components/          # BotonGrande, FotoJoya, TecladoMonto, Camara...
│   ├── pages/
│   │   ├── Inicio.tsx
│   │   ├── recibir/
│   │   ├── vender/
│   │   ├── cobrar/
│   │   ├── clientas/
│   │   ├── devolver/
│   │   ├── informes/
│   │   ├── catalogo/
│   │   └── ajustes/
│   └── hooks/
├── public/manifest.webmanifest + iconos
└── vite.config.ts           # vite-plugin-pwa
```

---

## 8. Fases (por urgencia)

**Fase 1 — Lo urgente (≈ 1–2 semanas)**
1. Proyecto + Supabase (tablas, RLS, bucket) + login + PWA instalable.
2. Recibir joyas con fotos + IA + casillas.
3. Clientas, vender, cobrar abono, comprobante por WhatsApp.
4. Modo Devolver + informe PDF para la dueña.

**Fase 2 — Emara y comodidad**
5. **Emara asistente** (§4b): primero consultas (saldos, resúmenes, buscar joya), luego acciones con confirmación (abonos, ventas), luego voz.
6. Informe de ganancias con PIN, estado de cuenta por clienta.
7. Trabajo sin internet (cola de fotos), exportar a Excel, imprimir etiquetas.
8. Recordatorio de clientas con saldo atrasado.

**Fase 3 — Crecer**
9. WhatsApp automático (Cloud API) si vale la pena.
10. Catálogo público / tienda online "Emara Joyas" con las fotos (quitar fondo con IA).
11. Si funciona bien, convertirla en producto para otras vendedoras por consignación.

---

## 9. Antes de empezar (lo que hay que conseguir)
- 10–20 fotos reales de tickets y joyas de un lote (para probar la IA).
- Confirmar con tu esposa: ¿cuántas joyas trae un lote? ¿qué categorías usa ella realmente?
- Cuenta de Supabase (nuevo proyecto), API key de Anthropic, repo en GitHub (Mundi65), proyecto en Vercel.
