# Spec: Painel Admin

> Spec-Driven Development (SDD) — Retroactive spec describing the existing admin panel.

**Versão:** 1.0
**Status:** `implemented`
**Autor:** Isaac Araujo
**Data:** 2026-03-01
**Arquivo de implementação:** `admin.html`

---

## 1. Visão Geral

> Painel de administração centralizado do Radar Relevantia, acessível apenas para usuários com `user_metadata.tipo === 'admin'`, que gerencia embaixadores, aprovação de marcas e detentores, validação de contratos e visualização de atividade recente.

**Problema que resolve:**
> Operadores da plataforma precisam de uma interface segura e unificada para aprovar novos usuários, gerenciar embaixadores, validar contratos de patrocínio e monitorar a saúde geral do sistema — sem expor credenciais de service role no frontend.

**Critério de sucesso:**
> Admin consegue: (1) aprovar/rejeitar marcas e detentores da waitlist criando contas Supabase Auth automaticamente; (2) gerenciar embaixadores e seus códigos de convite; (3) validar ou rejeitar contratos submetidos em negociações; (4) visualizar métricas e atividade recente do sistema.

---

## 2. Atores e Roles

| Ator | Role | Ação permitida |
|------|------|----------------|
| Admin | `admin` (`user_metadata.tipo === 'admin'`) | Todas as ações descritas neste spec |
| Público (não autenticado) | — | Nenhuma — redireciona para tela de login |

> Apenas `admin` acessa esta feature. Marca e Detentor não têm acesso.

---

## 3. Pré-condições

- [ ] Usuário possui conta no Supabase Auth com `user_metadata.tipo = 'admin'`
- [ ] Constantes `SUPABASE_URL` e `SUPABASE_KEY` definidas em `js/core.js`
- [ ] Edge Function `admin-actions` deployada no projeto Supabase
- [ ] Arquivo `js/sanitize.js` carregado (provê `escapeHtml`)
- [ ] Tabelas existentes: `embaixadores`, `codigos_convite`, `marcas_waitlist`, `detentores_waitlist`, `negociacoes`

---

## 4. Fluxo Principal

### 4.1 Autenticação Admin

**Trigger:** Admin acessa `admin.html` diretamente via URL.

```
1. DOMContentLoaded: verifica sb_admin_session no localStorage
2. Se sessão existe:
   a. Valida user_metadata.tipo === 'admin'
   b. Verifica expiração (getSession() faz auto-refresh se necessário)
   c. Se válido: showDashboard(session) → loadAllData()
3. Se não existe: exibe tela de login
4. Admin preenche email + senha e clica "Entrar"
5. fetch POST {SUPABASE_URL}/auth/v1/token?grant_type=password
6. Se resposta OK:
   a. Verifica user.user_metadata.tipo === 'admin'
   b. Se não admin: exibe "Acesso restrito a administradores"
   c. Se admin: calcula expires_at = Date.now()/1000 + expires_in
   d. Salva { access_token, refresh_token, user, expires_at } em sb_admin_session (localStorage)
   e. showDashboard(data) → loadAllData()
7. Se erro de credenciais: exibe mensagem de erro
```

**Estado final esperado:**
- UI: dashboard visível com seção "overview" ativa, nome do admin no nav
- localStorage: `sb_admin_session` = `{ access_token, refresh_token, user, expires_at }`

---

### 4.2 Dashboard Overview

**Trigger:** Login bem-sucedido ou clique em "Overview" no sidebar.

```
1. loadAllData() executa em paralelo via Promise.all:
   [ loadStats(), loadRecentActivity(), loadEmbaixadores(),
     loadMarcas(), loadDetentores(), loadDeals() ]
2. loadStats() busca contagens:
   a. GET embaixadores?ativo=eq.true&select=id (count)
   b. GET marcas_waitlist?status=eq.pendente&select=id (count)
   c. GET detentores_waitlist?status=eq.pendente&select=id (count)
   d. GET negociacoes com contrato_url not null e contrato_validado = false (count)
3. Renderiza cards de métricas: total embaixadores, marcas pendentes,
   detentores pendentes, contratos pendentes
4. loadRecentActivity() busca últimas 5 marcas + últimas 5 detentores
   ordenadas por created_at desc, exibe top 8 no feed
```

