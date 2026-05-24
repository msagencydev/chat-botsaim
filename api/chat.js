export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, model } = req.body;
  if (!messages || !model) return res.status(400).json({ error: 'Missing messages or model' });

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API_KEY not configured in environment' });

  // ── Anthropic models ──────────────────────────────────────────────────────
  const anthropicModels = ['claude-haiku-4-5-20251001', 'claude-opus-4-6'];

  if (anthropicModels.includes(model)) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 1024, messages }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Anthropic API error' });
    return res.status(200).json({ reply: data.content?.[0]?.text || '' });
  }

  // ── DeepSeek models ───────────────────────────────────────────────────────
  const deepseekMap = {
    'deepseek-v4-flash': 'deepseek-chat',
    'deepseek-v4-pro':   'deepseek-reasoner',
  };

  if (deepseekMap[model]) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: deepseekMap[model],
        max_tokens: 1024,
        messages,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'DeepSeek API error' });
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || '' });
  }

  // ── GLM model ─────────────────────────────────────────────────────────────
  if (model === 'glm-5.1') {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: 'glm-4-flash', max_tokens: 1024, messages }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'GLM API error' });
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || '' });
  }

  return res.status(400).json({ error: `Unknown model: ${model}` });
}
