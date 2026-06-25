export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Panel-Password, X-Action');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticação por senha
  const panelPassword = process.env.PANEL_PASSWORD;
  const providedPassword = req.headers['x-panel-password'];
  if (panelPassword && providedPassword !== panelPassword) {
    return res.status(401).json({ error: 'Senha inválida.' });
  }

  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email     = process.env.ZENDESK_EMAIL;
  const token     = process.env.ZENDESK_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const zdAuth = Buffer.from(`${email}/token:${token}`).toString('base64');
  const zdHeaders = { 'Content-Type': 'application/json', 'Authorization': `Basic ${zdAuth}` };

  const action = req.headers['x-action'];

  // Ação: chamada à API da Anthropic (evita CORS no browser)
  if (action === 'anthropic') {
    if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no Vercel.' });
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(req.body)
      });
      const d = await r.json();
      return res.status(r.status).json(d);
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Ação: busca RAG no Help Center
  if (action === 'rag-search') {
    const { query, max_articles = 5 } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Campo query obrigatório.' });
    try {
      const url = `https://${subdomain}.zendesk.com/api/v2/help_center/articles/search.json?query=${encodeURIComponent(query)}&locale=pt-br&per_page=${max_articles}`;
      const r = await fetch(url, { headers: zdHeaders });
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json(d);
      const articles = (d.results || []).map(a => ({
        id: a.id,
        title: a.title,
        snippet: a.snippet || '',
        url: a.html_url,
        body: a.body ? a.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().substring(0,1500) : ''
      }));
      return res.status(200).json({ articles });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Proxy padrão Zendesk
  if (!subdomain || !email || !token) {
    return res.status(500).json({ error: 'Credenciais Zendesk não configuradas.' });
  }

  const path = req.query.path || '/users/me.json';
  const url  = `https://${subdomain}.zendesk.com/api/v2${path}`;

  try {
    const r = await fetch(url, {
      method: req.method,
      headers: zdHeaders,
      body: ['POST','PUT','PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });
    const d = await r.json();
    return res.status(r.status).json(d);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
