import { put, list, del } from "@vercel/blob";
import { senhaConfere, esperar } from "./_auth.js";

const MANIFESTO = "galeria/gallery.json";
const semCache = { "Cache-Control": "no-store" };

async function lerManifesto() {
  const { blobs } = await list({ prefix: MANIFESTO, limit: 1 });
  const b = blobs.find((x) => x.pathname === MANIFESTO);
  if (!b) return null;
  const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return Array.isArray(j.items) ? j.items : null;
}

const ehDoBlob = (u) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u);
const ehPadrao = (u) => typeof u === "string" && /^gal\/t[0-9]+\.webp$/.test(u);

// GET: o site pergunta quais fotos mostrar
export async function GET() {
  try {
    const items = await lerManifesto();
    return Response.json({ items }, { headers: semCache });
  } catch {
    return Response.json({ items: null }, { headers: semCache });
  }
}

// POST: painel da Luana (conferir senha ou salvar a galeria)
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Pedido inválido" }, { status: 400 }); }
  if (!senhaConfere(body.password)) { await esperar(800); return Response.json({ error: "Senha incorreta" }, { status: 401 }); }

  if (body.action === "check") return Response.json({ ok: true, items: await lerManifesto().catch(() => null) }, { headers: semCache });

  if (body.action === "save") {
    const entrada = Array.isArray(body.items) ? body.items.slice(0, 60) : null;
    if (!entrada) return Response.json({ error: "Lista inválida" }, { status: 400 });
    const items = [];
    for (const it of entrada) {
      if (!(ehDoBlob(it.src) || ehPadrao(it.src))) continue;
      items.push({
        src: it.src,
        full: ehDoBlob(it.full) ? it.full : undefined,
        nome: String(it.nome || "").slice(0, 80),
      });
    }
    const anteriores = (await lerManifesto().catch(() => null)) || [];
    await put(MANIFESTO, JSON.stringify({ items, atualizado: new Date().toISOString() }), {
      access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
    });
    // apaga do armazenamento as fotos que ela removeu
    const ficam = new Set(items.flatMap((i) => [i.src, i.full]).filter(Boolean));
    const sair = anteriores.flatMap((i) => [i.src, i.full]).filter((u) => ehDoBlob(u) && !ficam.has(u));
    if (sair.length) await del(sair).catch(() => {});
    return Response.json({ ok: true, items }, { headers: semCache });
  }

  return Response.json({ error: "Ação desconhecida" }, { status: 400 });
}
