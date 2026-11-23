import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_FALLBACK_MODELS: z.string().default("gemini-3.6-flash,gemini-3.1-flash-lite"),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_TOTAL_TIMEOUT_MS: z.coerce.number().default(50000),
  NVIDIA_API_KEY: z.string().optional().transform((v) => v || undefined),
  NVIDIA_MODEL: z.string().default("nvidia/nemotron-3.5-bolt-e4b"),
  NVIDIA_GEMMA_API_KEY: z.string().optional().transform((v) => v || undefined),
  NVIDIA_GEMMA_MODEL: z.string().default("google/gemma-4-31b-it"),
  OPENROUTER_API_KEY: z.string().optional().transform((v) => v || undefined),
  OPENROUTER_MODELS: z.string().default("google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,openrouter/free"),
  // Login de un solo usuario. Genera los valores con: npm run set-password -w backend
  APP_USER: z.string().default("admin"),
  APP_PASSWORD_HASH: z.string().optional().transform((v) => v || undefined),
  AUTH_SECRET: z.string().optional().transform((v) => v || undefined),
  SESSION_DAYS: z.coerce.number().default(30),
});
export const config = schema.parse(process.env);
