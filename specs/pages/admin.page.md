# Página: admin.html

> **Última sincronização:** 2026-07-01 — commit `57f61b8` + mudanças locais não commitadas — contas híbridas (admin + marca/detentor no mesmo email); fix de sessão (`expires_at` no refresh), token fresco na impersonation e blindagem de `admin_revogar_acesso` (guard anti-admin) — gerado por Claude Code

**Rota:** `/admin.html`
**Acesso:** admin (verificado via `app_metadata.tipo === 'admin'`)
**Tamanho aproximado:** 5.446 linhas

---

## O que é

Painel Super Admin da Relevantia. É um SPA de seção única com login próprio embutido (tela de login escura + tela de troca de senha de primeiro acesso) e sidebar com ~14 seções: visão geral, embaixadores (member-get-member), aprovação de cadastros (marcas/detentores da waitlist), mudanças de marca, aprovações de conta (jurídico), dados financeiros, oportunidades, deals, suporte ("Fale com o Radar"), catálogo de páginas do site, modo demo (desativado), impersonation ("Criar como Cliente") e gestão de usuários admin.

É a única página onde a equipe Relevantia opera o marketplace: aprova/rejeita cadastros e oportunidades, valida dados jurídicos/financeiros de detentores, confirma pagamentos de deals (PIX em custódia), responde tickets de suporte e cria oportunidades em nome de detentores.

## Principais funcionalidades

