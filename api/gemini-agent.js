/**
 * Vercel Function — Proxy para o Agente de Cadastro (Gemini)
 * Radar Relevantia · /api/gemini-agent
 *
 * Recebe: POST { messages: [...], useSearch: boolean }
 * Retorna: { text: string } com o JSON estruturado do agente
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   GEMINI_API_KEY = AIza...
 *
 * O comportamento do agente é configurado em: prompts/agent-prompt.txt
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARQUITETURA — Orquestração por compatibilidade de features
 * ─────────────────────────────────────────────────────────────────────────
 * O Gemini 2.5 Flash tem TRÊS combinações incompatíveis (todas retornam HTTP 400):
 *   1. fileData + google_search           → "Tool use not compatible with fileData"
 *   2. responseMimeType:json + google_search → "Search Grounding can't be used with JSON mode"
 *   3. thinkingBudget:0 + google_search   → erro de configuração de thinking
 *
 * Solução: separar features incompatíveis em chamadas distintas e paralelizá-las.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Pass A (paralela): se há PDF → extrai texto do PDF           │
 *   │  Pass B (paralela): se há search → pesquisa contexto na web   │
 *   │  Pass C (sequencial): síntese JSON final                       │
 *   │     • Recebe texto extraído do PDF + contexto da web           │
 *   │     • Sem tools, com responseMimeType:json, com thinkingBudget │
 *   │     • Devolve o JSON estruturado que o frontend consome        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Latência típica: máx(passA, passB) + passC ≈ 25–45s.
 * Confiabilidade: cada chamada usa só features compatíveis; sem 400s.
 * Degradação graciosa: se Pass A ou B falhar, Pass C ainda roda com o que tem.
 */

import fs from 'fs';
import path from 'path';