**Estado final esperado:**
- UI: 4 cards de stats + lista de atividade recente

---

## 5. Fluxos por Seção

### 5.1 Seção: Embaixadores

#### 5.1.1 Listar Embaixadores

```
1. loadEmbaixadores(): GET /rest/v1/embaixadores?select=*&order=created_at.desc
2. Renderiza tabela com: nome, email, código (RR-XXXX), comissão %, status (ativo/inativo),
   ações (ativar/desativar, excluir)
```

#### 5.1.2 Criar Embaixador

**Trigger:** Admin clica "Novo Embaixador" → preenche formulário → clica "Salvar".

```
1. Valida campos: nome (obrigatório), email (obrigatório, formato válido),
   comissao_percent (número 0–100)
2. gerarCodigoRR(): gera string RR-XXXX com charset sem ambiguidade
   (charset: ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
3. POST /rest/v1/embaixadores com: { nome, email, comissao_percent, codigo: 'RR-XXXX', ativo: true }
4. Se sucesso: POST /rest/v1/codigos_convite com: { codigo: 'RR-XXXX', embaixador_id, ativo: true }
5. Fecha modal, recarrega lista, exibe feedback de sucesso
```

#### 5.1.3 Ativar / Desativar Embaixador

```
1. Admin clica toggle de status
2. PATCH /rest/v1/embaixadores?id=eq.{id} com { ativo: !ativo }
3. Atualiza UI inline (sem reload completo)
```

#### 5.1.4 Excluir Embaixador

```
1. Admin clica "Excluir" → confirm dialog: "Excluir embaixador {nome}?"
2. Se confirmado: DELETE /rest/v1/embaixadores?id=eq.{id}
3. Remove linha da tabela, exibe feedback
```

---

### 5.2 Seção: Marcas (Waitlist)

#### 5.2.1 Listar Marcas

```
1. loadMarcas(): GET /rest/v1/marcas_waitlist?select=*&order=created_at.desc
2. Suporta filtro por status (pendente | aprovado | rejeitado) via select dropdown
3. Renderiza tabela com: empresa, email, nome, data de cadastro, status, ações
```

#### 5.2.2 Ver Perfil de Marca

```
1. Admin clica "Ver perfil" → abre modal com todos os dados da marca
2. Exibe campos: nome, empresa, email, telefone, segmento, descrição, etc.
```

#### 5.2.3 Aprovar Marca

**Trigger:** Admin clica "Aprovar" em uma marca com status `pendente`.

```
1. atualizarStatus('marcas_waitlist', id, 'aprovado', rowId)
2. Chama adminAction('update-status', { table: 'marcas_waitlist', id, status: 'aprovado' })
   → Edge Function admin-actions valida token + atualiza registro
3. Se update-status OK: chama criarContaEEnviarAcesso('marcas_waitlist', id)
4. criarContaEEnviarAcesso: adminAction('create-user-and-send-access', { table, id })
   → Edge Function cria conta Supabase Auth + envia email de acesso para a marca
5. Atualiza UI: badge de status muda para "aprovado", botões de ação removidos
```

#### 5.2.4 Rejeitar Marca

```
1. Admin clica "Rejeitar"
2. atualizarStatus('marcas_waitlist', id, 'rejeitado', rowId)
3. Chama adminAction('update-status', ...) apenas (não cria conta)
4. Atualiza UI: badge muda para "rejeitado"
```

---

### 5.3 Seção: Detentores (Waitlist)

> Fluxo idêntico ao de Marcas (5.2), com as seguintes diferenças:

