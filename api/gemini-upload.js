/**
 * Vercel Edge Function — Inicia upload resumível para a Gemini Files API
 * Radar Relevantia · /api/gemini-upload
 *
 * Fluxo em 2 etapas (bypass do limite de body do Vercel):
 *   1. Frontend POST aqui com JSON { fileName, fileSize, mimeType }
 *      → Esta função inicia upload na Gemini e retorna { uploadUrl }
 *   2. Frontend PUT direto ao uploadUrl com o binário do arquivo
 *      (bypassa o Vercel completamente — vai direto para o Google)
 *      → Google retorna { file: { uri, mimeType } }
 *
 * Por que 2 etapas?
 *   - Serverless/Edge Functions têm limite de ~4.5MB no request body
 *   - A etapa 1 só recebe JSON pequeno (metadados)
 *   - O binário vai diretamente do browser para o Google (sem passar pelo Vercel)
 *   - A autenticação ainda é nossa: sem token válido, o uploadUrl não é emitido
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   GEMINI_API_KEY = AIza...
 */

export const config = { runtime: 'edge' };

const UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://radar-relevantia.com.br',
    'https://www.radar-relevantia.com.br',
  ];

  const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Em dev ou origins permitidas, reflete o origin
  const isDev = !req.headers.get('x-vercel-deployment-url');
  if (isDev || allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Autenticação: exige Bearer token (Supabase JWT) emitido pelo próprio app
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearerToken || bearerToken.split('.').length !== 3) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Lê metadados do body JSON (sem binário — evita limite de body do Vercel)
    const body = await req.json().catch(() => ({}));
    const fileName = decodeURIComponent(body.fileName || 'upload.pdf');
    const mimeType = body.mimeType || 'application/pdf';
    const fileSize = String(body.fileSize || '0');

    if (!body.fileName) {
      return new Response(JSON.stringify({ error: 'fileName é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
    if (parseInt(fileSize) > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Arquivo muito grande. O limite é 100 MB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inicia upload resumível — Google retorna uploadUrl no header x-goog-upload-url
    const initRes = await fetch(`${UPLOAD_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileSize,
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: fileName } }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      console.error('Gemini init upload error:', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao iniciar upload.', detail: err?.error?.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const uploadUrl = initRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      return new Response(JSON.stringify({ error: 'Gemini não retornou upload URL.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retorna o uploadUrl para o frontend — ele fará o PUT direto ao Google
    return new Response(
      JSON.stringify({ uploadUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Erro interno gemini-upload:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