// 120s — Pass A/B em paralelo + Pass C sequencial cabem aqui com folga
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

  // Autenticação: exige Bearer token (Supabase JWT)
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearerToken) return res.status(401).json({ error: 'Não autenticado.' });
  if (bearerToken.split('.').length !== 3) return res.status(401).json({ error: 'Token inválido.' });

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

  // ── Helpers compartilhados ────────────────────────────────────────────────

  /**
   * Chama o Gemini com um body já montado e devolve { text, finishReason, parts, raw }.
   * Lança erro com .httpStatus em falha HTTP, ou com .userMessage em finishReason de bloqueio.
   */
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
    if (finishReason === 'MAX_TOKENS') {
      throw Object.assign(new Error('MAX_TOKENS'), {
        userMessage: 'A resposta foi cortada (limite de tokens). Tente uma entrada mais curta.',
        status: 422,
      });
    }

    const parts = candidate?.content?.parts || [];
    // Filtra "thought parts" (raciocínio interno do Gemini 2.5) — só texto final
    const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');

    if (!text.trim()) {
      const usage = data.usageMetadata || {};
      console.warn(`[${label}] resposta vazia em ${Date.now() - t0}ms:`, {
        finishReason,
        totalParts: parts.length,
        thoughtParts: parts.filter(p => p.thought).length,
        textParts: parts.filter(p => p.text && !p.thought).length,
        tokensPrompt: usage.promptTokenCount,
        tokensThought: usage.thoughtsTokenCount,
        tokensOutput: usage.candidatesTokenCount,
      });
    } else {
      console.log(`[${label}] OK em ${Date.now() - t0}ms (${text.length} chars)`);
    }

    return { text, finishReason, parts };
  }

  /**
   * Detecta PDFs em uma mensagem — retorna { files: [{fileUri, mimeType, label}], hasFiles: bool }
   */
  function extractFilesFromMessage(m) {
    if (typeof m.content !== 'object' || !Array.isArray(m.content.files)) {
      return { files: [], hasFiles: false };
    }
    return { files: m.content.files, hasFiles: m.content.files.length > 0 };
  }

  /**
   * Extrai apenas o texto livre da mensagem do usuário (string ou content.text).
   */
  function extractTextFromMessage(m) {
    if (typeof m.content === 'string') return m.content;
    return m.content?.text?.trim() || '';
  }

  // ── Detecta o cenário: PDF? Search? ───────────────────────────────────────

  const hasPdfs = messages.some(m => extractFilesFromMessage(m).hasFiles);

  // ── Pass A — Extração de texto do PDF ─────────────────────────────────────
  // Sem search, sem system_instruction (queremos extração crua), sem JSON mode.
  // thinkingBudget:0 acelera porque não precisa raciocinar — só extrair.

  async function passA_extractPdf() {
    // Coleta TODOS os PDFs de TODAS as mensagens (geralmente 1, mas suporta vários)
    const pdfParts = [];
    const labels = [];
    for (const m of messages) {
      const { files, hasFiles } = extractFilesFromMessage(m);
      if (!hasFiles) continue;
      for (const f of files) {
        if (f.label) {
          pdfParts.push({ text: `=== Documento: ${f.label} ===` });
          labels.push(f.label);
        }
        pdfParts.push({
          fileData: { mimeType: f.mimeType || 'application/pdf', fileUri: f.fileUri },
        });
      }
    }
    if (pdfParts.length === 0) return null;

    const body = {
      generationConfig: {
        max_output_tokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
      contents: [{
        role: 'user',
        parts: [
          ...pdfParts,
          {
            text: 'Extraia TODO o conteúdo relevante destes documentos para uso por um agente '
                + 'de cadastro de patrocínio: nome, descrição, trajetória, conquistas, números '
                + 'de público (seguidores, audiência, alcance), redes sociais, datas, valores, '
                + 'cotas, benefícios, lei de incentivo, contatos. Devolva texto corrido organizado '
                + 'por seções (não invente nada que não esteja no documento). Sem comentários extras.',
          },
        ],
      }],
    };

    try {
      const r = await callGemini(body, 'passA-pdf');
      return { labels, text: r.text.trim() };
    } catch (err) {
      console.warn('[passA-pdf] falhou — Pass C continua sem extração:', err.message);
      return { labels, text: '', error: err.message };
    }
  }

  // ── Pass B — Pesquisa contextual na web ──────────────────────────────────
  // Search ON, sem JSON mode, sem fileData, sem thinkingBudget:0 (search exige thinking).

  async function passB_webResearch() {
    // Concatena texto livre de TODAS as mensagens do usuário para dar contexto à pesquisa
    const userTexts = messages
      .filter(m => m.role !== 'assistant')
      .map(extractTextFromMessage)
      .filter(Boolean)
      .join('\n');
    if (!userTexts.trim()) return null;

    const researchPrompt =
        'Você está ajudando um agente de cadastro a pesquisar sobre uma oportunidade de '
      + 'patrocínio descrita abaixo pelo usuário. Pesquise no Google e responda em texto '
      + 'corrido cobrindo:\n'
      + '1) Identidade e contexto (quem é/o que é, trajetória, conquistas recentes)\n'
      + '2) Redes sociais oficiais (Instagram, YouTube, TikTok, site) com usernames e '
      +    'número de seguidores quando disponível\n'
      + '3) Perfil do público / audiência\n'
      + '4) Setores de marca que fariam sentido como patrocinador e por quê\n\n'
      + 'Não invente dados; se não encontrar, diga "não encontrado". Não devolva JSON, '
      + 'apenas texto corrido organizado por tópicos.\n\n'
      + '── DESCRIÇÃO DO USUÁRIO ──\n'
      + userTexts;

    const body = {
      generationConfig: {
        max_output_tokens: 4096,
        // Sem thinkingBudget:0 → search exige thinking habilitado
      },
      tools: [{ google_search: {} }],
      contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
    };

    try {
      const r = await callGemini(body, 'passB-search');
      return { text: r.text.trim() };
    } catch (err) {
      console.warn('[passB-search] falhou — Pass C continua sem pesquisa:', err.message);
      return { text: '', error: err.message };
    }
  }

  // ── Pass C — Síntese JSON final ───────────────────────────────────────────
  // Recebe contexto preparado (PDF text + web research) e produz JSON estruturado.
  // Sem tools, com responseMimeType:json, com thinkingBudget:0 (só formatação).

  async function passC_synthesize({ pdfResult, webResult }) {
    /**
     * Constrói o histórico para o Pass C substituindo:
     *   - fileData por texto extraído (Pass A)
     *   - injetando pesquisa web (Pass B) na ÚLTIMA mensagem do usuário
     */
    const lastUserIdx = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role !== 'assistant') return i;
      }
      return messages.length - 1;
    })();

    const contents = messages.map((m, idx) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts = [];

      // Texto livre da mensagem (sempre incluído primeiro)
      const userText = extractTextFromMessage(m);

      // Se essa mensagem tinha PDF, substitui por bloco de texto extraído
      const { hasFiles, files } = extractFilesFromMessage(m);
      if (hasFiles) {
        if (pdfResult?.text) {
          parts.push({
            text: `[CONTEÚDO EXTRAÍDO DO(S) PDF(S) ${(pdfResult.labels || files.map(f => f.label).filter(Boolean)).join(', ') || 'anexado(s)'}]\n${pdfResult.text}`,
          });
        } else {
          parts.push({
            text: `[PDF anexado mas não pôde ser lido automaticamente: ${files.map(f => f.label).filter(Boolean).join(', ') || 'document.pdf'}]`,
          });
        }
      }

      if (userText) parts.push({ text: userText });

      // Injeta a pesquisa web na ÚLTIMA mensagem do usuário (não nas anteriores)
      if (idx === lastUserIdx && webResult?.text) {
        parts.push({
          text: `\n[CONTEXTO DA WEB — pesquisa automática feita para esta oportunidade]\n${webResult.text}`,
        });
      }

      // Garante que sempre há ao menos um part
      if (parts.length === 0) parts.push({ text: '' });

      return { role, parts };
    });

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        max_output_tokens: 32768,
        responseMimeType: 'application/json',
        // NOTA: thinkingConfig NÃO é setado aqui. Em produção observamos que
        // a combinação `responseMimeType:json` + `thinkingBudget:0` no
        // Gemini 2.5 Flash às vezes trunca a resposta (resumo cortado no
        // meio). As "thought parts" já são filtradas em callGemini abaixo.
      },
      contents,
    };

    const result = await callGemini(body, 'passC-synth');

    // Log estendido — valida que o JSON está completo (fecha com `}`)
    if (result.text) {
      const trimmed = result.text.trim();
      const startsOk = trimmed.startsWith('{');
      const endsOk = trimmed.endsWith('}');
      console.log(`[passC-synth] text len=${trimmed.length} starts={=${startsOk} ends=}=${endsOk} finishReason=${result.finishReason}`);
      if (!endsOk) {
        console.warn('[passC-synth] JSON parece truncado. Últimos 120 chars:', trimmed.slice(-120));
      }
    }

    return result;
  }

  // ── Orquestração ──────────────────────────────────────────────────────────

  function mapGeminiErrorToMessage(httpStatus, originalMessage) {
    if (httpStatus === 429) return 'Muitas requisições seguidas. Espere alguns segundos e tente de novo.';
    if (httpStatus === 403) return 'Limite de uso da IA atingido. Tente novamente mais tarde.';
    if (httpStatus === 413) return 'O conteúdo é grande demais. Tente simplificar a descrição ou usar um PDF menor.';
    if (httpStatus === 400) {
      if (originalMessage?.includes('PROCESSING')) {
        return 'O PDF ainda está sendo processado pelo Google. Aguarde alguns segundos e tente novamente.';
      }
      return 'A IA não entendeu o conteúdo enviado. Reformule a descrição ou tente um PDF diferente.';
    }
    if (httpStatus >= 500 && httpStatus < 600) return 'A IA do Google está instável. Aguarde alguns segundos e tente novamente.';
    return `Erro ao processar com a IA (HTTP ${httpStatus}).`;
  }

  try {
    const t0 = Date.now();

    // Caminho rápido: nem PDF, nem search → uma chamada só (Pass C)
    if (!hasPdfs && !useSearch) {
      console.log('[orchestrator] caminho rápido: sem PDF, sem search');
      const result = await passC_synthesize({ pdfResult: null, webResult: null });
      if (!result.text.trim()) {
        return res.status(502).json({
          error: 'A IA retornou uma resposta vazia. Tente novamente — se persistir, reformule a descrição.',
        });
      }
      return res.status(200).json({ text: result.text });
    }

    // Caminho completo: paraleliza Pass A (PDF) e Pass B (search) e depois Pass C
    console.log(`[orchestrator] caminho completo: PDF=${hasPdfs} search=${useSearch}`);
    const [pdfResult, webResult] = await Promise.all([
      hasPdfs    ? passA_extractPdf() : Promise.resolve(null),
      useSearch  ? passB_webResearch() : Promise.resolve(null),
    ]);

    console.log(`[orchestrator] passes paralelos OK em ${Date.now() - t0}ms`);

    const result = await passC_synthesize({ pdfResult, webResult });

    console.log(`[orchestrator] síntese final OK — total ${Date.now() - t0}ms`);

    if (!result.text.trim()) {
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