- Tabela: `detentores_waitlist`
- Campos específicos: tipo de espaço, capacidade, localização, etc.

#### 5.3.1 Reenviar Acesso (exclusivo de detentores aprovados)

```
1. Disponível apenas para detentores com status = 'aprovado'
2. Admin clica "Reenviar acesso"
3. criarContaEEnviarAcesso('detentores_waitlist', id)
4. Chama adminAction('create-user-and-send-access', { table, id })
   → Re-executa criação/reenvio de email de acesso
5. Exibe feedback de sucesso
```

---

### 5.4 Seção: Deals (Contratos)

#### 5.4.1 Listar Deals com Contrato

```
1. loadDeals(): GET /rest/v1/negociacoes com join:
   ?select=id,marca_id,detentor_id,oportunidade_id,
     contrato_url,contrato_validado,contrato_enviado_por,
     contrato_validado_por,contrato_validado_em,admin_comentario,
     marca:marca_id(nome,empresa),
     detentor:detentor_id(nome,empresa),
     oportunidade:oportunidade_id(titulo,categoria),
     contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por)
   &contrato_url=not.is.null
   &order=contrato_enviado_em.desc
2. Renderiza lista de deals com: partes, oportunidade, contrapartidas, link do contrato, status
```

#### 5.4.2 Aprovar Contrato

**Trigger:** Admin revisa contrato e clica "Validar".

```
1. aprovarContrato(negId)
2. PATCH /rest/v1/negociacoes?id=eq.{negId} com:
   { contrato_validado: true,
     contrato_validado_em: new Date().toISOString(),
     contrato_validado_por: session.user.id }
3. Atualiza UI: badge muda para "Validado", botões de ação ocultados
```

#### 5.4.3 Rejeitar Contrato

**Pré-condição:** `admin_comentario` preenchido (obrigatório antes de rejeitar).

```
1. Admin preenche campo "Comentário do admin" e clica "Rejeitar"
2. Valida que admin_comentario não está vazio
3. Se vazio: exibe erro "Adicione um comentário antes de rejeitar"
4. rejeitarContrato(negId)
5. PATCH /rest/v1/negociacoes?id=eq.{negId} com:
   { contrato_url: null,
     contrato_validado: false,
     contrato_enviado_por: null,
     admin_comentario: <comentario> }
6. Atualiza UI: deal volta ao estado "sem contrato"
```

#### 5.4.4 Salvar Comentário

```
1. Admin digita comentário e clica "Salvar comentário"
2. salvarComentario(negId)
3. PATCH /rest/v1/negociacoes?id=eq.{negId} com { admin_comentario: <texto> }
4. Exibe feedback de sucesso inline
```

---

### 5.5 Seção: Páginas

> Seção de gerenciamento de páginas estáticas/configurações da plataforma. Documentação detalhada a definir conforme implementação futura.

---

### 5.6 Seção: Demo (Desativada)

```
1. Admin clica em "Demo" no sidebar
2. startDemo() é chamada
3. Função retorna imediatamente com console.warn("Demo mode disabled")
4. Nenhuma ação executada — modo demo permanentemente desabilitado
```

---

## 6. Fluxos Alternativos

### 6.1 Auto-Login (sessão existente)

```
1. Admin reabre admin.html com sb_admin_session válida no localStorage
2. getSession() lê e verifica expiração:
   - Se expires_at - now > 60s: retorna sessão diretamente
   - Se expires_at - now <= 60s: tenta refresh antes de retornar
3. Se sessão válida: showDashboard() sem exibir tela de login
```

### 6.2 Auto-Refresh de Token

```
1. Admin está usando o painel e token está prestes a expirar
2. Qualquer chamada a sbFetch() internamente chama getSession()
3. getSession() detecta expires_at - 60 <= Date.now()/1000
4. fetch POST /auth/v1/token?grant_type=refresh_token com { refresh_token }
5. Se OK: atualiza sb_admin_session com novos access_token, refresh_token, expires_at
6. Retorna sessão atualizada → request original prossegue normalmente
```

