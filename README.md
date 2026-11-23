# AnimeTok AI

Aplicación web (pensada primero para móvil e instalable como PWA) para explorar anime con AniList y generar guiones cortos para TikTok con IA: hook, narración, plan visual, CTA, caption, hashtags, palabras clave SEO y el mejor momento para publicar, usando datos de tendencia reales.

## Stack
- Frontend: React 18, Vite, TypeScript, Tailwind CSS 4, React Router, Motion.
- UI: componentes de [Magic UI](https://magicui.design) y [Aceternity UI](https://ui.aceternity.com) (instalados con el CLI de shadcn en `frontend/src/components/ui`) e iconos de `react-icons`.
- Backend: Node.js, Express, TypeScript, Zod, Helmet, rate limiting.
- Anime y tendencias: AniList GraphQL (API pública, sin clave).
- IA: Google Gemini (`@google/genai`) con respaldo automático en modelos gratuitos de OpenRouter.
- Persistencia preparada: PostgreSQL + Prisma (esquema incluido).

## Requisitos
- Node.js 20+
- Una clave de Google AI Studio y/o una clave de OpenRouter.
- PostgreSQL si quieres habilitar persistencia.

## Inicio rápido
1. Copia `backend/.env.example` a `backend/.env`.
2. Añade `GEMINI_API_KEY` y, opcionalmente, `OPENROUTER_API_KEY` (respaldo cuando se agota la cuota de Gemini).
3. Crea tu usuario y contraseña: `npm run set-password -w backend` (guarda solo el hash en `backend/.env`).
4. Ejecuta `npm install`.
5. Ejecuta `npm run dev`.
6. Frontend: http://localhost:5173 · API: http://localhost:4000/api/health

Tras cambiar `backend/.env`, reinicia `npm run dev` (el modo watch no vuelve a leer el `.env`).

## Despliegue en Netlify
El repositorio incluye `netlify.toml`: el frontend se publica como sitio estático y todo el backend Express corre como una Netlify Function (`netlify/functions/api.ts`) en `/api/*`, en el mismo dominio.

1. Netlify → **Add new project → Import an existing project → GitHub** y elige este repositorio. La configuración de build se lee de `netlify.toml`.
2. En **Site configuration → Environment variables** añade `APP_USER`, `APP_PASSWORD_HASH` y `AUTH_SECRET` (los imprime `npm run set-password -w backend`), `GEMINI_API_KEY` y, opcionalmente, `OPENROUTER_API_KEY` (y el resto de variables de `backend/.env.example` si quieres cambiar sus valores). No definas `VITE_API_URL`.
3. Despliega. Comprueba `https://TU-SITIO.netlify.app/api/health`.

Las funciones de Netlify cortan a los 60 s: por eso la cadena de modelos tiene un presupuesto total (`AI_TOTAL_TIMEOUT_MS`, 50 s por defecto).

## Variables
- `GEMINI_API_KEY` / `OPENROUTER_API_KEY`: nunca deben incluirse en el frontend ni en variables `VITE_`.
- `GEMINI_MODEL` y `GEMINI_FALLBACK_MODELS`: modelos de Gemini en orden de preferencia.
- `OPENROUTER_MODELS`: modelos de OpenRouter que se prueban si fallan todos los de Gemini.
- `GEMINI_TIMEOUT_MS`: tiempo máximo por intento antes de pasar al siguiente modelo.
- `CLIENT_ORIGIN`: origen exacto del frontend en producción.

## Login
La app es privada para un solo usuario: toda la API (salvo `/api/health` y `/api/auth/*`) exige sesión. La contraseña se guarda como hash scrypt, la sesión es una cookie HttpOnly firmada (30 días) y el login admite 10 intentos fallidos cada 15 minutos por IP. Si falta la configuración, la API queda cerrada.

## Endpoints
- `GET /api/health`
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET /api/news?lang=es|en|all&q=` (Crunchyroll Noticias, Ramen Para Dos, Anime News Network, MyAnimeList)
- `GET /api/anime/genres`
- `GET /api/anime/:id/news`
- `GET /api/anime/search?q=&genre=&year=&season=&format=&status=&sort=&page=` (el texto es opcional)
- `GET /api/anime/trending`
- `GET /api/anime/:id`
- `GET /api/anime/:id/trends`
- `POST /api/scripts/generate`

## Estado del proyecto
Incluye navegación móvil con barra de pestañas, inicio con animes en tendencia, búsqueda en AniList, ficha de anime, panel de tendencias, generación con 19 tipos de contenido, 25 tonos, voz del narrador (género, edad, variante del español, público y estilo de narración), longitud por caracteres (300–1500), noticias de anime y login privado, además de validación y protecciones HTTP básicas. La biblioteca persistente y el login todavía no están conectados: el esquema Prisma es la base para implementarlos.

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
