import { createHash, timingSafeEqual } from "node:crypto";

// A senha fica SÓ na variável de ambiente ADMIN_PASSWORD da Vercel (nunca no código do site).
export function senhaConfere(tentativa) {
  const certa = process.env.ADMIN_PASSWORD || "";
  if (!certa || typeof tentativa !== "string" || !tentativa) return false;
  const a = createHash("sha256").update(tentativa).digest();
  const b = createHash("sha256").update(certa).digest();
  return timingSafeEqual(a, b);
}

// pequena pausa em senha errada, pra dificultar tentativa e erro
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