### 6.3 Filtro de Status (Marcas/Detentores)

```
1. Admin seleciona filtro "Pendente", "Aprovado" ou "Rejeitado"
2. Lista filtra client-side (ou re-query com ?status=eq.{valor})
3. Exibe apenas registros do status selecionado
```

---

## 7. Fluxos de Erro

| # | Cenário de erro | Causa provável | Mensagem ao usuário | Ação do sistema |
|---|----------------|----------------|---------------------|-----------------|
| E1 | Credenciais inválidas no login | Email/senha incorretos | "Credenciais inválidas" | Limpa campos de senha |
| E2 | Usuário não é admin | `user_metadata.tipo !== 'admin'` | "Acesso restrito a administradores" | Não cria sessão |
| E3 | Token refresh falhou | Refresh token expirado ou inválido | Redireciona para tela de login | Remove `sb_admin_session` |
| E4 | Edge Function falhou (update-status) | Erro na Edge Function ou token inválido | Toast de erro genérico | Não altera status no banco |
| E5 | Edge Function falhou (create-user) | Email já existe ou erro de infra | Toast de erro genérico | Status pode ter sido atualizado mas conta não criada |
| E6 | Rejeitar contrato sem comentário | Campo admin_comentario vazio | "Adicione um comentário antes de rejeitar" | Bloqueia ação |
| E7 | Erro de rede em sbFetch | Sem conexão ou Supabase indisponível | Toast de erro + log no console | Não altera estado local |
| E8 | Sessão corrompida no localStorage | JSON inválido em sb_admin_session | Trata como sessão inexistente | Exibe tela de login |

---

## 8. Validações

### 8.1 Formulário de Login

| Campo | Tipo | Obrigatório | Regra de validação | Mensagem de erro |
|-------|------|-------------|-------------------|------------------|
| `email` | email | Sim | Formato de email (HTML type=email) | "Email inválido" |
| `senha` | password | Sim | Não vazio | — |

### 8.2 Formulário de Embaixador

| Campo | Tipo | Obrigatório | Regra de validação | Mensagem de erro |
|-------|------|-------------|-------------------|------------------|
| `nome` | text | Sim | Não vazio | "Nome obrigatório" |
| `email` | email | Sim | Formato de email | "Email inválido" |
| `comissao_percent` | number | Sim | 0–100 | "Deve ser entre 0 e 100" |
| `codigo` | text | Auto | Gerado por `gerarCodigoRR()` | — |

### 8.3 Rejeição de Contrato

| Campo | Tipo | Obrigatório | Regra de validação | Mensagem de erro |
|-------|------|-------------|-------------------|------------------|
| `admin_comentario` | textarea | Sim (para rejeitar) | Não vazio | "Adicione um comentário antes de rejeitar" |

### 8.4 Regras de Negócio

- [ ] Apenas usuários com `user_metadata.tipo === 'admin'` podem acessar o painel
- [ ] Criar embaixador sempre gera um `codigos_convite` sincronizado com mesmo código `RR-XXXX`
- [ ] Código `RR-XXXX` usa charset sem caracteres ambíguos: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sem O, I, 0, 1)
- [ ] Aprovar marca/detentor sempre dispara criação de conta via Edge Function (não diretamente do frontend)
- [ ] Rejeitar contrato REQUER `admin_comentario` preenchido — campo obrigatório antes da ação
- [ ] Rejeitar contrato limpa `contrato_url`, `contrato_enviado_por` e `contrato_validado` do registro
- [ ] "Reenviar acesso" disponível apenas para detentores já `aprovado`
- [ ] Demo mode está permanentemente desabilitado (`startDemo()` é no-op)
- [ ] Service role key NÃO está no frontend — operações privilegiadas passam pela Edge Function `admin-actions`
- [ ] Token é auto-refreshed 60 segundos antes da expiração real para evitar falhas mid-operation

