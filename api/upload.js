import { handleUpload } from "@vercel/blob/client";
import { senhaConfere, esperar } from "./_auth.js";

// Gera a autorização pra enviar fotos direto do celular/computador pro Vercel Blob
// (assim fotos grandes não esbarram no limite de tamanho das funções).
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Pedido inválido" }, { status: 400 }); }
  try {
    const resposta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!senhaConfere(clientPayload)) { await esperar(800); throw new Error("Senha incorreta"); }
        if (!pathname.startsWith("galeria/")) throw new Error("Caminho não permitido");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(resposta);
  } catch (e) {
    return Response.json({ error: e.message || "Erro no envio" }, { status: 400 });
  }
}
