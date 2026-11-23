import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";

// Login de un solo usuario, sin base de datos:
// - la contraseña se guarda como hash scrypt en APP_PASSWORD_HASH ("salt:hash" en hex);
// - la sesión es una cookie HttpOnly firmada con HMAC (AUTH_SECRET), válida SESSION_DAYS días.
// Si falta la configuración, la API queda cerrada (nunca abierta por defecto).

const COOKIE = "animetok_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const authConfigured = () => Boolean(config.APP_PASSWORD_HASH && config.AUTH_SECRET && config.AUTH_SECRET.length >= 32);

function sign(payload: string) {
  return createHmac("sha256", config.AUTH_SECRET!).update(payload).digest("base64url");
}

function createToken(user: string) {
  const payload = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + config.SESSION_DAYS * 86_400_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token || !authConfigured()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u?: string; exp?: number };
    if (!data.u || !data.exp || data.exp < Date.now() || data.u !== config.APP_USER) return null;
    return data.u;
  } catch { return null; }
}

function cookieValue(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const sessionUser = (req: Request) => readToken(cookieValue(req));

function setCookie(req: Request, res: Response, value: string, maxAgeSec: number) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie", [
    `${COOKIE}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`, ...(secure ? ["Secure"] : []),
  ].join("; "));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!authConfigured()) return res.status(503).json({ error: "El login no está configurado en el servidor.", code: "AUTH_NOT_CONFIGURED" });
  if (!sessionUser(req)) return res.status(401).json({ error: "Inicia sesión para continuar.", code: "UNAUTHENTICATED" });
  next();
}

export const authRouter = Router();

// Frena ataques de fuerza bruta: 10 intentos fallidos cada 15 minutos por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (req) => String(req.headers["x-nf-client-connection-ip"] || req.ip || "anon"),
  message: { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." },
});

authRouter.post("/login", loginLimiter, (req, res) => {
  if (!authConfigured()) return res.status(503).json({ error: "El login no está configurado en el servidor.", code: "AUTH_NOT_CONFIGURED" });
  const parsed = z.object({ user: z.string().max(100), password: z.string().max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Escribe usuario y contraseña." });
  const okUser = safeEqual(parsed.data.user.trim().toLowerCase(), config.APP_USER.toLowerCase());
  const okPass = verifyPassword(parsed.data.password, config.APP_PASSWORD_HASH!);
  if (!okUser || !okPass) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  setCookie(req, res, createToken(config.APP_USER), config.SESSION_DAYS * 86_400);
  res.json({ user: config.APP_USER });
});

authRouter.post("/logout", (req, res) => {
  setCookie(req, res, "", 0);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  if (!authConfigured()) return res.status(503).json({ error: "El login no está configurado en el servidor.", code: "AUTH_NOT_CONFIGURED" });
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: "Inicia sesión para continuar.", code: "UNAUTHENTICATED" });
  res.json({ user });
});
