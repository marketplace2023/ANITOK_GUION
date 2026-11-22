import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { providerStatus } from "./ai.js";
import animeRouter from "./routes/anime.js";
import scriptsRouter from "./routes/scripts.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN, methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "30kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "animetok-api", providers: providerStatus() }));
app.use("/api/anime", animeRouter);
app.use("/api/scripts", scriptsRouter);
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Ocurrió un error interno." });
});
app.listen(config.PORT, () => console.log(`AnimeTok API listening on :${config.PORT}`));
