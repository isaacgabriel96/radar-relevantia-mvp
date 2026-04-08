# Arquitetura — Radar Relevantia MVP

> Spec-Driven Development (SDD) — Retroactive architecture overview based on actual code analysis.

## Visao Geral

O Radar Relevantia e um marketplace de patrocinio que conecta **marcas** (sponsors) a **detentores** (rightsholders/event organizers). A arquitetura e **100% frontend** — nao ha servidor de aplicacao (Node, Python, etc.). Toda a logica de negocio vive em HTML/JS vanilla com Supabase como backend-as-a-service.

```
+-------------------+     +--------------------+     +------------------+
|   Browser (SPA)   | --> | Supabase Platform   | --> | PostgreSQL DB    |
|   HTML + JS       |     |  - Auth             |     |  - Tables        |
|   Tailwind CSS    |     |  - REST API         |     |  - RLS Policies  |
|                   |     |  - Storage          |     |  - Functions     |
|                   |     |  - Edge Functions   |     |                  |
+-------------------+     +--------------------+     +------------------+
```

---

## Stack Tecnologico

| Camada | Tecnologia | Versao/Nota |
|--------|------------|-------------|
| **Frontend** | HTML5 + JavaScript vanilla | Sem framework (nao usa React, Vue, etc.) |
| **Estilo** | Tailwind CSS (embutido) + CSS inline | Sem arquivo CSS separado |
| **Design System** | Tokens CSS customizados | v3.2 — Poppins + DM Sans + gold gradient |
| **Backend** | Supabase | PostgreSQL + Auth + Storage + Edge Functions |
| **SDK** | supabase-js v2 | CDN: `@supabase/supabase-js@2` |
| **Auth** | Supabase Auth | Email/password, sem OAuth |
| **Storage** | Supabase Storage | Bucket `oportunidades` para fotos/PDF |
| **Serverless** | Supabase Edge Functions | Deno runtime |
| **Deploy** | Statico | Servido como arquivos HTML estaticos |

---

## Estrutura de Arquivos

```
MVP/
  |-- index.html                  # Landing page publica
  |-- login.html                  # Login (marca + detentor)
  |-- cadastro-marca.html         # Cadastro marca (4 steps)
  |-- cadastro-detentor.html      # Cadastro detentor
  |-- esqueci-senha.html          # Solicitar recuperacao de senha
  |-- nova-senha.html             # Redefinir senha (via token)
  |-- acesso-detentor.html        # Troca de senha provisoria (detentor)
  |-- acesso-marca.html           # Primeiro acesso marca
  |-- dashboard-marca.html        # Dashboard da marca
  |-- dashboard-detentor.html     # Dashboard do detentor
  |-- criar-oportunidade.html     # Criar/editar oportunidade
  |-- oportunidade-detalhe.html   # Pagina publica de detalhe
  |-- admin.html                  # Painel administrativo
  |
  |-- js/
  |    |-- core.js                # Supabase client, auth, API layer
  |    |-- sanitize.js            # Validacao, escape, rate limiting
  |    `-- shared-state.js        # Estado compartilhado entre componentes
  |
  |-- logos/
  |    `-- 5.png                  # Logo wordmark (branca)
  |
  |-- specs/                      # Especificacoes SDD (este diretorio)
  |    |-- features/
  |    |    |-- _TEMPLATE.spec.md
  |    |    |-- autenticacao.spec.md
  |    |    |-- cadastro-marca.spec.md
  |    |    |-- cadastro-detentor.spec.md
  |    |    |-- recuperacao-senha.spec.md
  |    |    |-- criar-oportunidade.spec.md
  |    |    |-- negociacao.spec.md
  |    |    `-- admin.spec.md
  |    |-- data-models/
  |    |    |-- negociacoes.schema.md
  |    |    `-- oportunidades.schema.md
  |    `-- ARCHITECTURE.md        # Este arquivo
