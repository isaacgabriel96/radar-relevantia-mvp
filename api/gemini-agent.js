/**
 * Vercel Function — Proxy para o Agente de Cadastro (Gemini)
 * Radar Relevantia · /api/gemini-agent
 *
 * Recebe: POST { messages: [...], useSearch: boolean }
 * Retorna: { text: string } com a resposta bruta do Gemini
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   GEMINI_API_KEY = AIza...
 */

// Aumenta o timeout para 60s — Gemini com google_search pode levar 15-30s
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://radar.relevantia.com.br',
    'https://www.radar.relevantia.com.br',
  ];

  if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY não configurada');
    return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
  }

  const { messages, useSearch = false, systemPrompt } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório.' });
  }

  const body = {
    system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: { max_output_tokens: 8192 },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  };

  if (useSearch) body.tools = [{ google_search: {} }];

  /**
   * Chama o Gemini e extrai o texto da resposta.
   * Retorna { text } em sucesso, lança erro em falha HTTP.
   */
  async function callGemini(requestBody) {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw Object.assign(new Error(err.error?.message || `HTTP ${response.status}`), { httpStatus: response.status, detail: err });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === 'MAX_TOKENS') {
      throw Object.assign(new Error('MAX_TOKENS'), { userMessage: 'A resposta foi cortada (limite de tokens). Tente uma entrada mais curta.', status: 422 });
    }
    if (finishReason === 'SAFETY') {
      throw Object.assign(new Error('SAFETY'), { userMessage: 'O conteúdo foi bloqueado pelos filtros de segurança.', status: 422 });
    }

    const parts = candidate?.content?.parts || [];
    const text  = parts.filter(p => p.text).map(p => p.text).join('');
    return { text, finishReason, parts };
  }

  try {
    let result = await callGemini(body);

    // Gemini 2.5 Flash com google_search às vezes retorna partes sem texto
    // (finishReason OTHER ou STOP com 0 text parts). Retry sem search como fallback.
    if (!result.text.trim() && useSearch) {
      console.warn('Gemini: resposta vazia com google_search, tentando sem search. finishReason:', result.finishReason);
      const bodyNoSearch = { ...body };
      delete bodyNoSearch.tools;
      result = await callGemini(bodyNoSearch);
    }

    if (!result.text.trim()) {
      console.error('Gemini: resposta vazia mesmo sem search. finishReason:', result.finishReason);
      return res.status(502).json({ error: 'A IA retornou uma resposta vazia. Tente novamente.' });
    }

    return res.status(200).json({ text: result.text });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.userMessage });
    }
    if (err.httpStatus) {
      console.error('Erro Gemini HTTP:', err.detail);
      return res.status(502).json({ error: 'Erro ao processar com a IA.', detail: err.message });
    }
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
