/**
 * Vercel Function — Recupera o fileUri após upload resumível do browser
 * Radar Relevantia · /api/gemini-finalize
 *
 * Por que existe este endpoint?
 *   O browser faz PUT direto ao Google (Etapa 2 do upload resumível).
 *   O upload chega ao Google com sucesso (HTTP 200), mas o browser não consegue
 *   LER a resposta por CORS (Google não envia Access-Control-Allow-Origin no PUT).
 *   Este endpoint recebe o uploadUrl, consulta o Google server-to-server (sem CORS)
 *   e devolve o { fileUri } que o browser precisava mas não conseguiu ler.
 *
 * Recebe: POST { uploadUrl: string }
 * Retorna: { fileUri: string, mimeType: string }
 *
 * Variável de ambiente necessária:
 *   GEMINI_API_KEY = AIza...  (só para autorizar a consulta de status)
 */

export const maxDuration = 45;

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

  // Autenticação: Bearer JWT (Supabase)
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearerToken || bearerToken.split('.').length !== 3) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  const { uploadUrl } = req.body || {};
  if (!uploadUrl || typeof uploadUrl !== 'string') {
    return res.status(400).json({ error: 'uploadUrl é obrigatório.' });
  }

  // Segurança: garante que o uploadUrl é do Google
  if (!uploadUrl.startsWith('https://generativelanguage.googleapis.com/')) {
    return res.status(400).json({ error: 'uploadUrl inválido.' });
  }

  // Tenta até 4 vezes com backoff — pequena janela de race condition
  // entre o browser finalizar o PUT e o Google registrar o arquivo
  let fileUri = null;
  let fileMime = 'application/pdf';
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    if (attempt > 1) {
      // Backoff: 1s, 2s, 3s
      await new Promise(r => setTimeout(r, attempt * 1000));
    }

    try {
      // Consulta o status do upload (server-to-server, sem CORS)
      const queryRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': '0',
          'X-Goog-Upload-Command': 'query',
        },
      });

      const uploadStatus = queryRes.headers.get('x-goog-upload-status');

      if (uploadStatus === 'final') {
        const data = await queryRes.json().catch(() => ({}));
        fileUri  = data.file?.uri;
        fileMime = data.file?.mimeType || 'application/pdf';

        if (fileUri) break; // Sucesso

        lastError = new Error('Google retornou status final mas sem fileUri.');
        continue;
      }

      if (uploadStatus === 'active') {
        // Upload ainda em andamento (edge case: browser enviou mas ainda não finalizou)
        lastError = new Error(`Upload ainda ativo na tentativa ${attempt}.`);
        continue;
      }

      // Status desconhecido ou resposta inesperada
      const body = await queryRes.text().catch(() => '');
      lastError = new Error(`Status inesperado: ${uploadStatus ?? queryRes.status} — ${body.slice(0, 200)}`);

    } catch (err) {
      lastError = err;
      console.warn(`gemini-finalize tentativa ${attempt} falhou:`, err.message);
    }
  }

  if (!fileUri) {
    console.error('gemini-finalize: não obteve fileUri após 4 tentativas:', lastError?.message);
    return res.status(502).json({
      error: 'Não foi possível confirmar o envio do PDF. Tente novamente.',
      detail: lastError?.message,
    });
  }

  // ── Polling de state=ACTIVE ────────────────────────────────────────────
  // Mesmo com uploadStatus=final, o Google fica alguns segundos com o arquivo
  // em state=PROCESSING. Se o agente tentar usar o fileUri antes de ACTIVE,
  // o Gemini retorna HTTP 400 "File is in state PROCESSING". Aguardamos ACTIVE.
  const apiKey = process.env.GEMINI_API_KEY;
  let isActive = false;

  if (apiKey) {
    // Extrai o nome do arquivo do fileUri (ex: "files/abc123")
    const fileNameMatch = fileUri.match(/\/files\/([^/?]+)/);
    const fileName = fileNameMatch ? `files/${fileNameMatch[1]}` : null;

    if (fileName) {
      for (let attempt = 1; attempt <= 12; attempt++) {
        // Backoff progressivo: 1s, 1s, 2s, 2s, 2s, 2s, 2s, 2s, 2s, 2s, 2s, 2s
        // Máx ~21s + tempo de fetch = seguro dentro de maxDuration=45s
        const delay = attempt <= 2 ? 1000 : 2000;
        await new Promise(r => setTimeout(r, delay));

        try {
          const stateRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
          );
          if (!stateRes.ok) {
            console.warn(`gemini-finalize: status check HTTP ${stateRes.status} (tentativa ${attempt})`);
            continue;
          }
          const stateData = await stateRes.json().catch(() => ({}));
          const state = stateData.state;

          if (state === 'ACTIVE') {
            console.log(`gemini-finalize: arquivo ACTIVE após ${attempt} check(s).`);
            isActive = true;
            break;
          }
          if (state === 'FAILED') {
            console.error('gemini-finalize: Google retornou state=FAILED para', fileName);
            return res.status(502).json({
              error: 'Google não conseguiu processar o PDF. Tente com outro arquivo.',
            });
          }
          // state === 'PROCESSING' → aguarda próxima tentativa
          console.log(`gemini-finalize: arquivo ainda PROCESSING (tentativa ${attempt})`);
        } catch (err) {
          console.warn(`gemini-finalize: erro no status check (tentativa ${attempt}):`, err.message);
        }
      }

      if (!isActive) {
        // Após 12 tentativas (~22s), o arquivo ainda não ficou ACTIVE.
        // Retorna erro em vez de um fileUri inutilizável.
        console.error('gemini-finalize: arquivo nunca ficou ACTIVE após 12 tentativas:', fileUri);
        return res.status(502).json({
          error: 'O Google demorou demais para processar o PDF. Tente novamente ou use um PDF menor.',
        });
      }
    }
  }

  console.log('gemini-finalize: fileUri pronto para uso:', fileUri);
  return res.status(200).json({ fileUri, mimeType: fileMime });
}
