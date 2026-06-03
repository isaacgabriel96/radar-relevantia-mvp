/**
 * Vercel Function — Agente de Onboarding de Marca (Gemini)
 * Radar Relevantia · /api/gemini-brand-agent
 *
 * Recebe: POST { messages: [...], brandName: string }
 * Retorna: { text: string } com JSON do perfil de marca
 *
 * Arquitetura simplificada (sem PDF — onboarding não precisa):
 *   Pass B (opcional 1ª msg): pesquisa web sobre a marca
 *   Pass C: síntese JSON do perfil
 *
 * Variável de ambiente: GEMINI_API_KEY
 * System prompt: prompts/brand-agent-prompt.txt
 */

import fs from 'fs';
import path from 'path';

export const maxDuration = 120;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function loadSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'brand-agent-prompt.txt');
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch (err) {
    console.error('Erro ao carregar prompts/brand-agent-prompt.txt:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://radar-relevantia.com.br',
    'https://www.radar-relevantia.com.br',
  ];

  // null origin = arquivo local (file://) — permitido para teste (auth JWT ainda exigida)
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

  const { messages, brandName } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório.' });
  }
  if (!brandName || typeof brandName !== 'string') {
    return res.status(400).json({ error: 'brandName é obrigatório.' });
  }

  const systemPrompt = loadSystemPrompt();
  if (!systemPrompt) return res.status(500).json({ error: 'Arquivo de configuração do agente não encontrado.' });

  async function callGemini(requestBody, label = 'gemini') {
    const t0 = Date.now();
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `HTTP ${response.status}`;
      console.error(`[${label}] HTTP ${response.status} em ${Date.now() - t0}ms: ${message}`);
      throw Object.assign(new Error(message), { httpStatus: response.status, detail: err });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === 'SAFETY') {
      throw Object.assign(new Error('SAFETY'), {
        userMessage: 'O conteúdo foi bloqueado pelos filtros de segurança.',
        status: 422,
      });
    }

    const parts = candidate?.content?.parts || [];
    const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
    console.log(`[${label}] OK em ${Date.now() - t0}ms (${text.length} chars)`);
    return { text, finishReason, parts };
  }

  // Pass B — pesquisa web sobre a marca (apenas 1ª mensagem)
  async function passB_brandResearch() {
    const researchPrompt =
        `Você está ajudando um agente de onboarding a entender os negócios de uma marca.\n`
      + `Pesquise no Google sobre "${brandName}" e responda em texto corrido cobrindo:\n`
      + `1) O que a empresa faz (produtos, serviços, segmento)\n`
      + `2) Principais marcas, sub-marcas ou linhas de produto\n`
      + `3) Presença geográfica (países e regiões onde atua)\n`
      + `4) Porte da empresa (startup, PME, grande empresa, multinacional)\n`
      + `5) Público-alvo principal\n\n`
      + `Não invente dados; se não encontrar, diga "não encontrado". `
      + `Não devolva JSON, apenas texto corrido organizado por tópicos.`;

    const body = {
      generationConfig: { max_output_tokens: 4096 },
      tools: [{ google_search: {} }],
      contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
    };

    try {
      const r = await callGemini(body, 'passB-brand');
      return { text: r.text.trim() };
    } catch (err) {
      console.warn('[passB-brand] falhou — Pass C continua sem pesquisa:', err.message);
      return { text: '', error: err.message };
    }
  }

  // Pass C — síntese JSON do perfil de marca
  async function passC_synthesize(webResult) {
    const isFirstMessage = messages.length === 1;

    // Injeta contexto da web na última mensagem do usuário (apenas 1ª vez)
    const contents = messages.map((m, idx) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const text = typeof m.content === 'string' ? m.content : (m.content?.text || '');
      let fullText = text;

      if (isFirstMessage && idx === 0 && webResult?.text) {
        fullText = `[Marca do usuário: ${brandName}]\n\n[CONTEXTO DA WEB — pesquisa automática sobre a marca]\n${webResult.text}`;
      }

      return { role, parts: [{ text: fullText || '' }] };
    });

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        max_output_tokens: 8192,
        responseMimeType: 'application/json',
      },
      contents,
    };

    return callGemini(body, 'passC-brand');
  }

  function mapGeminiErrorToMessage(httpStatus, originalMessage) {
    if (httpStatus === 429) return 'Muitas requisições seguidas. Espere alguns segundos e tente de novo.';
    if (httpStatus === 403) return 'Limite de uso da IA atingido. Tente novamente mais tarde.';
    if (httpStatus >= 500) return 'A IA do Google está instável. Aguarde alguns segundos e tente novamente.';
    return `Erro ao processar com a IA (HTTP ${httpStatus}).`;
  }

  try {
    const t0 = Date.now();
    const isFirstMessage = messages.length === 1;

    // Só pesquisa na web na primeira mensagem
    const webResult = isFirstMessage ? await passB_brandResearch() : null;
    console.log(`[brand-agent] passB OK em ${Date.now() - t0}ms`);

    const result = await passC_synthesize(webResult);
    console.log(`[brand-agent] total ${Date.now() - t0}ms`);

    if (!result.text.trim()) {
      return res.status(502).json({ error: 'A IA retornou uma resposta vazia. Tente novamente.' });
    }

    return res.status(200).json({ text: result.text });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.userMessage });
    if (err.httpStatus) {
      const msg = mapGeminiErrorToMessage(err.httpStatus, err.message);
      return res.status(502).json({ error: msg, detail: err.message });
    }
    console.error('Erro interno gemini-brand-agent:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
