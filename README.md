# Zendesk Proxy — Vercel

Proxy serverless que resolve o bloqueio de CORS ao chamar a API do Zendesk direto do browser.

## Deploy em 3 passos

### 1. Instale a CLI do Vercel
```bash
npm install -g vercel
```

### 2. Faça o deploy
Na pasta do projeto:
```bash
vercel
```
Responda as perguntas:
- Set up and deploy? → **Y**
- Which scope? → escolha sua conta
- Link to existing project? → **N**
- Project name? → `zendesk-proxy` (ou qualquer nome)
- In which directory is your code? → **.** (Enter)
- Override settings? → **N**

O Vercel vai te dar uma URL como:
```
https://zendesk-proxy-seunome.vercel.app
```

### 3. Copie a URL e cole no painel
No painel de agentes Zendesk, cole a URL do proxy no campo **URL do Proxy**.

---

## Como funciona

O painel envia as credenciais via headers HTTP (nunca na URL):
- `x-zendesk-subdomain` — seu subdomínio
- `x-zendesk-email` — seu e-mail
- `x-zendesk-token` — seu API token

O proxy repassa a chamada ao Zendesk com autenticação Basic Auth e retorna a resposta.

## Endpoint

```
GET/POST/PUT  https://seu-proxy.vercel.app/api/zendesk?path=/tickets.json
```

## Segurança em produção

Para restringir o acesso ao seu painel, edite o header `Access-Control-Allow-Origin` em `api/zendesk.js`:

```js
// Trocar '*' pela URL do seu painel
res.setHeader('Access-Control-Allow-Origin', 'https://claude.ai');
```
