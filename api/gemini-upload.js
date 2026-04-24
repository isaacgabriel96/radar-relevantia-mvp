/**
 * Vercel Edge Function — Proxy de upload para a Gemini Files API
 * Radar Relevantia · /api/gemini-upload
 *
 * Fluxo (Edge Function — sem limite de body, streaming):
 *   1. Frontend POST aqui com o binário do PDF (Content-Type: application/pdf)
 *      Headers: X-File-Name, X-File-Size, X-Mime-Type
 *   2. Esta Edge Function inicia upload resumível no Google e faz proxy do binário
 *   3. Retorna { fileUri, mimeType } quando o upload conclui
 *
 * Por que Edge Function?
 *   - Serverless functions têm limite de 4.5MB no body (não configurável)
 *   - Edge Functions usam Streams API e não têm esse limite
 *   - O upload binário vai direto daqui para o Google (server-to-server, sem CORS)
 *
 * Variável de ambiente necessária no painel da Vercel:
 *   GEMINI_API_KEY = AIza...
 */

export const config = { runtime: 'edge' };

const UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://radar.relevantia.com.br',
    'https://www.radar.relevantia.com.br',
  ];

  const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-File-Size, X-Mime-Type',
  };

  // Em dev ou origins permitidas, reflete o origin
  const isDev = !req.headers.get('x-vercel-deployment-url'); // heurística simples
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const fileName = req.headers.get('x-file-name') || 'upload.pdf';
    const mimeType = req.headers.get('x-mime-type') || 'application/pdf';
    const fileSize = req.headers.get('x-file-size');

    if (!fileSize) {
      return new Response(JSON.stringify({ error: 'Header X-File-Size é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Etapa 1: inicia upload resumível — Google retorna uploadUrl no header
    const initRes = await fetch(`${UPLOAD_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
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

    // Etapa 2: faz proxy do body binário direto para o Google (server-to-server)
    // O req.body já é um ReadableStream — passamos direto sem bufferizar
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
      },
      body: req.body,        // stream direto — sem bufferizar em memória
      duplex: 'half',        // necessário para streaming request body no fetch
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('Gemini upload PUT error:', uploadRes.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `Upload falhou (HTTP ${uploadRes.status})`, detail: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await uploadRes.json().catch(() => ({}));
    const fileUri = data.file?.uri;

    if (!fileUri) {
      console.error('Gemini upload: fileUri ausente na resposta', JSON.stringify(data).slice(0, 300));
      return new Response(JSON.stringify({ error: 'Google não retornou fileUri após upload.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ fileUri, mimeType: data.file?.mimeType || mimeType }),
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
