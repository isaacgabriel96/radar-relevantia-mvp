/**
 * Vercel Function — Agente de Auto-preenchimento
 * Radar Relevantia · /api/autofill
 *
 * Recebe: POST { descricao: string }
 * Retorna: JSON com campos interpretados pelo Claude
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   ANTHROPIC_API_KEY = sk-ant-api03-...
 */

const SYSTEM_PROMPT = `Você extrai dados de oportunidades de patrocínio para o Radar Relevantia.
Data: ${new Date().toLocaleDateString('pt-BR')}

# CAMPOS

tipo: enum personalidade|evento|artista|midia
  personalidade=influenciador/atleta/celebridade
  evento=festival/show/corrida/congresso
  artista=cantor/banda/DJ
  midia=portal/podcast/revista/canal

nome_oportunidade: string
descricao_curta: string máx300chars voltada para marcas
descricao_completa: string — expanda com contexto, histórico e por que patrocinar
busca_marca: string máx500 — perfil ideal de patrocinador (gere se não informado)

canais[]: array
  rede: instagram|youtube|tiktok|twitter|linkedin|spotify|twitch|facebook|site|kwai|threads
  username: string sem @ · null se não informado
  seguidores: number · normalize 10k→10000 · 2mi→2000000 · NUNCA estime
  seguidores_estimado: true se "cerca de/uns/aproximadamente"
  formatos_conteudo: array stories|reels|feed|shorts|lives|videos|podcasts|artigos|tweets
    infira pela rede se não mencionado (instagram→reels,stories,feed; youtube→videos,shorts)
  genero_masculino_pct: number 0-100 · null se não informado · NUNCA estime
  genero_feminino_pct: complemento automático se um dos dois informado
  faixa_etaria: {13-17,18-24,25-34,35-44,45+} em % · null se não informado

cotas[]: array
  nome: string · se não informado use: <5k→Apoiador · 5-20k→Prata · 20-60k→Ouro · >60k→Diamante
  valor: number · null se não informado
  moeda: BRL|USD|EUR · padrão BRL
  vagas: number · null=ilimitado
  descricao: string · gere 1 linha baseada nos benefícios
  beneficios[]: array de strings · sugira coerentes com o tipo se não informados

incentivo: objeto
  tem_incentivo: boolean · true só se mencionado explicitamente
  lei: rouanet|lie|paulo_gustavo|iss|icms|pronac|outras
  categoria: cultura|esporte|educacao|saude|assistencia_social|meio_ambiente|outros
  valor_aprovado: number
  status_incentivo: aprovado|em_andamento

segmentos[]: array máx5
  opções: esportes_fitness|moda_lifestyle|tecnologia_inovacao|alimentacao_bebidas|
  financas_investimentos|saude_bem_estar|educacao|entretenimento|automobilismo|
  games_esports|musica|familia_maternidade|negocios_empreendedorismo|beleza_cuidados|
  turismo_viagens|sustentabilidade|cultura_arte|luxo_alto_padrao
  infira pelo contexto — corrida→esportes_fitness,saude_bem_estar · música→musica,entretenimento

# REGRAS ABSOLUTAS
- Retorne APENAS JSON válido — nenhum texto fora
- NUNCA invente audiência (seguidores, gênero, faixa etária) — prefira null
- Valores numéricos sempre como number, nunca string formatada
- origem: direto=extraído literalmente · inferido=deduzido · default=padrão por ausência
- confianca: alta=sem ambiguidade · media=inferência razoável · baixa=usuário deve revisar
- duvidas: só perguntas realmente impactantes, não pergunte o óbvio
- Gere sempre descricao_completa e busca_marca mesmo que inferidos

# FORMATO DE RESPOSTA
{
  "resumo": "1-2 frases",
  "duvidas": ["perguntas impactantes"],
  "campos_nao_preenchidos": ["campos que ficaram null"],
  "campos": {
    "[campo]": {"valor": <valor>, "origem": "direto|inferido|default", "confianca": "alta|media|baixa"},
    "canais": {"valor": [{}], "origem": "...", "confianca": "..."},
    "cotas":  {"valor": [{}], "origem": "...", "confianca": "..."},
    "incentivo": {"valor": {}, "origem": "...", "confianca": "..."},
    "segmentos": {"valor": [], "origem": "inferido", "confianca": "alta|media|baixa"}
  }
}`;

export default async function handler(req, res) {
  // CORS — permite só o domínio do Radar Relevantia em produção
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://radar.relevantia.com.br',
    'https://www.radar.relevantia.com.br',
    // adicione o domínio da Vercel aqui quando souber:
    // 'https://seu-projeto.vercel.app',
  ];

  // Em desenvolvimento local, aceita qualquer origem
  if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { descricao } = req.body || {};

  if (!descricao || descricao.trim().length < 10) {
    return res.status(400).json({ error: 'Descrição muito curta ou ausente.' });
  }

  if (descricao.length > 8000) {
    return res.status(400).json({ error: 'Descrição muito longa (máximo 8000 caracteres).' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY não configurada');
    return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: descricao.trim() }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Erro Anthropic:', err);
      return res.status(502).json({
        error: 'Erro ao processar com a IA.',
        detail: err.error?.message || `HTTP ${response.status}`
      });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';

    // Limpa caso venha com markdown
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('JSON inválido da IA:', raw);
      return res.status(502).json({ error: 'A IA retornou um formato inesperado. Tente novamente.' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