- **Login/auth próprio** (não usa `js/core.js`): sessão em `localStorage.sb_admin_session`, renovação via refresh_token, checagem `app_metadata.tipo === 'admin'` no login e no auto-login. Primeiro acesso com `user_metadata.senha_provisoria`/`temp_password` força troca de senha (com medidor de força) antes de entrar. Troca voluntária de senha pelo botão da sidebar.
- **Visão Geral:** cards de stats (embaixadores ativos, marcas/detentores pendentes, total aprovados, oportunidades em análise — clicável, deals pendentes) + tabela de últimas atividades (últimos cadastros das waitlists).
- **Embaixadores:** CRUD (criar com código `RR-XXXX` gerado ou customizado, comissão %, toggle ativo/inativo, excluir, copiar código). Ao criar, registra o código também em `codigos_convite`.
- **Marcas / Detentores (waitlist):** tabelas com filtro por status (pendente/aprovado/rejeitado/todos), modal de perfil completo (clique na linha), aprovar/rejeitar/excluir por linha ou em lote (checkboxes + bulk bar), "Reenviar acesso" para detentor aprovado.
- **Mudanças de Marca:** lista perfis com `empresa_change_pending` (JSON com name/domain/website/icon/requested_at), aprovar/rejeitar via Edge Function, excluir usuário (individual ou em lote).
- **Aprovações (conta do detentor):** lista detentores com `cadastro_juridico_completo=true` e `pode_publicar=false`; acordeão carrega dados jurídicos (RPC descriptografada) + oportunidades do detentor, com botões "Ver Portal" / "Criar Oportunidade" em impersonation. Aprovar libera `pode_publicar`, publica a oportunidade mais recente (se houver) e notifica o detentor; rejeitar exige motivo, devolve a opp para rascunho e notifica. Abaixo, **histórico de aprovações** (liberações/bloqueios com admin e data, via Edge Function).
- **CNPJs adicionais do detentor:** o modal "Ver dados jurídicos" (`verJuridicoDetentor`, botão nas Oportunidades) lista, abaixo do CNPJ principal, os CNPJs extras cadastrados pelo detentor em Configurações (tabela `detentor_cnpjs`, até 3 por conta). Cada CNPJ extra pendente tem botões Aprovar/Rejeitar individuais (`set-cnpj-status`), independentes do `pode_publicar` da conta — servem só para liberar aquele CNPJ para seleção na publicação de oportunidades. Entram também no histórico de aprovações (`aprovar-cnpj`/`rejeitar-cnpj`).
- **Dados financeiros:** detentores com dados de recebimento (PIX/banco) em análise; acordeão carrega dados via RPC com botão de copiar campo a campo; verificar ou negar com motivo (motivo é enviado ao detentor no Fale com o Radar, via lógica da RPC).
- **Oportunidades:** lista todas (via Edge Function com service role, bypassa RLS), filtros todos/em análise/publicadas/rascunhos + busca por nome/detentor, badge de "em análise". Ações por linha: aprovar (→ `publicada`+`ativo`), rejeitar (→ `rascunho`+inativo), liberar/bloquear conta do detentor (`pode_publicar`), ver dados jurídicos (modal com "copiar dados para contrato"), editar (abre `criar-oportunidade.html?edit=<id>`), apagar (individual ou seleção em lote).
- **Deals:** negociações com status `aceita`/`fechada`; filtros pendentes (`!contrato_validado`)/validados/todos. Modal do deal mostra valor, entregas acordadas (contrapartidas aceitas, com status de entrega e provas), status do pagamento da marca (coluna dedicada `comprovante_pagamento_url`/`pagamento_informado_em`, com fallback por regex nas mensagens), preview do comprovante, dados jurídico+financeiro das duas partes (abas Marca/Detentor) e comentário admin. Ações: confirmar pagamento (libera Ativação) ou "pagamento não recebido" (limpa validação, exige comentário).
- **Suporte · Fale com o Radar:** inbox estilo chat em dois painéis (lista ↔ thread; vira painel único no mobile). Modos: Suporte (tickets) e Conversas de negociação (somente leitura das threads marca↔detentor). Filtros: não lidos/abertos/marca/detentor/todos. Abrir thread marca `admin_viu=true`; responder como "Relevantia" com anexo de imagem opcional (máx 5 MB, upload no Storage); mudar status do ticket (recebido/análise/respondido/planejado/resolvido); toggle "permitir anexos" por cliente (`perfis.pode_anexar`); admin pode iniciar conversa nova com qualquer marca/detentor. Atualização por polling (25s) + Supabase Realtime; logos via Brandfetch.
- **Páginas do Site:** catálogo estático (hardcoded) de cards das páginas do MVP com link local; botões "Online" desabilitados.
- **Modo Demo:** desativado permanentemente (`startDemo` só loga warning; cards escondidos com `display:none`; resta o banner explicativo).
- **Criar como Cliente (impersonation):** busca/seleção de detentor (via Edge Function), badges de contexto (nº de oportunidades, status da opp em andamento, conta validada, jurídico completo) e botões que abrem `criar-oportunidade.html` ou `dashboard-detentor.html#oportunidades` em modo impersonation.
- **Usuários Admin:** listar, criar (senha provisória gerada/copiável), renomear, redefinir senha (gerada no cliente, salva via RPC) e remover acesso — sem botão de remover para o próprio usuário logado.
- Sidebar com badges de pendências, topbar com breadcrumb, drawer + bottom-nav no mobile, toasts.

## Fluxos principais

### Login e primeiro acesso
1. `doLogin()` → `POST /auth/v1/token?grant_type=password` → valida `app_metadata.tipo === 'admin'` (senão limpa sessão e bloqueia).
2. Se `senha_provisoria`/`temp_password` → tela de troca de senha (`PUT /auth/v1/user` zera os flags) → dashboard.
3. Auto-login no `DOMContentLoaded` se sessão cacheada válida e de admin. No load também limpa contextos de impersonation expirados (`sb_impersonate_ctx__*`).

### Aprovar cadastro da waitlist (marca ou detentor)
1. Botão "Aprovar" → Edge Function `admin-actions` ação `update-status`.
2. Em seguida `create-user-and-send-access` (cria usuário no Auth e envia email de acesso). Toast com o email de destino.
3. "Rejeitar" → `update-status` + RPC `admin_revogar_acesso` (deleta o auth user, invalidando a sessão; mantém a linha da waitlist).