---

## 9. Modelo de Dados

### 9.1 Tabelas Envolvidas

```sql
-- Embaixadores: programa member-get-member
TABLE embaixadores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  email           text NOT NULL,
  codigo          text NOT NULL UNIQUE,       -- formato: RR-XXXX
  comissao_percent numeric NOT NULL DEFAULT 0, -- 0 a 100
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Códigos de convite vinculados a embaixadores
TABLE codigos_convite (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text NOT NULL UNIQUE,       -- espelha embaixadores.codigo
  embaixador_id   uuid REFERENCES embaixadores(id),
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Waitlist de marcas
TABLE marcas_waitlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text,
  empresa         text,
  email           text NOT NULL,
  status          text CHECK (status IN ('pendente', 'aprovado', 'rejeitado')) DEFAULT 'pendente',
  created_at      timestamptz DEFAULT now(),
  -- outros campos de perfil da marca
);

-- Waitlist de detentores
TABLE detentores_waitlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text,
  empresa         text,
  email           text NOT NULL,
  status          text CHECK (status IN ('pendente', 'aprovado', 'rejeitado')) DEFAULT 'pendente',
  created_at      timestamptz DEFAULT now(),
  -- outros campos de perfil do detentor
);

-- Negociações (campos relevantes para o admin)
TABLE negociacoes (
  id                      uuid PRIMARY KEY,
  marca_id                uuid REFERENCES marcas_waitlist(id),
  detentor_id             uuid REFERENCES detentores_waitlist(id),
  oportunidade_id         uuid,
  contrato_url            text,                    -- null = sem contrato submetido
  contrato_validado       boolean DEFAULT false,
  contrato_enviado_por    uuid,                    -- user.id de quem enviou
  contrato_validado_por   uuid,                    -- user.id do admin que validou
  contrato_validado_em    timestamptz,
  admin_comentario        text,                    -- comentário do admin (obrigatório na rejeição)
  -- outros campos da negociação
);
```

### 9.2 Operações Supabase (via sbFetch)

```javascript
// GET stats — contagem de embaixadores ativos
GET /rest/v1/embaixadores?ativo=eq.true&select=id
Headers: Range: 0-0 (com Prefer: count=exact)

// GET waitlist pendente
GET /rest/v1/marcas_waitlist?status=eq.pendente&select=id

// GET deals com contrato pendente de validação
GET /rest/v1/negociacoes?contrato_url=not.is.null&contrato_validado=eq.false&select=id

// GET deals com join completo
GET /rest/v1/negociacoes
  ?select=id,...,marca:marca_id(nome,empresa),detentor:detentor_id(nome,empresa),
    oportunidade:oportunidade_id(titulo,categoria),
    contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por)
  &contrato_url=not.is.null
  &order=contrato_enviado_em.desc

// POST criar embaixador
POST /rest/v1/embaixadores
Body: { nome, email, comissao_percent, codigo: 'RR-XXXX', ativo: true }

// POST criar código de convite
POST /rest/v1/codigos_convite
Body: { codigo: 'RR-XXXX', embaixador_id: '<uuid>', ativo: true }

// PATCH ativar/desativar embaixador
PATCH /rest/v1/embaixadores?id=eq.<uuid>
Body: { ativo: true|false }

// DELETE embaixador
DELETE /rest/v1/embaixadores?id=eq.<uuid>

// PATCH aprovar contrato
PATCH /rest/v1/negociacoes?id=eq.<uuid>
Body: { contrato_validado: true, contrato_validado_em: '<iso>', contrato_validado_por: '<admin_user_id>' }

// PATCH rejeitar contrato
PATCH /rest/v1/negociacoes?id=eq.<uuid>
Body: { contrato_url: null, contrato_validado: false, contrato_enviado_por: null, admin_comentario: '<texto>' }
```

