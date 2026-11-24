# Behly Nails — site

Site da Behly Nails (nail designer, Florianópolis), hospedado na Vercel.

## Estrutura
- `index.html` — o site inteiro (uma página)
- `*.webp`, `gal/`, `sobre/` — imagens
- `admin/` — painel da Luana (abre pelo cadeado discreto no rodapé)
- `api/gallery.js` — lê/salva a galeria (protegido por senha)
- `api/upload.js` — autoriza o envio de fotos pro Vercel Blob

## Configuração na Vercel (uma vez só)
1. **Storage → Create → Blob** (escolha acesso *Public*) e conecte ao projeto. Isso cria a variável `BLOB_READ_WRITE_TOKEN` sozinho.
2. **Settings → Environment Variables → `ADMIN_PASSWORD`** = a senha da Luana.
3. **Deployments → Redeploy** pra valer as mudanças.

A senha nunca fica no código: só na variável `ADMIN_PASSWORD`. Pra trocar a senha, mude a variável e faça um redeploy.
