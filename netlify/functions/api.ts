// Netlify Function que ejecuta todo el backend Express.
// netlify.toml redirige /api/* hacia aquí; las claves se configuran en
// Netlify → Site configuration → Environment variables (no en archivos).
import serverless from "serverless-http";
import { app } from "../../backend/src/app.js";

export const handler = serverless(app);
