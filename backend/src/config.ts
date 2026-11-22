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
  OPENROUTER_API_KEY: z.string().optional().transform((v) => v || undefined),
  OPENROUTER_MODELS: z.string().default("google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,openrouter/free"),
});
export const config = schema.parse(process.env);