### Aprovar conta de detentor (seção Aprovações)
1. Card do detentor → Aprovar → `set-pode-publicar` (true) + `update-oportunidade-as` (publica a opp mais recente, se houver) em paralelo.
2. `POST notifications` (`conta_aprovada`) para o detentor; recarrega histórico de aprovações.
3. Rejeitar → motivo obrigatório → opp volta a rascunho + notificação `conta_bloqueada` com o motivo.

### Aprovar/rejeitar CNPJ adicional do detentor
1. Modal jurídico (`verJuridicoDetentor`) carrega `list_detentor_cnpjs` e lista os CNPJs extras (exclui o principal, `is_default`).
2. Aprovar/Rejeitar → `set-cnpj-status` (Edge Function) grava `status`/`validado_em`/`validado_por` em `detentor_cnpjs`, notifica o detentor e registra em `admin_actions_log` (`aprovar-cnpj`/`rejeitar-cnpj`) → recarrega o modal.

### Confirmar pagamento de deal
1. Linha do deal → modal → revisar comprovante/valor/partes.
2. "Confirmar pagamento" → `PATCH negociacoes` com `contrato_validado=true`, `contrato_validado_em/por` (+ comentário opcional) → deal entra em Ativação.
3. "Pagamento não recebido" → exige comentário → limpa `contrato_enviado_*`/`contrato_validado_*` e salva `admin_comentario`.

### Impersonation (Criar como Cliente)
1. Seleciona detentor → gera nonce (`crypto.randomUUID`) → grava `sb_impersonate_ctx__<nonce>` no localStorage com `target_user_id`, nome, email, **`admin_token` (access token do admin)** e `expires_at` (+30 min).
2. Abre `criar-oportunidade.html?_imp=1&_n=<nonce>` ou `dashboard-detentor.html?_imp=1&_n=<nonce>#oportunidades` em nova aba; a página destino reivindica o ctx pelo nonce.
3. Mesmo mecanismo é usado pelos botões "Ver Portal"/"Criar Oportunidade" da seção Aprovações (`_aprovOpenImpersonate`).

## Dados (Supabase e APIs)

