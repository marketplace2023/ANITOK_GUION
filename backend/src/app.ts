import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { providerStatus } from "./ai.js";
import { authConfigured, authRouter, requireAuth, sessionUser } from "./auth.js";
import animeRouter from "./routes/anime.js";
import scriptsRouter from "./routes/scripts.js";
import newsRouter from "./routes/news.js";

// La app Express sin listen(): la usan el servidor local (server.ts)
// y la Netlify Function (netlify/functions/api.ts).
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // detrás del proxy de Netlify: IP real y HTTPS
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true, methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "30kb" }));

const api = express.Router();
// Netlify pasa la IP real del visitante en x-nf-client-connection-ip; en local usamos req.ip.
const clientIp = (req: express.Request) =>
  String(req.headers["x-nf-client-connection-ip"] || req.ip || req.headers["x-forwarded-for"] || "anon").split(",")[0].trim();
api.use(rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: "draft-7", legacyHeaders: false, keyGenerator: clientIp }));

// Públicas: estado y login. Los detalles de proveedores solo con sesión iniciada.
api.get("/health", (req, res) => res.json({
  status: "ok", service: "animetok-api", auth: authConfigured() ? "configured" : "missing",
  ...(sessionUser(req) ? { providers: providerStatus() } : {}),
}));
api.use("/auth", authRouter);

// Todo lo demás exige sesión
api.use(requireAuth);
api.use("/anime", animeRouter);
api.use("/news", newsRouter);
api.use("/scripts", scriptsRouter);
api.use((_req, res) => res.status(404).json({ error: "Ruta de API no encontrada." }));

// En Netlify la petición puede llegar como /api/... o como /.netlify/functions/api/...
app.use(["/api", "/.netlify/functions/api"], api);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Ocurrió un error interno." });
});
