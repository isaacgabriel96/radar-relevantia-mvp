/**
 * Vercel Function — Agente de Criação de Campanhas (Gemini)
 * Radar Relevantia · /api/gemini-campaign-agent
 *
 * Recebe: POST { messages: [...], brandProfile: object }
 * Retorna: { text: string } com JSON da campanha + filtro configurado
 *
 * Variável de ambiente: GEMINI_API_KEY_BRAND (ou GEMINI_API_KEY como fallback)
 * System prompt: prompts/campaign-agent-prompt.txt
 */

import fs from 'fs';
import path from 'path';

export const maxDuration = 120;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function loadSystemPrompt() {
  try {
    const p = path.join(process.cwd(), 'prompts', 'campaign-agent-prompt.txt');
    return fs.readFileSync(p, 'utf8').trim();
  } catch (err) {
    console.error('Erro ao carregar campaign-agent-prompt.txt:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://radar-relevantia.com.br', 'https://www.radar-relevantia.com.br'];
  const isLocal = !origin || origin === 'null';

  if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || isLocal) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearerToken) return res.status(401).json({ error: 'Não autenticado.' });
  if (bearerToken.split('.').length !== 3) return res.status(401).json({ error: 'Token inválido.' });

  const apiKey = process.env.GEMINI_API_KEY_BRAND || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Configuração do servidor incompleta.' });

  const { messages, brandProfile } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório.' });
  }

  const systemPrompt = loadSystemPrompt();
  if (!systemPrompt) return res.status(500).json({ error: 'Arquivo de configuração não encontrado.' });

  async function callGemini(requestBody, label = 'gemini', attempt = 1) {
    const MAX_RETRIES = 3;
    const t0 = Date.now();
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `HTTP ${response.status}`;
      const isRetryable = response.status === 429 || response.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const waitMs = attempt * 3000;
        console.warn(`[${label}] HTTP ${response.status} — retry ${attempt} em ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        return callGemini(requestBody, label, attempt + 1);
      }
      throw Object.assign(new Error(message), { httpStatus: response.status });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      throw Object.assign(new Error('SAFETY'), { userMessage: 'Conteúdo bloqueado pelos filtros.', status: 422 });
    }
    const parts = candidate?.content?.parts || [];
    const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
    console.log(`[${label}] OK em ${Date.now() - t0}ms`);
    return { text };
  }

  try {
    const isFirstMessage = messages.length === 1;

    // Injeta perfil da marca na primeira mensagem
    const contents = messages.map((m, idx) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      let text = typeof m.content === 'string' ? m.content : (m.content?.text || '');

      if (isFirstMessage && idx === 0 && brandProfile) {
        const profileText = JSON.stringify(brandProfile, null, 2);
        text = `[PERFIL DA MARCA]\n${profileText}\n\n[PEDIDO DO USUÁRIO]\n${text}`;
      }

      return { role, parts: [{ text: text || '' }] };
    });

    const result = await callGemini({
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { max_output_tokens: 8192, responseMimeType: 'application/json' },
      contents,
    }, 'campaign-agent');

    if (!result.text.trim()) {
      return res.status(502).json({ error: 'A IA retornou uma resposta vazia. Tente novamente.' });
    }

    return res.status(200).json({ text: result.text });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.userMessage });
    if (err.httpStatus) {
      const map = { 429: 'Muitas requisições. Aguarde e tente novamente.', 403: 'Limite de uso atingido.' };
      return res.status(502).json({ error: map[err.httpStatus] || `Erro da IA (HTTP ${err.httpStatus}).` });
    }
    console.error('Erro gemini-campaign-agent:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