### 9.3 Edge Function: `admin-actions`

```javascript
// Chamada via adminAction(action, payload)
POST {SUPABASE_URL}/functions/v1/admin-actions
Headers: {
  Authorization: 'Bearer ' + session.access_token,
  apikey: SUPABASE_KEY,
  Content-Type: 'application/json'
}
Body: { action: 'update-status' | 'create-user-and-send-access', ...payload }

// Ação 1: atualizar status
Body: { action: 'update-status', table: 'marcas_waitlist'|'detentores_waitlist', id: '<uuid>', status: 'aprovado'|'rejeitado' }

// Ação 2: criar conta Supabase Auth + enviar email de acesso
Body: { action: 'create-user-and-send-access', table: 'marcas_waitlist'|'detentores_waitlist', id: '<uuid>' }
// Edge Function lê dados da waitlist, cria auth user com user_metadata.tipo = 'marca'|'detentor'
// e envia email de acesso/boas-vindas
```

### 9.4 Row Level Security (RLS)

| Tabela | Operação | Quem pode | Condição |
|--------|----------|-----------|----------|
| `embaixadores` | SELECT/INSERT/UPDATE/DELETE | `admin` (via Edge Function e Bearer token) | `user_metadata.tipo = 'admin'` |
| `marcas_waitlist` | SELECT | `admin` | `user_metadata.tipo = 'admin'` |
| `marcas_waitlist` | UPDATE (status) | `admin` (via Edge Function) | Somente Edge Function com service role |
| `detentores_waitlist` | SELECT | `admin` | `user_metadata.tipo = 'admin'` |
| `detentores_waitlist` | UPDATE (status) | `admin` (via Edge Function) | Somente Edge Function com service role |
| `negociacoes` | SELECT | `admin`, `marca`, `detentor` | Conforme spec negociacao.spec.md |
| `negociacoes` | UPDATE (contrato_*) | `admin` | `user_metadata.tipo = 'admin'` |

---

## 10. Comportamento de UI

### 10.1 Estados Visuais

| Estado | O que o admin vê |
|--------|------------------|
| Não autenticado | Tela de login com formulário email + senha |
| Loading inicial | Página carregando dados (loadAllData em paralelo) |
| Overview carregado | 4 cards de métricas + lista de atividade recente |
| Seção vazia | Mensagem de estado vazio + orientação |
| Erro de rede | Toast/mensagem de erro inline |
| Ação bem-sucedida | Feedback visual inline (badge atualizado, linha removida, etc.) |
| Demo ativo | Nunca ocorre — modo demo permanentemente desabilitado |

### 10.2 Sidebar e Navegação

- Sidebar com 7 seções: Overview, Embaixadores, Marcas, Detentores, Deals, Páginas, Demo
- Seção ativa destacada visualmente
- Clique na seção exibe o painel correspondente, oculta os demais
- Nome do admin exibido no header após login

### 10.3 Feedback Imediato

- Ações destrutivas (excluir embaixador, rejeitar contrato): requerem `confirm()` ou campo obrigatório
- Botões de ação: desabilitados durante requisição para evitar duplo-click
- Aprovação/rejeição: remove ou altera botões inline sem reload completo da lista
- `escapeHtml()` aplicado em todos os dados do usuário renderizados no DOM (via `sanitize.js`)

---

## 11. Integrações Externas

| Sistema | Quando é chamado | Dados enviados | Resposta esperada |
|---------|-----------------|----------------|-------------------|
| Supabase Auth (`/auth/v1/token`) | Login, refresh de token | `{ email, password }` ou `{ refresh_token }` | `{ access_token, refresh_token, user, expires_in }` |
| Supabase REST API | CRUD em todas as tabelas | JSON via `sbFetch()` com headers de auth | Dados ou erro |
| Edge Function `admin-actions` | Aprovação de waitlist (update-status + create-user) | `{ action, table, id, status }` | `{ success }` ou erro |