```

---

## Modelo de Dados (PostgreSQL)

### Tabelas Principais

```
auth.users                # Supabase Auth (marca, detentor, admin)
  |
  |-- perfis              # Perfil de exibicao (nome, slug, avatar)
  |
  |-- marcas_waitlist     # Cadastros pendentes de marcas
  |-- detentores_waitlist # Cadastros pendentes de detentores
  |
  |-- oportunidades       # Oportunidades de patrocinio
  |     |
  |     |-- negociacoes         # Negociacoes marca<->detentor
  |     |     |-- contrapartidas     # Itens negociados
  |     |     |-- rodadas_negociacao # Historico de propostas (imutavel)
  |     |     `-- mensagens          # Thread de comunicacao
  |
  |-- embaixadores        # Embaixadores/afiliados
  `-- codigos_convite     # Codigos de acesso para cadastro
```

### Tabelas de Suporte

| Tabela | Descricao | Gerenciada por |
|--------|-----------|----------------|
| `marcas_waitlist` | Cadastros pendentes de marcas | cadastro-marca.html -> admin.html |
| `detentores_waitlist` | Cadastros pendentes de detentores | cadastro-detentor.html -> admin.html |
| `embaixadores` | Parceiros de indicacao | admin.html |
| `codigos_convite` | Codigos "RR-XXXX" para cadastro | admin.html |
| `perfis` | Dados publicos de exibicao | Interno |

---

## Sistema de Autenticacao

### Tres Roles Independentes

| Role | Session Key | Tipo Auth.users | Dashboard |
|------|-------------|-----------------|-----------|
| Marca | `sb_marca_session` | `user_metadata.tipo = 'marca'` | `dashboard-marca.html` |
| Detentor | `sb_detentor_session` | `user_metadata.tipo = 'detentor'` | `dashboard-detentor.html` |
| Admin | `sb_admin_session` | `user_metadata.tipo = 'admin'` | `admin.html` |

### Dual Auth Pattern

O sistema mantem duas estrategias de autenticacao que coexistem:

1. **SDK supabase-js**: `supabase.auth.signInWithPassword()`, `supabase.auth.getUser()`, etc.
2. **Fetch manual direto**: `fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', ...)`

O login tenta SDK primeiro e faz fallback para fetch manual em caso de erro de rede. O admin usa APENAS fetch manual.

### Cascata de Sessao (3 niveis)

```
1. SDK (supabase.auth.getUser())
   |-- sucesso -> usa sessao SDK
   |-- falha --v
2. Legacy localStorage (getSession(role))
   |-- sessao valida -> usa sessao
   |-- expirada ou ausente --v
3. Async refresh (getSessionAsync(role))
   |-- refresh OK -> atualiza localStorage
   |-- refresh falha -> redirect para login
```

### restoreSessionToSDK()

Bridge que converte sessoes legacy (armazenadas via fetch manual) para o SDK, permitindo que queries com RLS funcionem corretamente.

---

## Fluxo de Dados Principal

```
1. CADASTRO
   Visitante -> cadastro-marca/detentor.html -> INSERT waitlist (status: pendente)

2. APROVACAO
   Admin -> admin.html -> atualizarStatus(table, id, 'aprovado')
     -> Edge Function 'admin-actions' (create-user-and-send-access)
     -> Cria conta auth.users + envia email com credenciais

3. LOGIN
   Usuario -> login.html -> SDK/fetch -> localStorage session
     -> redirect para dashboard

4. CRIAR OPORTUNIDADE
   Detentor -> criar-oportunidade.html -> INSERT oportunidades
     -> Upload fotos/PDF para Storage

5. NEGOCIACAO
   Marca -> oportunidade-detalhe.html -> createNegociacao()
     -> Thread de mensagens, contrapartidas, rodadas
     -> Upload contrato -> Admin valida

6. CATALOGO
   Marca -> dashboard-marca.html -> fetchCatalog()
     -> Lista oportunidades (ativo=true, visibilidade != 'convidadas')
```

