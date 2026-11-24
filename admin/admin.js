// Painel da Luana: adicionar, remover, reordenar e dar nome às fotos da galeria.
// A senha é conferida no servidor (variável ADMIN_PASSWORD na Vercel) — nunca fica neste arquivo.
import { upload } from "./blob-client.js";

const MAX_LADO = 2400;      // lado maior da foto exibida no site (nítida em qualquer tela)
const QUALIDADE = 0.9;      // qualidade da versão exibida; o arquivo original também é guardado

let senha = "";
let itens = [];
let raiz;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function estilos() {
  if (document.getElementById("adm-css")) return;
  const st = document.createElement("style");
  st.id = "adm-css";
  st.textContent = `
  .adm{position:fixed;inset:0;z-index:200;background:rgba(60,22,38,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px}
  .adm-box{width:min(760px,100%);max-height:92svh;overflow:auto;background:#fffafb;border-radius:24px;box-shadow:0 30px 70px -20px rgba(60,22,38,.6);padding:24px;font-family:'Urbanist',system-ui,sans-serif;color:#5b3a46}
  .adm h2{font-family:'DM Serif Display',serif;font-weight:400;color:#9e4466;font-size:28px;margin:0 0 4px}
  .adm p.s{font-size:14px;color:#8d6874;margin:0 0 18px}
  .adm input[type=password],.adm input[type=text]{width:100%;padding:12px 14px;border-radius:12px;border:1px solid #ecd0d7;background:#fff;font:inherit;font-size:15px;color:inherit;outline:none}
  .adm input:focus{border-color:#c25a7c;box-shadow:0 0 0 3px rgba(194,90,124,.12)}
  .adm .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}
  .adm button{font:inherit;cursor:pointer;border:0;border-radius:999px;padding:11px 18px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
  .adm .pri{background:linear-gradient(100deg,#c25a7c,#9e4466);color:#fff}
  .adm .sec{background:#fff;color:#9e4466;border:1px solid #efcfd7}
  .adm .msg{font-size:13.5px;margin-top:12px;min-height:1.2em}
  .adm .msg.err{color:#b0304f}.adm .msg.ok{color:#3c7a52}
  .adm-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:6px}
  .adm-it{background:#fff;border:1px solid #f0d6dc;border-radius:16px;padding:8px;display:flex;flex-direction:column;gap:6px}
  .adm-it img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#f6e3e7}
  .adm-it input{padding:8px 10px!important;font-size:13px!important}
  .adm-it .ctr{display:flex;gap:4px;justify-content:space-between}
  .adm-it .ctr button{padding:7px 10px;font-size:14px;background:#fbe9ec;color:#9e4466;letter-spacing:0}
  .adm-it .ctr .rm{background:#fdecef;color:#b0304f}
  .adm-up{display:inline-flex;align-items:center;gap:8px}
  .adm-up input{display:none}
  .adm .bar{height:4px;border-radius:4px;background:#f3d9df;overflow:hidden;margin-top:10px;display:none}
  .adm .bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#c8a27c,#c25a7c);transition:width .2s linear}
  .adm .x{float:right;background:none;color:#9e4466;font-size:26px;padding:0 4px;line-height:1}
  `;
  document.head.appendChild(st);
}

function fechar() { raiz?.remove(); raiz = null; }

function abrirLogin() {
  estilos();
  fechar();
  raiz = document.createElement("div");
  raiz.className = "adm";
  raiz.innerHTML = `
    <form class="adm-box" autocomplete="off">
      <button type="button" class="x" aria-label="Fechar">×</button>
      <h2>Área da Behly</h2>
      <p class="s">Digite sua senha pra editar as fotos da galeria.</p>
      <input type="password" placeholder="Senha" autocomplete="current-password" required>
      <div class="row"><button class="pri" type="submit">Entrar</button></div>
      <div class="msg"></div>
    </form>`;
  document.body.appendChild(raiz);
  const form = raiz.querySelector("form"), inp = raiz.querySelector("input"), msg = raiz.querySelector(".msg");
  raiz.querySelector(".x").onclick = fechar;
  raiz.addEventListener("click", (e) => { if (e.target === raiz) fechar(); });
  inp.focus();
  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.className = "msg"; msg.textContent = "Conferindo…";
    try {
      const r = await fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: inp.value, action: "check" }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { msg.className = "msg err"; msg.textContent = j.error || "Não foi possível entrar."; return; }
      senha = inp.value;
      itens = Array.isArray(j.items) && j.items.length ? j.items : padrao();
      abrirPainel();
    } catch {
      msg.className = "msg err"; msg.textContent = "Sem conexão com o servidor.";
    }
  };
}