---

## 12. Segurança

- [ ] Service role key **não está** no frontend — toda operação privilegiada passa pela Edge Function
- [ ] `adminAction()` sempre envia `Authorization: Bearer <access_token>` — Edge Function valida o token
- [ ] Validação de role (`user_metadata.tipo === 'admin'`) feita no login E na Edge Function (defense in depth)
- [ ] Auto-login: re-valida tipo de usuário na sessão localStorage antes de exibir dashboard
- [ ] `escapeHtml()` de `sanitize.js` aplicado em todos os dados de usuário renderizados no HTML
- [ ] `sb_admin_session` contém apenas tokens e dados de usuário — nenhuma service key armazenada
- [ ] Sessão com token expirado: `getSession()` tenta refresh; se falhar, retorna null e força re-login

---

## 13. Critérios de Aceitação

```gherkin
DADO   usuário autenticado como admin
QUANDO acessa admin.html
ENTÃO  vê dashboard com métricas e não vê tela de login

DADO   usuário com credenciais válidas mas tipo !== 'admin'
QUANDO submete formulário de login em admin.html
ENTÃO  vê "Acesso restrito a administradores" e não acessa o dashboard

DADO   admin autenticado visualizando lista de marcas pendentes
QUANDO clica em "Aprovar" em uma marca
ENTÃO  status muda para "aprovado" na UI e conta Supabase Auth é criada via Edge Function

DADO   admin tentando rejeitar um contrato
QUANDO campo admin_comentario está vazio e clica "Rejeitar"
ENTÃO  vê erro "Adicione um comentário antes de rejeitar" e ação não é executada

DADO   admin autenticado
QUANDO preenche formulário de novo embaixador e salva
ENTÃO  embaixador aparece na lista com código RR-XXXX e registro em codigos_convite é criado

DADO   sessão do admin com token prestes a expirar (< 60s)
QUANDO qualquer chamada sbFetch() é executada
ENTÃO  token é renovado automaticamente antes da chamada prosseguir

DADO   admin com sessão válida já autenticado
QUANDO reabre admin.html (novo load)
ENTÃO  é redirecionado diretamente ao dashboard sem ver tela de login
```

---

## 14. Casos de Teste (Manual)

| # | Cenário | Passo a passo | Resultado esperado |
|---|---------|---------------|-------------------|
| T1 | Login admin válido | 1. Acesse admin.html<br>2. Insira email+senha de admin<br>3. Clique Entrar | Dashboard exibido, nome do admin no header |
| T2 | Login com usuário não-admin | 1. Use email+senha de uma marca<br>2. Clique Entrar | Mensagem "Acesso restrito a administradores" |
| T3 | Auto-login com sessão existente | 1. Faça login<br>2. Recarregue a página | Dashboard exibido sem tela de login |
| T4 | Criar embaixador | 1. Clique "Novo Embaixador"<br>2. Preencha nome, email, comissão<br>3. Salve | Embaixador na lista com código RR-XXXX |
| T5 | Criar embaixador sem nome | 1. Abra modal de novo embaixador<br>2. Deixe nome vazio<br>3. Salve | Erro de validação, formulário não enviado |
| T6 | Excluir embaixador | 1. Clique "Excluir" em embaixador<br>2. Confirme no dialog | Linha removida da tabela |
| T7 | Aprovar marca | 1. Vá para seção Marcas<br>2. Clique Aprovar em marca pendente | Badge muda para "aprovado", Email enviado via Edge Function |
| T8 | Aprovar detentor | 1. Vá para seção Detentores<br>2. Clique Aprovar em detentor pendente | Mesmo comportamento de T7 |
| T9 | Reenviar acesso a detentor | 1. Em detentor aprovado, clique "Reenviar acesso" | Email reenviado, feedback de sucesso |
| T10 | Validar contrato | 1. Seção Deals<br>2. Clique "Validar" em deal com contrato | `contrato_validado = true`, badge atualizado |
| T11 | Rejeitar contrato sem comentário | 1. Seção Deals<br>2. Clique "Rejeitar" sem comentário | Erro "Adicione um comentário antes de rejeitar" |
| T12 | Rejeitar contrato com comentário | 1. Seção Deals<br>2. Preencha comentário<br>3. Clique "Rejeitar" | `contrato_url` limpo, deal retorna ao estado sem contrato |
| T13 | Demo mode | 1. Clique "Demo" no sidebar | Nenhuma ação ocorre |

