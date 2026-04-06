# Spec: Autenticacao

> Spec-Driven Development (SDD) — Retroactive spec describing the existing authentication system.

## Contexto

O sistema de autenticacao do Radar Relevantia gerencia login, logout, persistencia de sessao e refresh de token para tres roles distintos: **marca** (brand/sponsor), **detentor** (rightsholder/event organizer) e **admin** (platform manager). Cada role possui sua propria chave de sessao no localStorage e fluxo de autenticacao independente.

O Supabase Auth e utilizado como backend de autenticacao, com duas abordagens coexistentes: **SDK supabase-js v2** e **fetch manual direto** a API REST do Supabase Auth.

---

## Trigger

- Usuario acessa `login.html` e submete formulario de login
- Pagina protegida chama `requireAuth(role)` no carregamento
- Token de sessao expira e sistema tenta auto-refresh
- Admin acessa `admin.html` e submete formulario de login (fluxo separado)

---

## Atores

| Ator | Descricao |
|------|-----------|
| Marca | Usuario com `user_metadata.tipo = 'marca'` |
| Detentor | Usuario com `user_metadata.tipo = 'detentor'` |
| Admin | Usuario com `user_metadata.tipo = 'admin'` |

---

## Pre-condicoes

- Supabase project configurado com Auth habilitado
- Constantes `SUPABASE_URL` e `SUPABASE_KEY` definidas em `js/core.js`
- Arquivo `js/sanitize.js` carregado antes de `js/core.js` (provee `rateLimiter`)
- Usuario possui conta criada no Supabase Auth (via fluxo de aprovacao admin)

---

## Campos / Dados

### Formulario de Login (login.html)

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| email | email | Sim | Formato basico (campo HTML type=email) |
| senha | password | Sim | Nao vazio |

### Formulario de Login Admin (admin.html)

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| email | email | Sim | Formato basico |
| senha | password | Sim | Nao vazio |

### Chaves de Sessao (localStorage)

| Chave | Role | Formato |
|-------|------|---------|
| `sb_marca_session` | marca | JSON: `{ access_token, refresh_token, user, expires_at }` |
| `sb_detentor_session` | detentor | JSON: `{ access_token, refresh_token, user, expires_at }` |
| `sb_admin_session` | admin | JSON: `{ access_token, refresh_token, user, expires_at }` |

---

## Comportamento Esperado

### 1. Login de Marca/Detentor (login.html)

```
1. Usuario preenche email + senha e clica "Entrar"
2. Rate limiter verifica se pode tentar (rateLimiter('login', 5, 30))
   - Se bloqueado: exibe "Muitas tentativas. Aguarde Xs."
3. Tenta login via SDK: supabase.auth.signInWithPassword({ email, password })
4. Se SDK falha com erro de rede/timeout:
   - Fallback: fetch manual POST para /auth/v1/token?grant_type=password
   - Body: { email, password }
   - Header: apikey = SUPABASE_KEY
5. Se credenciais invalidas:
   - rateLimiter.recordFailure()
   - Exibe mensagem de erro
6. Se login OK:
   - rateLimiter.recordSuccess()
   - Persiste sessao no localStorage (chave conforme role)
   - Chama redirecionar(data)
```

### 2. Redirecionamento pos-login (funcao `redirecionar`)

```
1. Extrai tipo do user_metadata: data.user.user_metadata.tipo
2. Se tipo === 'detentor':
   a. Verifica se user_metadata.senha_provisoria === true
   b. Se sim: redirect para acesso-detentor.html (troca de senha obrigatoria)
   c. Se nao: redirect para dashboard-detentor.html
3. Se tipo === 'marca':
   a. Redirect para dashboard-marca.html
4. Se tipo nao reconhecido:
   a. Exibe erro generico
```

### 3. Login Admin (admin.html — fluxo independente)

```
1. Admin preenche email + senha
2. fetch POST para /auth/v1/token?grant_type=password
   - Nao usa SDK, sempre fetch direto
3. Se resposta OK:
   a. Verifica user.user_metadata.tipo === 'admin'
   b. Se nao admin: exibe "Acesso restrito a administradores"
   c. Se admin: salva sessao em sb_admin_session com campo expires_at calculado
   d. Chama showDashboard() -> loadAllData()
4. Se erro: exibe mensagem de credenciais invalidas
```

### 4. Auto-login (DOMContentLoaded)

```
# login.html:
1. Verifica se ja existe sessao ativa para algum role
2. Se sim: redireciona automaticamente

# admin.html:
1. Le sb_admin_session do localStorage
2. Se existe e nao expirou:
   a. Valida que user.user_metadata.tipo === 'admin'
   b. Se valido: showDashboard() automaticamente
```

### 5. Sessao e Auth Guard (core.js)

```
# getSession(role):
1. Le localStorage[SESSION_KEYS[role]]
2. Parse JSON, retorna objeto sessao ou null

# getSessionAsync(role):
1. Tenta getSession(role)
2. Se sessao existe mas token expirado:
   a. Tenta refresh via fetch POST /auth/v1/token?grant_type=refresh_token
   b. Se refresh OK: atualiza localStorage com novos tokens
   c. Se refresh falha: clearSession(role), retorna null
3. Se sessao nao existe: retorna null

# requireAuth(role, redirectTo):
1. Chama getSessionAsync(role)
2. Se nao autenticado: redirect para redirectTo (default: 'login.html')
3. Se autenticado: continua carregamento da pagina

# restoreSessionToSDK():
1. Tenta todas as roles em ordem
2. Quando encontra sessao valida:
   a. Chama supabase.auth.setSession({ access_token, refresh_token })
   b. Restaura sessao no SDK para queries que usam RLS
```