---

## Edge Functions (Supabase)

| Nome | Trigger | Descricao |
|------|---------|-----------|
| `admin-actions` | POST via `adminAction()` | Acoes admin: `update-status`, `create-user-and-send-access` |
| `send-password-reset` | POST via `esqueci-senha.html` | Envia email de recuperacao de senha |

### admin-actions

- **update-status**: Atualiza `status` em `marcas_waitlist` ou `detentores_waitlist`
- **create-user-and-send-access**: Cria conta `auth.users` com `user_metadata.tipo` correto, envia email com credenciais de acesso

### send-password-reset

- Recebe `{ email }` no body
- Usa Supabase Admin API para gerar link de recuperacao
- Envia email (SMTP configurado no Supabase)
- Retorna 200 independente de o email existir (seguranca)

---

## Supabase Storage

### Bucket: `oportunidades`

| Conteudo | Path | Limite |
|----------|------|--------|
| Fotos | `oportunidades/{oppId}/{timestamp}-{index}.{ext}` | Sem limite explicito |
| PDF Media Kit | `oportunidades/opp-{oppId}-midia-kit-{safeName}` | Max 20MB |

### Acesso

- Upload: via token de auth do usuario (`_getWriteToken()`)
- Leitura: URLs publicas (geradas apos upload)

---

## Decisoes Tecnicas Importantes

### 1. Sem Framework Frontend

**Decisao**: HTML/JS vanilla, sem React/Vue/Angular.
**Justificativa inferida**: Simplicidade, sem build step, deploy como arquivos estaticos.
**Consequencia**: Cada pagina e autocontida. Compartilhamento de codigo via `<script src="js/core.js">`.

### 2. Sessao via localStorage (nao cookies)

**Decisao**: Tokens JWT armazenados em `localStorage` por role.
**Justificativa inferida**: Separacao de sessoes por role, compatibilidade com SPA estatico.
**Consequencia**: Vulneravel a XSS (mitigado por `escapeHtml()`). Nao funciona cross-tab automaticamente.

### 3. Dual Auth (SDK + fetch manual)

**Decisao**: Manter duas estrategias de autenticacao coexistindo.
**Justificativa inferida**: O SDK tem bugs/limitacoes em certos cenarios; fetch manual como fallback robusto.
**Consequencia**: Complexidade adicional. Necessidade de `restoreSessionToSDK()` para bridge.

### 4. JSONB para Cotas (denormalizado)

**Decisao**: `cotas_data` como JSONB na tabela `oportunidades`, nao tabela separada.
**Justificativa inferida**: Simplicidade, cotas sao parte integral da oportunidade.
**Consequencia**: Queries por cota especifica requerem parsing JSONB. Beneficios acessados via `fetchCotaBeneficios()`.

### 5. Rodadas Imutaveis

**Decisao**: `rodadas_negociacao` sao append-only com snapshot JSONB de contrapartidas.
**Justificativa inferida**: Historico auditavel de negociacao, nenhuma parte pode alterar proposta retroativamente.
**Consequencia**: Crescimento de dados (cada rodada armazena copia completa das contrapartidas).

### 6. Waitlist Pattern (nao self-service)

**Decisao**: Cadastro gera registro em waitlist; conta Auth criada pelo admin.
**Justificativa inferida**: Controle de qualidade e curadoria de quem entra na plataforma.
**Consequencia**: Atrito no onboarding. Dependencia do admin para ativar usuarios.

### 7. Admin como HTML separado

**Decisao**: `admin.html` e um arquivo independente com auth e UI proprios.
**Justificativa inferida**: Isolamento de seguranca, admin nao compartilha codigo com area publica.
**Consequencia**: Duplicacao de patterns (auth, fetch wrappers). Admin nao usa SDK.

### 8. Zero Credentials no Frontend (REGRA OBRIGATORIA)

