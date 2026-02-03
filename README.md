# Listailor Technical Test

Plataforma end-to-end para evaluar las 90 postulaciones reales del challenge. Combina un backend en **NestJS + Prisma (PostgreSQL/Neon)** con un frontend en **Next.js 14 (App Router)** para que un hiring manager pueda navegar el pipeline, gestionar candidatos y calcular scores con IA de forma masiva o individual.

## Tabla de contenido

1. [Arquitectura](#arquitectura)
2. [Flujo de producto](#flujo-de-producto)
3. [Score, IA y Rúbrica Dinámica](#score-ia-y-rúbrica-dinámica)
4. [Credenciales / Magic Link](#credenciales--magic-link)
5. [Variables de entorno](#variables-de-entorno)
6. [Instalación y ejecución local](#instalación-y-ejecución-local)
7. [Deploy](#deploy)
8. [Tradeoffs y siguientes pasos](#tradeoffs-y-siguientes-pasos)

---

## Arquitectura

Esta solución utiliza una arquitectura monorepo para compartir tipos y contratos entre cliente y servidor.

```
apps/
 ├─ api       (NestJS 11 + Prisma + SendGrid)
 └─ web       (Next.js 14 App Router + Tailwind)
packages/
 └─ shared    (tipos y esquemas comunes)
```


- **API externa:** `/api/v1/technical_test/jobs` y `/applications`. Se consumen desde `ExternalApiClient`, se guardan en Postgres (Neon) y se exponen con control de acceso.
- **Base de datos:** Prisma gestiona tablas para jobs, candidates, notas, scores, sesiones, magic links, etc.
- **Autenticación:** magic links firmados con HMAC. Los tokens se guardan hashed (`MagicLinkTicket`) y emiten sesiones (`Session`) que viajan como cookies `httpOnly`.
- **Frontend:** Next.js App Router con páginas `jobs`, `pipeline`, `offers`. Las rutas `/api/*` actúan como proxy y adjuntan la cookie de sesión al backend.

## Flujo de producto

1. **Login:** visitan `/login`, ingresan su correo. Un magic link (SendGrid) abre `/auth/callback` y setea la sesión.
2. **Pipeline Board:** vista Kanban interactiva. Permite mover candidatos entre etapas (`INBOX`, `SHORTLIST`, `INTERVIEW`, etc.) con drag-and-drop o clicks rápidos.
3. **Jobs & Offers:** listado de cargos abiertos con conteo de postulantes y filtros rápidos por rol/estado; sirve para saltar entre procesos y visualizar cuántas vacantes están activas.
4. **Gestión masiva:** tabla de candidatos con capacidad de **"Score Automático"** para procesar lotes de postulantes pendientes sin intervención manual.
5. **Detalle del candidato:** visualización del PDF del CV (parseado), respuestas del formulario, desglose del puntaje y banderas de riesgo.
6. **API interna:** endpoints protegidos para orquestar el movimiento de etapas y el cálculo de puntajes.

## Score, IA y Rúbrica Dinámica

El sistema no solo genera un número, sino que explica el "por qué".

- **Extracción de Datos:** Se utiliza `pdf-parse` para extraer el texto crudo de los PDFs de los candidatos y combinarlo con sus respuestas del formulario.
- **Análisis con LLM:** Los datos se envían a OpenAI (`gpt-4.1-mini`) con un prompt estructurado que evalúa 4 dimensiones:
    - **Relevancia:** Ajuste al rol/equipo.
    - **Experiencia:** Evidencia de impacto.
    - **Motivación:** Claridad en el interés.
    - **Riesgo:** Detección de red flags (con explicación).
- **Rúbrica Dinámica (UX):** El reclutador tiene control total. En la interfaz, puede ajustar los **pesos de cada dimensión** (ej. dar más valor a la Experiencia que a la Motivación) y el puntaje de prioridad se recalcula en tiempo real en el frontend.
- **Transparencia:** Se guardan y muestran las razones textuales generadas por la IA.

## Credenciales / Magic Link

- **Backend deploy:** https://listailor-technical-test.onrender.com
- **Frontend deploy:** https://listailor-technical-test-web-pedropablovelasco.vercel.app
- **Acceso:** ingresar cualquier correo controlado en `/login`. SendGrid (single sender verificado) enviará el enlace.
- **Links de un solo uso:** cada magic link se marca como consumido (`MagicLinkTicket.consumedAt`) en el primer clic o cuando expira (`AUTH_MAGIC_TTL_MINUTES`). Si expira, sólo hay que solicitar uno nuevo desde `/login`. Puede tardar unos minutos en llegar.

## Variables de entorno

### Backend (`apps/api/.env`)

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (SSL required) |
| `LISTAILOR_API_BASE_URL` / `LISTAILOR_API_TOKEN` | API externa del challenge |
| `PORT` | Puerto del servidor (Render usa `process.env.PORT`) |
| `AUTH_MAGIC_SECRET` | Clave HMAC para tokens mágicos |
| `AUTH_MAGIC_APP_URL` | URL pública del frontend (para links en el correo) |
| `AUTH_MAGIC_TTL_MINUTES` | Vigencia de cada enlace |
| `AUTH_MAGIC_FROM_EMAIL` | Remitente verificado en SendGrid |
| `SENDGRID_API_KEY` | API key con permiso *Mail Send* |
| `AUTH_SESSION_TTL_MINUTES` | Vigencia de la sesión persistida |
| `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL` | Config de scoring (Default: `gpt-4o-mini`) |

### Frontend (`apps/web/.env.local` / Vercel)

| Variable | Descripción |
| --- | --- |
| `API_BASE_URL` | URL pública del backend (Render) |
| `NEXT_PUBLIC_API_BASE_URL` *(opcional)* | Expuesta al browser si hiciera falta |
| `AUTH_MAGIC_APP_URL` | También se usa para construir links (coincide con Vercel) |

## Instalación y ejecución local

Requisitos: Node 20+, pnpm 9+, acceso a la base Neon.

```bash
pnpm install

# aplicar migraciones y seed inicial
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed   # opcional
cd ../..

pnpm dev  # levanta api (3001) + web (3000) en paralelo
```

- API: http://localhost:3001  
- Web: http://localhost:3000  
- Define `.env` en ambos paquetes (ver tablas).

## Deploy

- **Backend:** Render (Node service). Build `pnpm install && pnpm prisma generate && pnpm build`. Start `pnpm start:prod`. Todas las variables anteriores definidas en Render.
- **Frontend:** Vercel con root `apps/web`. Build `pnpm run build`. El deploy se dispara en cada push a `main`.
- **CI:** Prisma genera el cliente en postinstall, asegurando consistencia de tipos en producción.

## Tradeoffs y siguientes pasos

- **Rutas internas como proxy:** Para simplificar el manejo de CORS y cookies en este MVP, el frontend actúa como proxy hacia el backend.
- **Comparación lado a lado:** Actualmente el análisis es individual o por lista. Siguiente paso: vista “Versus” para comparar dos candidatos preseleccionados.
- **Observabilidad:** Logs básicos en Render/SendGrid. Próxima iteración: agregar Sentry + métricas de latencia para los llamados a IA.
- **Testing:** Se priorizó validación manual/E2E y tipado estricto sobre unit tests extensivos por la ventana de tiempo.
