import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // En local, /api va al backend (mismo origen que en Netlify: la cookie de sesión funciona igual)
  server: { port: 5173, proxy: { "/api": "http://localhost:4000" } },
  preview: { port: 4173 },
});
