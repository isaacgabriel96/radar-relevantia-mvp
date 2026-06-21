// Vercel Edge Middleware — proteção por senha do Pitch Deck
// Escopo: SOMENTE as páginas do deck (matcher abaixo). Não afeta nenhuma
// outra página, asset ou /api do Radar.
//
// Como ativar a senha:
//   1. No painel da Vercel → Settings → Environment Variables, crie
//      PITCH_DECK_PASSWORD = <senha que vocês vão usar>
//   2. Redeploy. A partir daí o navegador pede usuário/senha (Basic Auth)
//      ao abrir /pitch-deck-pt.html ou /pitch-deck-en.html.
//      (usuário pode ser qualquer coisa; o que vale é a senha)
//
// Se PITCH_DECK_PASSWORD NÃO estiver definida, o middleware deixa passar
// (o deck continua protegido pelo gate de admin client-side). Ou seja:
// definir a env var = "ligar" a senha; não definir = nada quebra.

export const config = {
  matcher: ['/pitch-deck-pt.html', '/pitch-deck-en.html'],
};

export default function middleware(request) {
  const expected = process.env.PITCH_DECK_PASSWORD;

  // Senha não configurada → não bloqueia (mantém o gate de admin do HTML)
  if (!expected) return;

  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (scheme === 'Basic' && encoded) {
    let pass = '';
    try {
      const decoded = atob(encoded); // "usuario:senha"
      pass = decoded.slice(decoded.indexOf(':') + 1);
    } catch (_) { /* token malformado → cai no 401 */ }
    if (pass === expected) return; // autorizado → segue para o arquivo
  }

  return new Response('Acesso restrito — Radar Pitch Deck', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Radar Pitch Deck", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
