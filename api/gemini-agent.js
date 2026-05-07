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

// Aumenta o timeout para 120s — 2 chamadas sequenciais ao Gemini (PDF + search)
// podem levar até ~45s cada em pico de carga.
export const maxDuration = 120;

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
      max_output_tokens: 32768,
      // Force JSON output — previne aspas não-escapadas e texto fora do JSON
      // (causa raiz do erro "formato inesperado"). Gemini 2.5 Flash suporta
      // responseMimeType junto com google_search.
      responseMimeType: 'application/json',
      // NOTA: thinkingConfig (thinkingBudget: 0) foi removido das chamadas com
      // google_search. O Gemini 2.5 Flash retorna HTTP 400 quando thinking=0
      // é combinado com Google Search grounding. As "thought parts" são filtradas
      // abaixo (parts.filter(p => !p.thought)), então thinking não afeta o JSON final.
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

  // Detecta se há PDFs anexados (influencia estratégia de chamada)
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

  // ── Orquestração 2-etapas para PDF + google_search ──────────────────────────
  // O Gemini 2.5 Flash retorna HTTP 400 quando recebe fileData + google_search
  // na mesma requisição ("Tool use not compatible with fileData").
  // Solução: separar em duas chamadas independentes:
  //   Etapa 1 → extrai todo o texto do PDF (sem search, sem system_instruction)
  //   Etapa 2 → chamada principal do agente com o texto extraído injetado
  //             como contexto em texto puro + google_search habilitado
  async function runWithPdfOrchestration() {
    // Coleta partes do PDF da primeira mensagem que contiver arquivo
    const pdfParts = [];
    let pdfLabel = 'document.pdf';
    for (const m of messages) {
      if (typeof m.content === 'object' && m.content.files?.length) {
        for (const f of m.content.files) {
          if (f.label) {
            pdfLabel = f.label;
            pdfParts.push({ text: `[PDF: ${f.label}]` });
          }
          pdfParts.push({ fileData: { mimeType: f.mimeType || 'application/pdf', fileUri: f.fileUri } });
        }
        break; // só processa PDFs da primeira mensagem com arquivo
      }
    }

    // ── Etapa 1: extração de texto do PDF ─────────────────────────────────────
    console.log('[gemini-agent] PDF detectado — etapa 1: extração de texto');
    const extractionBody = {
      generationConfig: { max_output_tokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
      contents: [{
        role: 'user',
        parts: [
          ...pdfParts,
          {
            text: 'Extraia todo o conteúdo relevante deste documento: nome, descrição, trajetória, conquistas, números de público, redes sociais, datas, valores e qualquer outra informação presente. Retorne apenas o conteúdo extraído, sem comentários adicionais.',
          },
        ],
      }],
    };

    let pdfText = '';
    try {
      const extractResult = await callGemini(extractionBody);
      pdfText = extractResult.text.trim();
      console.log('[gemini-agent] etapa 1 concluída, chars extraídos:', pdfText.length);
    } catch (err) {
      // Extração falhou → continua sem o texto do PDF (degradação graciosa)
      // O agente ainda pode usar o texto do usuário + search.
      console.warn('[gemini-agent] etapa 1 falhou, continuando sem extração:', err.message);
    }

    // ── Etapa 2: chamada principal sem fileData, com texto extraído e search ──
    // Substitui as partes de fileData pelo texto puro extraído na etapa 1.
    const messagesNoPdf = messages.map(m => {
      if (typeof m.content !== 'object' || !m.content.files?.length) return m;
      const parts = [];
      if (pdfText) {
        parts.push(`[Conteúdo extraído do PDF "${pdfLabel}":\n${pdfText}\n]`);
      } else {
        parts.push(`[PDF "${pdfLabel}" foi anexado mas não pôde ser lido automaticamente.]`);
      }
      if (m.content.text?.trim()) parts.push(m.content.text.trim());
      return { ...m, content: parts.join('\n\n') };
    });

    console.log('[gemini-agent] etapa 2: chamada principal com google_search');
    const mainBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        max_output_tokens: 32768,
        responseMimeType: 'application/json',
        // thinkingBudget omitido: Gemini 2.5 Flash requer thinking habilitado
        // quando usa google_search (thinkingBudget:0 + search → HTTP 400).
      },
      tools: [{ google_search: {} }],
      contents: messagesNoPdf.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: buildParts(m.content),
      })),
    };

    return callGeminiWithFallback(mainBody, /* allowRetry */ true);
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
      // Mensagem específica para erros comuns de 400
      if (originalMessage?.includes('PROCESSING')) {
        return 'O PDF ainda está sendo processado pelo Google. Aguarde alguns segundos e tente novamente.';
      }
      if (originalMessage?.includes('thinking') || originalMessage?.includes('Thinking')) {
        return 'Erro de configuração da IA (thinking+search). Reporte ao suporte.';
      }
      return 'A IA não entendeu o conteúdo enviado. Reformule a descrição ou tente um PDF diferente.';
    }
    if (httpStatus >= 500 && httpStatus < 600) {
      return 'A IA do Google está instável no momento. Aguarde alguns segundos e tente novamente.';
    }
    return `Erro ao processar com a IA (HTTP ${httpStatus}).`;
  }

  try {
    // Quando há PDF: orquestração em 2 etapas (extração → search + agente).
    // Quando não há PDF: chamada única com search (se solicitado).
    const result = hasPdfs
      ? await runWithPdfOrchestration()
      : await callGeminiWithFallback(body, /* allowRetry */ true);

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
