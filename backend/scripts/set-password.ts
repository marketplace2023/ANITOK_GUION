// Configura el login: npm run set-password -w backend
// Pide usuario y contraseña, y guarda en backend/.env APP_USER, APP_PASSWORD_HASH y AUTH_SECRET.
// La contraseña nunca se guarda en texto plano, solo su hash scrypt.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../src/auth.js";

// Terminal interactiva: la contraseña no se muestra al escribir.
// Entrada por tubería (scripts/CI): se leen las líneas en orden.
async function readInputs(): Promise<[string, string]> {
  if (!stdin.isTTY) {
    const lines: string[] = [];
    for await (const line of createInterface({ input: stdin })) lines.push(line);
    return [lines[0] ?? "", lines[1] ?? ""];
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const user = await new Promise<string>((resolve) => rl.question(`Usuario [${current("APP_USER") || "admin"}]: `, resolve));
  rl.close();
  stdout.write("Contraseña (mínimo 10 caracteres, no se mostrará): ");
  const password = await new Promise<string>((resolve) => {
    let pw = "";
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false); stdin.pause(); stdin.off("data", onData); stdout.write("\n");
          return resolve(pw);
        }
        if (ch === "\u0003") { stdout.write("\n"); process.exit(1); } // Ctrl+C
        if (ch === "\u007f" || ch === "\b") pw = pw.slice(0, -1);
        else pw += ch;
      }
    };
    stdin.on("data", onData);
  });
  return [user, password];
}

const envPath = new URL("../.env", import.meta.url);
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
function current(k: string) { return env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim() ?? ""; }
const setVar = (k: string, v: string) => {
  const re = new RegExp(`^${k}=.*$`, "m");
  env = re.test(env) ? env.replace(re, () => `${k}=${v}`) : `${env.replace(/\s*$/, "")}\n${k}=${v}\n`;
};

const [userInput, password] = await readInputs();
const user = (userInput.trim() || current("APP_USER") || "admin").toLowerCase();
if (password.length < 10) { console.error("✗ La contraseña debe tener al menos 10 caracteres. No se ha guardado nada."); process.exit(1); }

const hash = hashPassword(password);
const secret = current("AUTH_SECRET").length >= 32 ? current("AUTH_SECRET") : randomBytes(32).toString("hex");
if (!/^APP_PASSWORD_HASH=/m.test(env)) env = `${env.replace(/\s*$/, "")}\n\n# Login (generado con npm run set-password -w backend)\n`;
setVar("APP_USER", user);
setVar("APP_PASSWORD_HASH", hash);
setVar("AUTH_SECRET", secret);
writeFileSync(envPath, env);

console.log(`\n✓ Login guardado en backend/.env para el usuario "${user}".`);
console.log("  Reinicia npm run dev para aplicarlo.\n");
console.log("Para Netlify, añade estas 3 variables en Site configuration → Environment variables:");
console.log(`  APP_USER=${user}`);
console.log(`  APP_PASSWORD_HASH=${hash}`);
console.log(`  AUTH_SECRET=${secret}`);