---

## 15. Dependências

### 15.1 Depende de (features que devem existir antes)

- `autenticacao.spec.md` — padrões de sessão, `getSession()`, refresh de token (seções 3 e 6 cobrem o fluxo admin)
- Edge Function `admin-actions` deployada — aprovação de waitlist não funciona sem ela
- `js/sanitize.js` — provê `escapeHtml` usado em toda renderização de dados do usuário

### 15.2 É dependência de (features que dependem desta)

- `cadastro-marca.spec.md` — o admin aprova ou rejeita registros da waitlist de marcas
- `cadastro-detentor.spec.md` — o admin aprova ou rejeita registros da waitlist de detentores
- `negociacao.spec.md` — o admin valida contratos gerados no fluxo de negociação

---

## 16. Fora de Escopo (MVP)

- [ ] Criação de novos admins via painel (feito diretamente no Supabase Dashboard)
- [ ] Logs de auditoria de ações admin
- [ ] Edição de perfil de marca/detentor pelo admin
- [ ] Exclusão de marcas ou detentores da waitlist
- [ ] Gestão de oportunidades pelo admin (feito pelas próprias marcas)
- [ ] Modo demo (permanentemente desabilitado)
- [ ] Notificações em tempo real (ex: nova marca na waitlist via Realtime)
- [ ] Export de dados (CSV/PDF)
- [ ] Gestão de permissões granulares por admin

---

## 17. Notas de Implementação

- **Auth exclusivamente via fetch**: O painel admin NUNCA usa o SDK `supabase-js` para autenticação — apenas `fetch` direto para `/auth/v1/token`. Isso é intencional para isolamento do contexto admin.
- **`sbFetch(path, opts)`**: Wrapper autenticado que inclui automaticamente `apikey` + `Authorization: Bearer <token>` + chama `getSession()` internamente. Usar sempre este wrapper, nunca `fetch` cru para chamadas autenticadas.
- **`adminAction(action, payload)`**: Caller da Edge Function. Requer `session.access_token` válido. Sempre verificar resposta antes de prosseguir com UI updates.
- **Criação de embaixador = 2 inserts**: Após `POST embaixadores`, obrigatoriamente fazer `POST codigos_convite` com o mesmo código. Se o segundo falhar, o estado ficará inconsistente — considerar tratamento de erro robusto.
- **`gerarCodigoRR()`**: Charset sem ambiguidade (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Não contém O, I, 0, 1 para evitar confusão visual.
- **`escapeHtml`**: Importado de `js/sanitize.js`. NUNCA interpolação direta de dados do usuário no `innerHTML` sem sanitização.
- **loadAllData() em paralelo**: `Promise.all([...])` para todas as seções simultâneas. Falha em uma seção não bloqueia as outras — tratar erros individualmente.
- **Padrão de sessão**: Usar `getSession()` local de `admin.html` (com auto-refresh embutido), não `getSession('admin')` de `core.js` — o admin tem sua própria implementação de getSession.

---

## 18. Histórico de Revisões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0 | 2026-03-01 | Isaac Araujo | Criação inicial — retroative spec de admin.html |

---

*Este spec segue o padrão SDD do Radar Relevantia. Status: `implemented` — descreve comportamento existente em `admin.html`.*
