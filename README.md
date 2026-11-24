# AnimeTok AI

Aplicación web (pensada primero para móvil e instalable como PWA) para explorar anime con AniList y generar guiones cortos para TikTok con IA: hook, narración, plan visual, CTA, caption, hashtags, palabras clave SEO y el mejor momento para publicar, usando datos de tendencia reales.

## Stack
- Frontend: React 18, Vite, TypeScript, Tailwind CSS 4, React Router, Motion.
- UI: componentes de [Magic UI](https://magicui.design) y [Aceternity UI](https://ui.aceternity.com) (instalados con el CLI de shadcn en `frontend/src/components/ui`) e iconos de `react-icons`.
- Backend: Node.js, Express, TypeScript, Zod, Helmet, rate limiting.
- Anime y tendencias: AniList GraphQL (API pública, sin clave).
- IA: Google Gemini (`@google/genai`) con respaldo automático en NVIDIA Build (Nemotron y Gemma 4) y modelos gratuitos de OpenRouter.
- Persistencia preparada: PostgreSQL + Prisma (esquema incluido).

## Requisitos
- Node.js 20+
- Al menos una clave de Google AI Studio, NVIDIA Build u OpenRouter.
- PostgreSQL si quieres habilitar persistencia.

## Inicio rápido
1. Copia `backend/.env.example` a `backend/.env`.
2. Configura al menos una clave: `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_GEMMA_API_KEY` u `OPENROUTER_API_KEY`. Por defecto se prueba Gemini → NVIDIA Nemotron → NVIDIA Gemma → OpenRouter, omitiendo proveedores sin clave; el orden se cambia en **Ajustes → Prioridad de IA**.
3. Crea tu usuario y contraseña: `npm run set-password -w backend` (guarda solo el hash en `backend/.env`).
4. Ejecuta `npm install`.
5. Ejecuta `npm run dev`.
6. Frontend: http://localhost:5173 · API: http://localhost:4000/api/health

Tras cambiar `backend/.env`, reinicia `npm run dev` (el modo watch no vuelve a leer el `.env`).

## Despliegue en Netlify
El repositorio incluye `netlify.toml`: el frontend se publica como sitio estático y todo el backend Express corre como una Netlify Function (`netlify/functions/api.ts`) en `/api/*`, en el mismo dominio.

1. Netlify → **Add new project → Import an existing project → GitHub** y elige este repositorio. La configuración de build se lee de `netlify.toml`.
2. En **Site configuration → Environment variables** añade `APP_USER`, `APP_PASSWORD_HASH` y `AUTH_SECRET` (los imprime `npm run set-password -w backend`) y las claves de los proveedores elegidos: `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_GEMMA_API_KEY` y/o `OPENROUTER_API_KEY` (y el resto de variables de `backend/.env.example` si quieres cambiar sus valores). No definas `VITE_API_URL`.
3. Despliega. Comprueba `https://TU-SITIO.netlify.app/api/health`.

Las funciones de Netlify cortan a los 60 s: por eso la cadena de modelos tiene un presupuesto total (`AI_TOTAL_TIMEOUT_MS`, 50 s por defecto).

## Variables
- `GEMINI_API_KEY` / `NVIDIA_API_KEY` / `NVIDIA_GEMMA_API_KEY` / `OPENROUTER_API_KEY`: nunca deben incluirse en el frontend ni en variables `VITE_`.
- `GEMINI_MODEL` y `GEMINI_FALLBACK_MODELS`: modelos de Gemini en orden de preferencia.
- `NVIDIA_MODEL`: modelo de NVIDIA Build (por defecto `nvidia/nemotron-3.5-bolt-e4b`), después de Gemini. Usa JSON sin streaming y sin razonamiento para reducir la latencia.
- `NVIDIA_GEMMA_MODEL`: modelo de Gemma en NVIDIA Build (por defecto `google/gemma-4-31b-it`). Usa su propia clave `NVIDIA_GEMMA_API_KEY` y se prueba después de Nemotron, incluso si es el único proveedor configurado.
- `OPENROUTER_MODELS`: modelos de OpenRouter que se prueban si fallan Gemini y NVIDIA.
- `AI_TOTAL_TIMEOUT_MS`: presupuesto compartido de toda la cadena; si se agota, no se prueban los modelos restantes.
- `AI_PROVIDER_ORDER`: orden de prioridad por defecto (`gemini,nemotron,gemma,openrouter`). Desde **Ajustes → Prioridad de IA** se puede reordenar por dispositivo; los servicios no listados se añaden al final como respaldo.
- `AI_PROVIDER_TIMEOUT_MS` (25 s): tiempo máximo por servicio, sumando sus modelos, antes de pasar al siguiente.
- `AI_COOLDOWN_MS` (3 min): si un servicio está saturado (429/503) o no responde, queda en pausa y pasa al final de la cola. Ajustes muestra qué servicios están en pausa.
- `GEMINI_TIMEOUT_MS`: tiempo máximo por intento antes de pasar al siguiente modelo.
- `CLIENT_ORIGIN`: origen exacto del frontend en producción.

## Login
La app es privada para un solo usuario: toda la API (salvo `/api/health` y `/api/auth/*`) exige sesión. La contraseña se guarda como hash scrypt, la sesión es una cookie HttpOnly firmada (30 días) y el login admite 10 intentos fallidos cada 15 minutos por IP. Si falta la configuración, la API queda cerrada.

## Buscador de escenas
Pestaña **Escenas**: clips de Sakugabooru por anime y tipo de escena (peleas, efectos, llanto…), miniaturas reales de cada episodio con el minuto exacto y clip vía [trace.moe](https://trace.moe), escenas de personajes en Dailymotion (API pública, sin clave ni tarjeta) e identificación de capturas. Dailymotion solo deja incrustar vídeos con un reproductor propio: sin `DAILYMOTION_PLAYER_ID` (cuenta gratuita de Dailymotion Studio) cada clip se abre en Dailymotion. Con `YOUTUBE_API_KEY` se usa YouTube y, si falla o agota la cuota, Dailymotion. trace.moe se llama desde el navegador (100 búsquedas gratis al mes por IP).

## Endpoints
- `GET /api/health`
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET /api/news?lang=es|en|all&q=` (Crunchyroll Noticias, Ramen Para Dos, Anime News Network, MyAnimeList)
- `GET /api/anime/genres`
- `GET /api/anime/:id/news`
- `GET /api/scenes/sakuga?animeId=&type=&page=` (clips de Sakugabooru por anime y tipo de escena)
- `GET /api/scenes/episodes?animeId=` (miniaturas de episodios y tráiler, de AniList)
- `GET /api/scenes/videos?anime=&character=` (clips de un personaje: Dailymotion, o YouTube si hay `YOUTUBE_API_KEY`)
- `GET /api/anime/search?q=&genre=&year=&season=&format=&status=&sort=&page=` (el texto es opcional)
- `GET /api/anime/trending`
- `GET /api/anime/:id`
- `GET /api/anime/:id/trends`
- `POST /api/scripts/generate`

## Estado del proyecto
Incluye navegación móvil con barra de pestañas, inicio con animes en tendencia, búsqueda en AniList, ficha de anime, panel de tendencias, generación con 23 tipos de contenido (qué cuentas: análisis de la serie o de un personaje, Top 3/5/7/10 de personajes, villanos, peleas…, curiosidades y anécdotas, etc.) y 32 tonos independientes (cómo lo cuentas: cálido, filosófico, frío, eufórico, carismático, alegre…), personaje central opcional, voz del narrador (género, edad, variante del español, público y estilo de narración), longitud por caracteres (300–1500), noticias de anime y login privado, además de validación y protecciones HTTP básicas. La biblioteca persistente y el login todavía no están conectados: el esquema Prisma es la base para implementarlos.

TikTok no ofrece una API pública gratuita de tendencias: las señales de tendencia vienen de AniList y el panel enlaza al TikTok Creative Center para revisar hashtags manualmente.

## Producción: antes de publicar
Este repositorio es una base funcional de desarrollo, no un despliegue certificado. Antes de producción:
- Configura HTTPS, secretos del proveedor y `CLIENT_ORIGIN`.
- Añade autenticación (Supabase Auth recomendado) y autorización por usuario.
- Conecta Prisma a PostgreSQL y crea migraciones.
- Implementa persistencia de guiones, cuotas por usuario, observabilidad y alertas.
- Revisa términos, atribución, caché y límites de AniList y Google.
- Añade pruebas automatizadas, revisión de seguridad y política de privacidad.
- No uses imágenes o fragmentos de anime sin los derechos necesarios.

## Datos
AniList es un catálogo externo, no una garantía de que exista literalmente todo anime publicado. La ficha muestra únicamente campos disponibles en la API. Los resultados pueden cambiar y no deben tratarse como una fuente oficial de derechos o disponibilidad de streaming.