**Decisao**: Nenhuma chave sensivel, service role key, secret, API key privada, token de servico externo ou credencial de qualquer tipo pode existir no codigo frontend (HTML, JS, CSS — inline ou em arquivos).
**Regra**: O frontend usa APENAS:
- `SUPABASE_URL` — endpoint publico (nao e segredo)
- `SUPABASE_KEY` — anon key (publica por design, protegida por RLS)
- Tokens JWT de sessao do usuario autenticado (gerados pelo Supabase Auth, expiram)

**O que NUNCA deve estar no frontend**:
- `service_role` key do Supabase
- Senhas de banco de dados
- API keys de servicos externos (SMTP, SendGrid, Twilio, etc.)
- Tokens de admin ou tokens com permissoes elevadas
- Qualquer segredo de ambiente (`.env` nao e lido pelo browser)

**Como expor operacoes privilegiadas**: Delegar 100% a Edge Functions (Deno runtime no Supabase), que recebem o token JWT do usuario, validam permissoes, e executam com service_role no servidor. O frontend chama a Edge Function — nunca o endpoint privilegiado diretamente.
**Consequencia**: Toda nova operacao que requer permissao elevada deve ser implementada como Edge Function. Nunca como "atalho" no frontend.

### 9. Favoritos no localStorage

**Decisao**: Sistema de favoritos usa `localStorage` (chave `rr_favoritos_v1`), nao persiste no banco.
**Justificativa inferida**: Simplicidade, sem necessidade de tabela adicional para MVP.
**Consequencia**: Favoritos perdidos ao trocar de dispositivo/browser. Nao sincroniza.

---

## Seguranca

### Implementado

| Medida | Onde | Descricao |
|--------|------|-----------|
| HTML Escaping | `sanitize.js` | `escapeHtml()` previne XSS em interpolacoes |
| CNPJ Checksum | `sanitize.js` | `validateCNPJ()` com algoritmo modulo 11 completo |
| Rate Limiting (login) | `sanitize.js` | `rateLimiter('login', 5, 30)` — 5 tentativas, 30s bloqueio |
| URL Sanitization | `sanitize.js` | `sanitizeURLParam()` remove tags HTML e limita comprimento |
| File Validation | `sanitize.js` | `validateFileUpload()` valida tipo, extensao, tamanho |
| Email Enum Prevention | `esqueci-senha.html` | Resposta identica para email existente ou inexistente |
| Token in Hash | `nova-senha.html` | Access token no fragment (nao query string) |
| Admin Role Check | `admin.html` | Verifica `user_metadata.tipo === 'admin'` apos login |
| FREE_DOMAINS | `cadastro-marca.html` | Bloqueia emails pessoais no cadastro de marca |
| Token Margin | `admin.html` | Refresh 60s antes da expiracao |
| **Zero Credentials no Frontend** | Arquitetura geral | Service role key, secrets e API keys privadas **NUNCA** no frontend — somente em Edge Functions |

### Nao Implementado / Limitacoes

| Item | Status | Risco |
|------|--------|-------|
| Content Security Policy | Ausente | XSS via recursos externos |
| CSRF Protection | N/A (no server) | Nao aplicavel em SPA statico |
| Rate Limiting (esqueci-senha) | Ausente | Abuso de envio de emails |
| Rate Limiting (cadastro) | Ausente | Spam de cadastros |
| Supabase RLS | Nao documentado | Depende da configuracao no Supabase Dashboard |
| Input sanitization (server) | Depende de RLS/policies | Frontend-only e insuficiente |

---

## Internacionalizacao (i18n)

- Funcoes `initLang()` e `applyTranslations()` presentes em paginas como `criar-oportunidade.html`
- Sistema de traducao existe mas nao e spec'd em detalhe
- Idioma default: Portugues brasileiro

---

## Codigos de Convite (Embaixadores)

### Fluxo Completo