| Tipo | Nome | Uso |
|------|------|-----|
| Auth | `/auth/v1/token` (password + refresh), `/auth/v1/user` (PUT) | login, renovação de sessão, troca de senha |
| Tabela | `marcas_waitlist` / `detentores_waitlist` | leitura (listas, stats, atividades recentes) |
| Tabela | `embaixadores` | leitura/escrita (CRUD completo via REST) |
| Tabela | `codigos_convite` | escrita — registra código do embaixador (não fatal) |
| Tabela | `oportunidades` | leitura (stats `em_revisao`, opps por detentor nas Aprovações); escrita só via Edge Function |
| Tabela | `perfis` | leitura (aprovações: `role=detentor&cadastro_juridico_completo=true&pode_publicar=false`; mudanças de marca: `empresa_change_pending`; nomes/logos do suporte; clientes p/ nova conversa); escrita `pode_anexar` |
| Tabela | `negociacoes` | leitura (deals com embeds marca/detentor/oportunidade/contrapartidas/mensagens/contratos, `status=in.(aceita,fechada)`; conversas de negociação no suporte); escrita (`contrato_validado*`, `admin_comentario`) |
| Tabela | `contratos` | leitura (stat "deals pendentes": `completo_em=is.null`) + embed em negociacoes |
| Tabela | `radar_tickets` | leitura/escrita — tickets do Fale com o Radar (marcar `admin_viu`, mudar `status`, criar ticket em nome de cliente) |
| Tabela | `radar_mensagens` | leitura/escrita — mensagens do ticket (resposta como `autor_papel='relevantia'`) |
| Tabela | `notifications` | escrita — notifica detentor (`conta_aprovada` / `conta_bloqueada`) |
| RPC | `admin_excluir_usuario` / `admin_excluir_usuarios` | excluir registro(s) da waitlist (individual/lote) |
| RPC | `admin_excluir_perfis` / `admin_excluir_por_perfil` | excluir usuário(s) por perfil (mudanças de marca) |
| RPC | `admin_revogar_acesso` | ao rejeitar waitlist: deleta auth user, mantém waitlist (blindado por `assert_not_admin_target` — recusa apagar conta admin) |
| RPC | `get_perfil_juridico` | dados jurídicos descriptografados (aprovações, modal jurídico, partes do deal) |
| RPC | `list_detentor_cnpjs` | lista CNPJs adicionais do detentor (`p_perfil_id`, exige admin) no modal jurídico |
| RPC | `list_dados_financeiros_pendentes` / `get_dados_financeiros` / `set_dados_financeiros_status` | fila, detalhe e verificação/negação de dados de recebimento |
| RPC | `admin_reset_user_password` / `admin_update_user_nome` | redefinir senha / renomear admins |
| Edge Function | `admin-actions` | ações com service role: `update-status`, `create-user-and-send-access`, `list-oportunidades`, `delete-oportunidade`, `update-oportunidade-as`, `set-pode-publicar`, `set-cnpj-status`, `list-approval-history`, `approve-marca-change`, `reject-marca-change`, `list-detentores`, `list-oportunidades-as`, `get-perfil-pode-publicar`, `list-admins`, `create-admin`, `remove-admin` |
| Storage | `radar-anexos` | upload de anexos de imagem do admin no suporte (path `admin/…`, URL pública) |
| Realtime | canal `admin-suporte` | `radar_tickets` (todos eventos) + `radar_mensagens` (INSERT) — reforço do polling de 25s |
| API externa | Brandfetch (`api.brandfetch.io/v2/search`) | logos de marcas/detentores no inbox de suporte (cache em memória) |

Sem API Vercel (`api/`).

## Dependências

- **Scripts compartilhados:** CDN `@supabase/supabase-js@2` (usado só para Realtime), `js/sanitize.js` (`escapeHtml`), `js/demo-data.js` (carregado mas sem uso — demo desativado). **Não usa `js/core.js`** — a página tem camada própria de sessão/fetch (`getSession`, `sbFetch`, chave `sb_admin_session`), exceção consciente à convenção do CLAUDE.md.
- **Navega para:** `criar-oportunidade.html` (`?edit=` e impersonation), `dashboard-detentor.html` (impersonation), `pitch-deck-pt.html`, e todos os links do catálogo "Páginas do Site".
- **Recebe de:** acesso direto (não há link público para /admin.html nas páginas de cliente).

## Regras de negócio importantes

