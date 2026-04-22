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

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Erro Gemini:', err);
      return res.status(502).json({
        error: 'Erro ao processar com a IA.',
        detail: err.error?.message || `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (candidate?.finishReason === 'MAX_TOKENS') {
      return res.status(422).json({ error: 'A resposta foi cortada (limite de tokens). Tente uma entrada mais curta.' });
    }
    if (candidate?.finishReason === 'SAFETY') {
      return res.status(422).json({ error: 'O conteúdo foi bloqueado pelos filtros de segurança.' });
    }

    const parts = candidate?.content?.parts || [];
    const text  = parts.filter(p => p.text).map(p => p.text).join('');

    if (!text.trim()) {
      const debugInfo = {
        finishReason: candidate?.finishReason,
        partsCount: parts.length,
        partTypes: parts.map(p => Object.keys(p).join(',')),
        candidateExists: !!candidate,
        candidatesCount: data.candidates?.length,
      };
      console.error('Gemini resposta vazia:', JSON.stringify(debugInfo));
      return res.status(502).json({
        error: 'A IA retornou uma resposta vazia. Tente novamente.',
        debug: debugInfo,
      });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
