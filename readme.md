# Resolvit

Crea planes de invitación con preguntas personalizadas. Cada invitado elige opciones y recibe un mensaje único según sus respuestas.

**Dominio:** [resolvit.app](https://resolvit.app)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion |
| Backend | Cloudflare Workers (TypeScript) |
| Base de datos | Supabase (Postgres + Auth + RLS) |
| Hosting | Cloudflare Pages (assets SPA) + Workers (API) |
| Dominio | resolvit.app (Cloudflare DNS) |

---

## Estructura

```
src/
  main.tsx          Entry point
  index.css         Tailwind imports
  App.tsx           App completa (componentes, routing, estado)

worker/
  worker.ts         Backend Cloudflare Worker (API + short links + OG)

public/
  favicon, manifest, PWA icons

wrangler.jsonc      Configuración Cloudflare Worker + assets
vite.config.ts      Build Vite
```

---

## Modelo de datos

```
Plan
  id, title, person_name, status (draft | published)
  background_image_url, start_question_id
  invite_title_template, invite_body_template
  user_id, created_at

Question
  id, plan_id (FK), ord, title, subtitle

Option
  id, question_id (FK), ord, label, image_url
  next_question_id (FK → question, nullable = fin del árbol)

Invite
  plan_id (FK), code (único), is_active, expires_at

Submission
  plan_id, voter_name, user_agent
  answers (jsonb: { question_id: option_id })
  invitation_text (generado por RPC)
```

**Flujo:** cada pregunta es un nodo, sus opciones son edges. `next_question_id` determina la pregunta siguiente. Cuando es `null` se alcanza una hoja del árbol y termina el recorrido.

---

## API

### Públicas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/public/plan/:code` | Obtener plan + preguntas + opciones |
| POST | `/api/public/submit/:code` | Enviar respuestas y obtener mensaje |

### Privadas (requieren Bearer token de Supabase Auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/private/plan` | Crear plan |
| GET | `/api/private/plans` | Listar planes del usuario |
| GET | `/api/private/plan/:id/builder` | Plan + preguntas + opciones |
| GET | `/api/private/plan/:id/full` | Plan + preguntas + opciones + invite |
| PATCH | `/api/private/plan/:id` | Editar metadatos del plan |
| PATCH | `/api/private/plan/:id/publish` | Publicar y generar código |
| PATCH | `/api/private/plan/:id/templates` | Editar plantillas de mensaje |
| DELETE | `/api/private/plan/:id` | Eliminar plan completo |
| POST | `/api/private/question` | Crear pregunta |
| PATCH | `/api/private/question/:id` | Editar pregunta |
| DELETE | `/api/private/question/:id` | Eliminar pregunta |
| POST | `/api/private/options2` | Crear 2 opciones para una pregunta |
| PATCH | `/api/private/option/:id` | Editar opción |
| GET | `/api/private/plan/:id/stats` | Estadísticas de respuestas |

### Short links
| Ruta | Comportamiento |
|------|---------------|
| `GET /i/:code` | Bots → OG tags (WhatsApp, Twitter, etc). Usuarios → redirect a `/invite/:code` |

---

## Desarrollo

```bash
npm install
npm run dev         # Vite dev server (frontend)
npm run build       # Build SPA en dist/
wrangler dev        # Worker local (lee assets de dist/)
```

### Deploy

```bash
npm run build
wrangler deploy
```

---

## Seguridad

- Toda la lógica sensible (validación de caminos, generación de mensajes) corre en RPCs de Postgres con `security definer`.
- Las rutas privadas requieren token JWT de Supabase Auth.
- RLS en todas las tablas filtra por `user_id`.
- El worker nunca expone la service key al frontend.
- El backend valida que las respuestas sigan un camino real (evita inventar opciones).
- Detección de ciclos en el grafo de preguntas.

---

## Roadmap / visión

- [ ] Opciones múltiples por pregunta (actualmente 2 fijas).
- [ ] Sistema de árbol real: las preguntas siguientes cambian según las elecciones anteriores (usando `next_question_id`).
- [ ] Pantalla principal con plantillas de invitación que rotan según la temporada (San Valentín, Día del Padre, Mundial, etc.).
- [ ] Refactor: separar componentes monolíticos (`App.tsx` + `worker.ts`) en módulos más pequeños.

---

## Issues conocidos

- Ruta `/api/private/plan/:id/stats` duplicada en `worker.ts`.
- Función `patchPlan` duplicada en `App.tsx`.
- `start_question_id` en la tabla `plans` sin uso real.
- `next_question_id` subutilizado (las preguntas se recorren por `ord` linealmente).
- `wrangler` no incluido en `devDependencies`.
- `authedFetch` duplicado en 3 componentes.