- Admin é identificado **exclusivamente por `app_metadata.tipo`** (user_metadata é editável pelo próprio usuário); mudança de app_metadata exige re-login.
- Rejeitar cadastro da waitlist **revoga o acesso na hora** (deleta o auth user via `admin_revogar_acesso`) mas preserva o registro na waitlist. **Contas admin são protegidas**: `admin_revogar_acesso` e `admin_excluir_usuario` chamam `assert_not_admin_target` e nunca apagam um auth user com `tipo=admin` (evita perder acesso ao painel ao rejeitar/excluir um cliente que compartilha email com um admin).
- Fila de Aprovações = detentor com jurídico completo e `pode_publicar=false`. `pode_publicar` controla se o detentor consegue enviar oportunidade para análise — independente dos dados financeiros.
- Aprovação de detentor publica automaticamente a oportunidade mais recente dele (se existir) junto com a liberação da conta.
- Operações de escrita em oportunidades passam pela Edge Function `admin-actions` (service role, bypassa RLS); a service key foi **removida do frontend** (comentário no código).
- Pagamento de deal: fonte confiável são as colunas `pagamento_informado_em`/`comprovante_pagamento_url` da negociação; fallback é regex sobre mensagens da marca ("realizei o pagamento" / "Comprovante: URL").
- Valor do deal: `valor_deal` → `valor_proposto` → preço extraído da string da cota (fallback).
- Contexto de impersonation expira em 30 min e é limpo do localStorage no load da página; nonce único por handoff evita que abas concorrentes consumam o ctx errado.
- Handlers inline usam `jsStr()` (escape `\uXXXX`) para strings dentro de `onclick` — entidades HTML não bastam porque o browser as decodifica antes de executar o JS.
- Novo ticket iniciado pelo admin é criado com `autor_id` do **cliente** (o ticket "pertence" ao cliente; a 1ª mensagem é da Relevantia).
- Botão de remover admin não aparece para o próprio usuário logado. `remove-admin` apaga o auth user **inteiro** (não há rebaixar-só-admin mantendo o cliente).
- **Contas híbridas (admin + marca/detentor no mesmo email) são suportadas** (`app_metadata.tipo='admin'` = admin; `user_metadata.tipo` = papel de cliente; campos independentes):
  - "Adicionar admin" com email de um cliente existente → **promove** (`create-admin` retorna `promoted:true`): só adiciona `app_metadata.tipo='admin'`, preserva papel de cliente e senha; precisa re-logar. Se já for admin, erro 409.
  - Aprovar/"reenviar acesso" de uma waitlist cujo email é de um admin → **concede papel de cliente** (`create-user-and-send-access` retorna `merged_into_admin:true`): grava `user_metadata.tipo`, alinha `perfis.role`, mantém a senha do admin (não envia provisória).
  - `is_admin()`, `get_admin_users` e `verifyAdmin` usam **só `app_metadata.tipo`**, então o híbrido continua admin mesmo com `user_metadata.tipo='marca'/'detentor'`.

## Pendências e dívidas conhecidas

- `rejeitarOportunidade` pede motivo via `prompt()` dizendo que "será registrado no log", mas o motivo **não é enviado a lugar nenhum** (variável descartada).
- Token de acesso do admin é gravado em `localStorage` no contexto de impersonation (mitigado por expiração de 30 min + limpeza no load, mas continua sensível). O handoff agora usa `await getSession()` (renova o token antes de gravar o ctx) em vez de ler `currentSession` cru — evita gravar um `admin_token` já expirado.
- `getSession()` agora persiste `expires_at` também no caminho de renovação por `refresh_token` (o grant retorna `expires_in`, não `expires_at`); sem isso o guard de expiração nunca acertava, causando refresh em loop e falso "sessão expirada" no reload.
- Três helpers de escape coexistem: `escapeHtml` (sanitize.js), `escHtml` e `esc` — candidatos a unificação.
- `js/demo-data.js` é carregado sem uso; seção "Modo Demo" segue na sidebar embora `startDemo` esteja desativado.
- Stat "Deals Pendentes" do overview conta `contratos.completo_em is null`, enquanto o filtro "Pendentes" da seção Deals usa `negociacoes.contrato_validado` — definições diferentes podem divergir.
- Exclusão em lote de oportunidades faz uma chamada de Edge Function por id (sequencial, lento para muitos itens).
- Fluxo de deals usa `alert()`/`confirm()` nativos (inconsistente com os toasts do resto do painel).
- Catálogo "Páginas do Site" é hardcoded (pode divergir do repositório real); botões "Online" estão desabilitados (placeholder).
- `_aprovAcordeonLoaded` é declarado e limpo, mas nunca é lido (código morto).
- Chave de cliente do Brandfetch hardcoded no JS.
- Memória do projeto registra: deploy da Edge Function `admin-actions` + migração de revokes da correção de escalonamento de admin ainda **pendentes** (2026-07-01).

---

*Ao modificar esta página, atualize este spec no mesmo commit (regra no CLAUDE.md da raiz). Rode `specs/check-freshness.sh` para verificar specs defasadas.*
