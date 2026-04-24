/**
 * Vercel Function — Proxy para o Agente de Cadastro (Gemini)
 * Radar Relevantia · /api/gemini-agent
 *
 * Recebe: POST { messages: [...], useSearch: boolean }
 * Retorna: { text: string } com a resposta bruta do Gemini
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   GEMINI_API_KEY = AIza...
 *
 * O comportamento do agente é configurado em: prompts/agent-prompt.txt
 * Edite esse arquivo para ajustar como o agente conversa e o que ele extrai.
 */

import fs from 'fs';
import path from 'path';

// Aumenta o timeout para 60s — Gemini com google_search pode levar 15-30s
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Lê o system prompt do arquivo dedicado (editável sem tocar no código)
function loadSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'agent-prompt.txt');
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch (err) {
    console.error('Erro ao carregar prompts/agent-prompt.txt:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://radar-relevantia.com.br',
    'https://www.radar-relevantia.com.br',
  ];

  if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Autenticação: exige Bearer token (Supabase JWT) emitido pelo próprio app
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearerToken) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  // Validação básica: JWT tem 3 partes separadas por ponto
  if (bearerToken.split('.').length !== 3) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY não configurada');
    return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
  }

  const { messages, useSearch = false } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório.' });
  }

  const systemPrompt = loadSystemPrompt();
  if (!systemPrompt) {
    return res.status(500).json({ error: 'Arquivo de configuração do agente não encontrado.' });
  }

  /**
   * Converte uma mensagem para o formato de parts do Gemini.
   * content pode ser:
   *   - string: mensagem simples de texto
   *   - { text, files } onde files = [{ fileUri, mimeType, label }]
   */
  function buildParts(content) {
    if (typeof content === 'string') {
      return [{ text: content }];
    }
    const parts = [];
    if (content.files?.length) {
      for (const f of content.files) {
        if (f.label) parts.push({ text: `[PDF: ${f.label}]` });
        parts.push({ fileData: { mimeType: f.mimeType || 'application/pdf', fileUri: f.fileUri } });
      }
    }
    if (content.text?.trim()) parts.push({ text: content.text });
    return parts.length > 0 ? parts : [{ text: '' }];
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      max_output_tokens: 16384,
      // Desabilita o "thinking mode" do Gemini 2.5 Flash. Com thinking ativo
      // + PDF + google_search, o modelo às vezes gasta todo o orçamento
      // raciocinando (thought parts) e devolve a resposta final VAZIA.
      // Para esta tarefa (extrair JSON estruturado) thinking não agrega valor.
      thinkingConfig: { thinkingBudget: 0 },
    },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: buildParts(m.content),
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
    // Exclui "thought" parts (raciocínio interno do Gemini 2.5) — só texto final
    const text  = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');

    // Log detalhado quando a resposta final vem vazia — ajuda a diagnosticar
    // casos de thinking consumindo todo o orçamento, safety filters etc.
    if (!text.trim()) {
      const thoughtCount = parts.filter(p => p.thought).length;
      const textPartCount = parts.filter(p => p.text && !p.thought).length;
      const usage = data.usageMetadata || {};
      console.warn('[gemini-agent] resposta vazia:', {
        finishReason,
        totalParts: parts.length,
        thoughtParts: thoughtCount,
        textParts: textPartCount,
        tokensPrompt: usage.promptTokenCount,
        tokensThought: usage.thoughtsTokenCount,
        tokensOutput: usage.candidatesTokenCount,
      });
    }

    return { text, finishReason, parts };
  }

  // Detecta se há PDFs anexados (influencia estratégia de fallback)
  const hasPdfs = messages.some(m =>
    typeof m.content === 'object' && Array.isArray(m.content.files) && m.content.files.length > 0
  );

  // Decide se vale a pena reexecutar SEM google_search com base no erro HTTP
  // do Gemini. Só retentar nos casos em que tirar a tool de fato ajuda:
  //   - 413 (payload too large)  → tool + conteúdo grande estourou
  //   - 504 (timeout)            → tirar tool reduz o tempo de execução
  // Erros como 429 (rate limit) e 5xx genéricos não resolvem com retry imediato.
  function shouldRetryWithoutSearch(httpStatus) {
    return httpStatus === 413 || httpStatus === 504;
  }

  async function callGeminiWithFallback(requestBody, allowRetry) {
    try {
      const r = await callGemini(requestBody);
      if (r.text.trim()) return r;

      // Resposta vazia → retry sem search se aplicável (bug conhecido do 2.5 Flash)
      if (allowRetry && requestBody.tools) {
        console.warn('Gemini: resposta vazia com google_search, tentando sem search. finishReason:', r.finishReason);
        const noSearch = { ...requestBody };
        delete noSearch.tools;
        return await callGemini(noSearch);
      }
      return r;
    } catch (err) {
      if (allowRetry && requestBody.tools && shouldRetryWithoutSearch(err.httpStatus)) {
        console.warn(`Gemini HTTP ${err.httpStatus} com google_search, tentando sem search:`, err.message);
        const noSearch = { ...requestBody };
        delete noSearch.tools;
        return await callGemini(noSearch);
      }
      throw err;
    }
  }

  // Converte erro do Gemini em mensagem clara pro usuário (sem mentir).
  // Evita culpar o PDF quando o problema é rate limit ou instabilidade do Google.
  function mapGeminiErrorToMessage(httpStatus, originalMessage) {
    if (httpStatus === 429) {
      return 'Muitas requisições seguidas. Espere alguns segundos e tente de novo.';
    }
    if (httpStatus === 403) {
      return 'Limite de uso da IA atingido. Tente novamente mais tarde.';
    }
    if (httpStatus === 413) {
      return 'O conteúdo é grande demais para processar em uma única chamada. Tente simplificar a descrição ou enviar um PDF menor.';
    }
    if (httpStatus === 400) {
      return 'A IA não entendeu o conteúdo enviado. Reformule a descrição ou tente um PDF diferente.';
    }
    if (httpStatus >= 500 && httpStatus < 600) {
      return 'A IA do Google está instável no momento. Aguarde alguns segundos e tente novamente.';
    }
    return `Erro ao processar com a IA (HTTP ${httpStatus}).`;
  }

  try {
    const result = await callGeminiWithFallback(body, /* allowRetry */ true);

    if (!result.text.trim()) {
      console.error('Gemini: resposta vazia mesmo após fallback. finishReason:', result.finishReason);
      return res.status(502).json({
        error: 'A IA retornou uma resposta vazia. Tente novamente — se persistir, reformule a descrição ou remova o PDF.',
      });
    }

    return res.status(200).json({ text: result.text });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.userMessage });
    }
    if (err.httpStatus) {
      console.error(`Erro Gemini HTTP ${err.httpStatus}:`, err.message, '— detail:', JSON.stringify(err.detail)?.slice(0, 500));
      const msg = mapGeminiErrorToMessage(err.httpStatus, err.message);
      return res.status(502).json({ error: msg, detail: err.message, geminiStatus: err.httpStatus });
    }
    console.error('Erro interno gemini-agent:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
