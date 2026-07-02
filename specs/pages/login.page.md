# Página: login.html

> **Última sincronização:** 2026-07-01 — commit `57f61b8` + mudanças locais — `redirecionar()` agora roteia admin puro para admin.html e suporta contas híbridas (admin + cliente) — Claude Code

**Rota:** `/login.html`
**Acesso:** público
**Tamanho aproximado:** 617 linhas

---

## O que é

Página de login unificada para usuários **marca** e **detentor** do Radar Relevantia. É o ponto de entrada de quem já tem conta: autentica via email/senha no Supabase Auth e redireciona para o dashboard correto conforme o tipo do usuário. Enquanto verifica se já existe sessão salva, exibe uma tela de loading com o radar animado.

O login de admin acontece normalmente dentro de `admin.html` (valida `app_metadata.tipo === 'admin'`), mas esta página tolera admins: o roteamento usa `user_metadata.tipo` (marca/detentor) e, quando ausente, cai para `app_metadata.tipo === 'admin'` → `admin.html`. Contas **híbridas** (admin + marca/detentor no mesmo email) são suportadas: vão ao portal de cliente por aqui e ao painel via `admin.html`, com a mesma senha.

## Principais funcionalidades

- Formulário de login (email + senha) com toggle de visibilidade da senha (👁/🙈) e submit via Enter.
- Auto-login: se há sessão válida em `localStorage` (`sb_detentor_session` ou `sb_marca_session`, checando `expires_at`), redireciona direto sem mostrar o formulário.
- Rate limiting client-side: `rateLimiter('login', 5, 30)` de `js/sanitize.js` — 5 tentativas, bloqueio de 30 s com contagem regressiva na mensagem de erro.
- Mensagens de erro diferenciadas: sem conexão, email não confirmado, rate limit do Supabase ("after N seconds"), email não cadastrado vs. senha incorreta (via RPC `email_registrado`).
- Suporte a parâmetro `?redirect=` na URL (apenas para marca): após login, decodifica e navega para a URL indicada.
- Links de apoio: "Esqueceu a senha?" → `esqueci-senha.html`; "Cadastre-se" → `index.html`; contato `hello@relevantia.com.br`.

## Fluxos principais

### Login com sucesso
1. Usuário preenche email/senha e clica "Entrar →" (`doLogin()`).
2. Validação local: email contém `@`, senha não vazia; senão exibe erro inline.
3. Chama `_sb.auth.signInWithPassword({ email, password })` via SDK (client `sb` de `js/core.js`; se indisponível, fallback com `fetch` direto em `/auth/v1/token?grant_type=password`, sem refresh token).
4. Sucesso: `recordSuccess()` no rate limiter; monta objeto legado (`access_token`, `refresh_token`, `expires_at`, `user`) e chama `redirecionar(data)`.
5. `redirecionar` lê `user_metadata.tipo`:
   - `detentor` → salva `sb_detentor_session`, remove `sb_marca_session`/`sb_admin_session`; vai para `acesso-detentor.html` se `senha_provisoria === true`, senão `dashboard-detentor.html`.
   - `marca` → salva `sb_marca_session`, remove as outras; vai para `acesso-marca.html` se `senha_provisoria === true`, senão para `?redirect=` (se presente) ou `dashboard-marca.html`.
   - Sem papel de cliente **mas** `app_metadata.tipo === 'admin'` → salva `sb_admin_session` e vai para `admin.html` (contas admin puras). Contas **híbridas** (papel de cliente marca/detentor + `app_metadata.tipo=admin`) caem nos ramos acima e vão para o portal de cliente; o painel admin fica acessível direto em `admin.html` com a mesma senha.
   - Sem tipo e sem admin → toast de erro "Conta sem tipo definido. Contate hello@relevantia.com.br" (não redireciona).

### Login com falha
1. Erro do Supabase → `recordFailure()` no rate limiter.
2. Se a mensagem não indica rede/email não confirmado/rate limit, consulta RPC `email_registrado` (`POST /rest/v1/rpc/email_registrado` com `p_email`) para distinguir "email não cadastrado" de "senha incorreta".
3. Se a RPC falha, cai no genérico "Email ou senha incorretos.".

### Auto-login (init)
1. `init()` roda no load: tenta `sb_detentor_session` e depois `sb_marca_session` no `localStorage`.
2. Sessão com `expires_at` futuro → redireciona conforme tipo e `senha_provisoria` (mesma lógica acima); sessão expirada/corrompida é removida.
3. Sem sessão válida → esconde `#loadingScreen` e exibe `#loginPage`.

## Dados (Supabase e APIs)

| Tipo | Nome | Uso |
|------|------|-----|
| Auth (SDK) | `signInWithPassword` | autenticação email/senha; SDK guarda sessão com auto-refresh |
| Auth (REST) | `POST /auth/v1/token?grant_type=password` | fallback de login se SDK indisponível (sem refresh) |
| RPC | `email_registrado` | após falha de login, verifica se o email existe para mensagem de erro mais útil |

## Dependências

- **Scripts compartilhados:** `js/core.js` (SUPABASE_URL, SUPABASE_KEY, client `sb`), `js/sanitize.js` (`rateLimiter`), SDK `@supabase/supabase-js@2` via CDN.
- **Navega de/para:** `esqueci-senha.html`, `index.html` (cadastro), `acesso-detentor.html`, `acesso-marca.html`, `dashboard-detentor.html`, `dashboard-marca.html`, URL de `?redirect=` (marca).

## Regras de negócio importantes

- Sessões em `localStorage` são mutuamente exclusivas: ao logar, as chaves dos outros perfis (`sb_detentor_session`/`sb_marca_session`/`sb_admin_session`) são removidas.
- `senha_provisoria === true` em `user_metadata` desvia o usuário para as páginas de primeiro acesso (`acesso-detentor.html` / `acesso-marca.html`) antes de liberar o dashboard.
- O parâmetro `?redirect=` só é honrado para usuários tipo **marca** (tanto no login quanto no auto-login).
- Roteamento por `user_metadata.tipo` (editável pelo usuário na teoria); a checagem confiável por `app_metadata` fica nas páginas de destino/admin.
- Resposta 4xx do login nunca revela diretamente se o email existe — a distinção vem da RPC `email_registrado`, que é exposta publicamente (com `apikey` anon).

## Pendências e dívidas conhecidas

- A RPC `email_registrado` permite enumeração de emails cadastrados por qualquer cliente com a anon key (trade-off consciente de UX vs. privacidade — não confirmado se há rate limit no banco).
- O rate limiter é apenas client-side (localStorage); não bloqueia tentativas via API direta.
- O fallback sem SDK não armazena refresh token — sessão expira sem renovação automática.
- Auto-login confia em `expires_at` do `localStorage` sem validar o token no servidor; token revogado só falha na página de destino.

---

*Ao modificar esta página, atualize este spec no mesmo commit (regra no CLAUDE.md da raiz). Rode `specs/check-freshness.sh` para verificar specs defasadas.*