### 6. Auto-refresh de Token Admin (admin.html)

```
# getSession() no admin:
1. Le sb_admin_session
2. Calcula margem: expires_at - 60 segundos
3. Se Date.now()/1000 >= (expires_at - 60):
   a. Tenta refresh via fetch POST /auth/v1/token?grant_type=refresh_token
   b. Se OK: atualiza sessao com novos tokens e novo expires_at
   c. Se falha: retorna null (forca re-login)
4. Se dentro da validade: retorna sessao diretamente
```

### 7. InitSession em paginas protegidas (criar-oportunidade.html)

```
# initSession() — cascata 3 niveis:
1. Tenta SDK: supabase.auth.getUser()
2. Se SDK falha: tenta legacy localStorage (getSession(role))
3. Se legacy falha: tenta async refresh (getSessionAsync(role))
4. Se todos falham: redirect para login.html
5. Se sucesso: define window.currentUser com dados do usuario
```

### 8. Logout

```
# Marca/Detentor:
1. supabase.auth.signOut()
2. clearSession(role) — remove chave do localStorage
3. Redirect para index.html

# Admin:
1. Remove sb_admin_session do localStorage
2. Esconde dashboard, mostra tela de login
```

---

## Queries Supabase

### Login (manual fetch)

```
POST {SUPABASE_URL}/auth/v1/token?grant_type=password
Headers: { apikey: SUPABASE_KEY, Content-Type: application/json }
Body: { email, password }
Response: { access_token, refresh_token, user, expires_in, ... }
```

### Refresh Token

```
POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token
Headers: { apikey: SUPABASE_KEY, Content-Type: application/json }
Body: { refresh_token }
Response: { access_token, refresh_token, user, expires_in, ... }
```

### Auth Guard (sbFetch — admin)

```
Qualquer request autenticada:
Headers: {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + session.access_token,
  Content-Type: application/json
}
```

---

## Regras de Negocio

1. **Rate limiting no login**: Maximo 5 tentativas falhas antes de bloqueio de 30 segundos. Implementado via `rateLimiter('login', 5, 30)` usando localStorage (`rr_rl_login`).

2. **Separacao de sessoes por role**: Cada role tem sua propria chave no localStorage. Um mesmo navegador pode manter sessoes de roles diferentes simultaneamente.

3. **SDK + fallback manual**: O login tenta primeiro via SDK supabase-js. Se falhar por erro de rede, usa fetch direto. Ambos produzem o mesmo resultado funcional.

4. **Admin usa apenas fetch direto**: O painel admin (`admin.html`) nunca usa o SDK supabase-js para autenticacao. Todas as chamadas sao via fetch manual com `sbFetch()`.

5. **Validacao de role no admin**: Apos login bem-sucedido, verifica `user_metadata.tipo === 'admin'`. Usuarios nao-admin sao rejeitados mesmo com credenciais validas.

6. **Senha provisoria (detentor)**: Detentores com `user_metadata.senha_provisoria === true` sao redirecionados para `acesso-detentor.html` para troca obrigatoria antes de acessar o dashboard.

7. **Auto-refresh com margem**: O admin refresh ocorre 60 segundos antes da expiracao real (`expires_at - 60`), evitando tokens expirados durante operacoes.

8. **Cascata de sessao (initSession)**: Paginas protegidas tentam 3 estrategias em ordem: SDK -> legacy localStorage -> async refresh. Apenas se todas falham o usuario e redirecionado.

9. **restoreSessionToSDK()**: Bridges sessoes legacy (pre-SDK) para o SDK, garantindo que queries com RLS funcionem mesmo quando o login foi feito via fetch manual.

---

## Estados Possiveis

| Estado | Condicao |
|--------|----------|
| Nao autenticado | Nenhuma sessao no localStorage para o role |
| Autenticado (valido) | Sessao existe e `expires_at` > now |
| Token expirado | Sessao existe mas `expires_at` <= now |
| Token refresh em andamento | getSessionAsync chamado, aguardando resposta |
| Bloqueado por rate limit | `rr_rl_login.blockedUntil` > now |
| Senha provisoria | Detentor com `user_metadata.senha_provisoria = true` |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Credenciais invalidas | Supabase Auth 400 | Exibe mensagem, incrementa rate limiter |
| Rate limit atingido | localStorage rateLimiter | Exibe "Muitas tentativas. Aguarde Xs." |
| Erro de rede no login | fetch/SDK error | Tenta fallback (SDK->fetch ou vice-versa) |
| Token refresh falhou | Supabase Auth 401 | clearSession(), redirect para login |
| User nao e admin | user_metadata.tipo != 'admin' | Exibe "Acesso restrito a administradores" |
| Sessao corrompida | JSON.parse falha | Trata como sessao inexistente |

---

## Fora do Escopo

- Cadastro de novos usuarios (ver `cadastro-marca.spec.md` e `cadastro-detentor.spec.md`)
- Recuperacao de senha (ver `recuperacao-senha.spec.md`)
- Registro de embaixadores (feito pelo admin, nao e autenticacao)
- OAuth / login social (nao implementado)
- MFA / 2FA (nao implementado)
- Refresh token rotation policy no Supabase (configuracao de infra)
- RLS policies no banco (configuracao de infra)