```
1. Admin cria embaixador em admin.html:
   - Nome, email, telefone, comissao (default 5%)
   - Codigo gerado: gerarCodigoRR() -> "RR-XXXX"
   - Charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' (sem ambiguos: I,O,0,1)

2. Embaixador compartilha codigo com potenciais usuarios

3. Detentor usa codigo no cadastro (obrigatorio)
   Marca usa codigo no cadastro (opcional)

4. Codigo validado contra tabela codigos_convite (ativo=true)
```

### Tabela: codigos_convite

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `codigo` | text (PK ou unique) | Formato "RR-XXXX" |
| `ativo` | boolean | Se o codigo pode ser usado |

### Tabela: embaixadores

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | integer/uuid | PK |
| `nome` | text | Nome do embaixador |
| `email` | text | Email (validado) |
| `tel` | text | Telefone |
| `comissao` | numeric | Percentual de comissao (default: 5) |
| `codigo_acesso` | text | Codigo "RR-XXXX" associado |
| `ativo` | boolean | Se o embaixador esta ativo |

---

## Fluxo de Aprovacao (Admin)

```
+------------------+     +---------+     +-------------------+
| Waitlist         | --> | Admin   | --> | Edge Function     |
| (marcas/detentor)|     | Review  |     | admin-actions     |
| status: pendente |     |         |     |                   |
+------------------+     +---------+     +-------------------+
                              |                    |
                    atualizarStatus()     create-user-and-send-access
                              |                    |
                         status='aprovado'    Cria auth.users
                                              Envia email
                                              com credenciais
```

### statusBadge()

| status | Classe CSS | Cor |
|--------|------------|-----|
| `pendente` | badge-yellow | Amarelo |
| `aprovado` | badge-green | Verde |
| `rejeitado` | badge-red | Vermelho |
| `novo` | badge-blue | Azul |

---

## Patterns Recorrentes

### 1. SDK-First + Legacy Fallback

Presente em: login, fetchNegociacoes, qualquer operacao auth.

```javascript
// Tenta SDK
try {
  var { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
} catch (sdkError) {
  // Fallback: fetch manual com token do localStorage
  var session = getSession(role);
  var response = await fetch(SUPABASE_URL + '/rest/v1/table', {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + session.access_token
    }
  });
  return await response.json();
}
```

### 2. Session Per Role

Cada role tem sua propria chave no localStorage, permitindo sessoes simultaneas.

### 3. escapeHtml() em Todo Output

Qualquer dado de usuario/API interpolado em HTML passa por `escapeHtml()` antes de ser inserido via `innerHTML`.

### 4. Edge Functions para Operacoes Privilegiadas

Operacoes que requerem service_role key (criar usuario, enviar email) sao delegadas a Edge Functions, nunca expostas no frontend.

### 5. Formulario em Arquivo Unico

Cada pagina e um arquivo HTML autocontido com HTML + CSS (Tailwind) + JS inline. Nao ha build step, bundling, ou module system.

---

## Limitacoes Conhecidas do MVP

1. **Sem real-time**: Mensagens e atualizacoes de negociacao sao carregadas via fetch (polling manual), nao via Supabase Realtime.

2. **Sem notificacoes**: Nenhum sistema de notificacao push, email automatico de novas mensagens, ou alertas in-app.

3. **Favoritos locais**: Sistema de favoritos baseado em localStorage, perdido ao trocar de dispositivo.

4. **Sem busca full-text**: O catalogo nao implementa busca textual nas oportunidades.

5. **Sem paginacao**: Listas de negociacoes e catalogo carregam todos os registros de uma vez.

6. **Sem edicao de perfil**: Nao ha tela para o usuario editar seus proprios dados apos cadastro.

7. **Sem historico de mudancas de status**: Status de negociacao muda sem log auditavel (exceto rodadas).

8. **Deploy manual**: Sem CI/CD configurado — deploy e copia de arquivos estaticos.