// fotos que já estão no site (usadas na primeira vez, antes de existir uma galeria salva)
function padrao() {
  return [...document.querySelectorAll("#portfolio .gallery .g img")].map((im) => ({ src: im.getAttribute("src"), nome: im.alt }));
}

function abrirPainel() {
  raiz.innerHTML = `
    <div class="adm-box">
      <button type="button" class="x" aria-label="Fechar">×</button>
      <h2>Galeria — Meus trabalhos</h2>
      <p class="s">Adicione, remova, mude a ordem e dê nome às fotos. Depois toque em <b>Salvar</b>.</p>
      <div class="adm-list"></div>
      <div class="bar"><span></span></div>
      <div class="row">
        <label class="adm-up sec" style="border-radius:999px;padding:11px 18px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">
          + Adicionar fotos<input type="file" accept="image/*" multiple>
        </label>
        <button class="pri salvar" type="button">Salvar galeria</button>
      </div>
      <div class="msg"></div>
    </div>`;
  raiz.querySelector(".x").onclick = fechar;
  raiz.querySelector("input[type=file]").onchange = (e) => adicionar([...e.target.files]);
  raiz.querySelector(".salvar").onclick = salvar;
  desenhar();
}

function desenhar() {
  const lista = raiz.querySelector(".adm-list");
  lista.innerHTML = itens.map((it, i) => `
    <div class="adm-it">
      <img src="${esc(it.src)}" alt="">
      <input type="text" value="${esc(it.nome)}" placeholder="Nome do trabalho" data-i="${i}">
      <div class="ctr">
        <button type="button" data-a="up" data-i="${i}" title="Mover pra frente">←</button>
        <button type="button" data-a="down" data-i="${i}" title="Mover pra trás">→</button>
        <button type="button" class="rm" data-a="rm" data-i="${i}" title="Remover">✕</button>
      </div>
    </div>`).join("") || `<p class="s">Nenhuma foto. Toque em “Adicionar fotos”.</p>`;
  lista.querySelectorAll("input[type=text]").forEach((inp) => (inp.oninput = () => (itens[+inp.dataset.i].nome = inp.value)));
  lista.querySelectorAll("button[data-a]").forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (b.dataset.a === "rm") itens.splice(i, 1);
    if (b.dataset.a === "up" && i > 0) [itens[i - 1], itens[i]] = [itens[i], itens[i - 1]];
    if (b.dataset.a === "down" && i < itens.length - 1) [itens[i + 1], itens[i]] = [itens[i], itens[i + 1]];
    desenhar();
  }));
}

async function versaoSite(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, "image/webp", QUALIDADE));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
  return blob;
}

async function adicionar(files) {
  const msg = raiz.querySelector(".msg"), bar = raiz.querySelector(".bar"), barIn = bar.querySelector("span");
  if (!files.length) return;
  bar.style.display = "block";
  let feitos = 0;
  for (const file of files) {
    msg.className = "msg"; msg.textContent = `Enviando ${feitos + 1} de ${files.length}…`;
    try {
      const site = await versaoSite(file);
      const id = Date.now().toString(36);
      const ext = site.type === "image/webp" ? "webp" : "jpg";
      const extOrig = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const exibida = await upload(`galeria/${id}.${ext}`, site, { access: "public", handleUploadUrl: "/api/upload", clientPayload: senha, contentType: site.type });
      const original = await upload(`galeria/originais/${id}.${extOrig}`, file, { access: "public", handleUploadUrl: "/api/upload", clientPayload: senha, contentType: file.type || undefined });
      itens.push({ src: exibida.url, full: original.url, nome: "" });
      desenhar();
    } catch (e) {
      msg.className = "msg err";
      msg.textContent = /createImageBitmap|decode|source image/i.test(String(e))
        ? `Não consegui abrir “${file.name}”. Tente enviar em JPG.`
        : `Erro ao enviar “${file.name}”: ${e.message || e}`;
    }
    feitos++;
    barIn.style.width = `${(feitos / files.length) * 100}%`;
  }
  if (!msg.classList.contains("err")) { msg.className = "msg ok"; msg.textContent = "Fotos enviadas! Dê nome a elas e toque em Salvar."; }
  setTimeout(() => { bar.style.display = "none"; barIn.style.width = "0"; }, 800);
}

async function salvar() {
  const msg = raiz.querySelector(".msg");
  msg.className = "msg"; msg.textContent = "Salvando…";
  try {
    const r = await fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: senha, action: "save", items: itens }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Não foi possível salvar.");
    msg.className = "msg ok"; msg.textContent = "Galeria salva! Atualizando o site…";
    setTimeout(() => location.reload(), 900);
  } catch (e) {
    msg.className = "msg err"; msg.textContent = e.message;
  }
}

export function abrir() { abrirLogin(); }
