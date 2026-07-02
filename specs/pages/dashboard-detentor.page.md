# Página: dashboard-detentor.html

> **Última sincronização:** 2026-07-01 — commit `57f61b8` + mudanças locais não commitadas — gerado por Claude Code

**Rota:** `/dashboard-detentor.html`
**Acesso:** detentor (ou admin — para testar o portal ou em modo impersonation `?_imp=1`)
**Tamanho aproximado:** 9.547 linhas (~500KB)

---

## O que é

Portal principal do detentor (rightsholder) logado — SPA de seção única com sidebar. É onde o detentor gerencia todo o ciclo de vida dos seus ativos: publica e acompanha oportunidades, negocia propostas com marcas (entregas + valor em rodadas), formaliza deals (pagamento em custódia pela Relevantia), executa a ativação (comprovantes das entregas), aprova solicitações de acesso, e mantém dados de empresa, jurídicos, financeiros e de equipe.

Seções (nav lateral + bottom nav mobile): **Dashboard** (KPIs + atividade recente), **Minhas Oportunidades** (sub-abas Publicadas / Negociações / Ativação / Solicitações), **Configurações** (abas Empresa / Conta / Jurídico / Financeiro / Equipe) e **Mensagens** (inbox unificado via `js/radar-inbox.js` — suporte "Fale com o Radar" + conversas de negociação).

## Principais funcionalidades

- **Dashboard:** KPIs (oportunidades publicadas, marcas interessadas, status da conta) + timeline de atividade recente derivada de negociações e publicações.
- **Publicadas:** grid de cards das oportunidades do detentor com filtro por status (publicada / em análise / rascunho / encerrada), badge/dropdown de visibilidade (pública / por aprovação / convidadas), ações contextuais (editar → `criar-oportunidade.html?edit=`, enviar para análise, encerrar, excluir rascunho, compartilhar link). Banner quando há rascunhos aguardando dados jurídicos.
- **Negociações:** two-view (lista de oportunidades com chips de status → cards de negociação por marca). Modal de negociação com: timeline Negociação → Formalização → Ativação, banner de turno ("Sua vez" / "Aguardando a marca"), toggle "aceitar novas propostas", entregas (contrapartidas) com aceitar/recusar/sugerir, valor do deal com proposta/contraoferta em rodadas versionadas, histórico de rodadas + "ponto de partida" (cota original), thread de mensagens com realtime, footer contextual (Enviar proposta / Aceitar / Contrapropor / Encerrar).
- **Formalização/Ativação (pós-deal, inline no modal):** status do pagamento em custódia (marca paga à Relevantia; `contrato_validado` = pago), checklist de entregas com upload de comprovantes (foto/vídeo/link) e "marcar como entregue", materiais enviados pela marca, resumo financeiro (bruto − taxa da plataforma = líquido), download do comprovante do acordo (`gerarComprovanteAcordo` de core.js). Aba "Ativação" lista só deals pagos.
- **Solicitações:** accordion por oportunidade com pedidos de acesso de marcas (aprovar / recusar / retirar acesso) + geração/revogação de links de convite (`convites_opp`) para oportunidades por aprovação/convidadas.
- **Configurações — Empresa:** identidade (logo via Brandfetch), edição de segmento/site/descrição; troca de nome/identidade da empresa exige aprovação de admin (fluxo Brandfetch ou cadastro manual com logo, badge "Aguardando aprovação").
- **Configurações — Conta:** dados pessoais (telefone com DDI/máscara por país, cargo; e-mail imutável), alteração de senha em 2 passos (código OTP por e-mail via `sb.auth.reauthenticate()` + `updateUser({password, nonce})`), logout.
- **Configurações — Jurídico:** CNPJ (autofill via BrasilAPI), razão social, endereço (autofill via ViaCEP), responsável legal (validação de dígitos CNPJ/CPF). Dados criptografados no banco — leitura/escrita só via RPCs. Card "Outros CNPJs" (até 3 no total, cada extra entra em análise da Relevantia).
- **Configurações — Financeiro:** dados de recebimento (titular, chave PIX, dados bancários opcionais) com verificação pela Relevantia (badge pendente/em análise/verificado/negado + motivo), exibição informativa da taxa da plataforma (`taxa_plataforma_percent` do perfil).
- **Configurações — Equipe:** visível para owner (tipo `detentor`) e org-admins; convite de até 2 membros (editor) via Edge Function, listagem e remoção.
- **Notificações:** sino com badge, painel (bottom-sheet no mobile), modal de detalhe com navegação ←/→, marcar como lida(s), realtime (INSERT/UPDATE em `notifications`) com reações especiais: `conta_aprovada` libera o focus mode; `nova_proposta` recarrega negociações.
- **Onboarding em fases:** guia de início ("setup guide") com progresso (perfil, jurídico, equipe, 1ª oportunidade, 1ª proposta); focus mode fase 1 (0 oportunidades) e focus jurídico fase 2 (ver Regras).
- **Modo demo** (`?demo=true` carrega `js/demo-data.js` + `js/demo-mode.js` com banner) e **modo admin view** (impersonation — ver Regras).

## Fluxos principais

### Init / guard de sessão
1. IIFE de admin view roda antes de tudo (ver Regras). Sem impersonation: `sb.auth.getUser()` server-side; sem usuário ou `user_metadata.tipo` ∉ {detentor, admin} → limpa sessões locais e redireciona `/index.html` (fail-closed se SDK não carregou).
2. `senha_provisoria === true` → redireciona `acesso-detentor.html` (ou `admin.html` para admin).
3. Carrega perfil (`loadUserInfoDetentor`, forçando a sessão de `sb_detentor_session` no SDK para evitar contaminação por sessão de marca/admin), role na org, negociações e oportunidades.
4. Detentor real com **0 oportunidades** → redireciona direto para `criar-oportunidade.html?onboarding=true`.
5. Renderiza todas as views, pré-carrega solicitações em background, decide seção inicial por hash (`#negociacoes`, `#configuracoes`…) ou pelo focus jurídico.

### Enviar oportunidade para análise
1. Card em rascunho → "Enviar para análise" → `_verificarPodeEnviarRevisao()` revalida **em tempo real** no banco: `pode_publicar` do perfil e dados jurídicos completos via RPC `get_perfil_juridico` (não confia em flags de cache).
2. Sem permissão → modal "Conta em análise" (+ notificação `aguardando_aprovacao`, dedup 1×/dia). Sem jurídico → toast + abre edição.
3. Busca dados frescos da oportunidade e valida obrigatórios (título, descrição, foto, rede social); ok → PATCH `status='em_revisao', ativo=false` (via Edge Function em admin view). Publicação de fato é feita pelo admin.

### Negociação (modal)
1. `openNegModal(id)` sempre recarrega negociações do servidor antes de abrir (evita proposta obsoleta). Carrega em background: rodadas, info da cota (ponto de partida), e cria contrapartidas a partir dos benefícios da cota na primeira abertura.
2. Detentor compõe proposta (entregas + valor) → `createRodada` snapshot + `valor_deal_status='aguardando_marca'`; marca propõe → footer oferece Aceitar / Contrapropor (contraoferta pré-aceita entregas pendentes, reversível) / Encerrar.
3. Aceitar proposta = `fecharDeal()` (confirm) → status `aceita` → bloco pós-deal inline (Formalização). Pagamento confirmado (`contrato_validado`) move o deal para a aba **Ativação**, onde o detentor sobe comprovantes por entrega e marca como entregue; marca valida; Relevantia repassa o líquido.
4. Realtime: canal global de `negociacoes` (INSERT/UPDATE por `detentor_id`) re-sincroniza listas e o modal aberto; canal por negociação para `mensagens`; primeira negociação abre modal "Como funciona" automaticamente (localStorage `rr_how_neg_det`).

### Solicitações de acesso
1. Aba lazy-load: `acessos_oportunidade` (RLS filtra pelo detentor) + RPC `get_marca_basic_info` para dados das marcas + `convites_opp`.
2. Aprovar/recusar/retirar → RPC `set_acesso_status`. Grupos de oportunidades que viraram públicas são omitidos. Links de convite: gerar (copia `oportunidade-detalhe.html?id=…&convite=<token>`), copiar, revogar.

### Dados jurídicos (com ou sem admin)
1. `saveJuridico()` valida obrigatórios + dígitos CNPJ/CPF → RPC `upsert_perfil_juridico` (em admin view passa `p_perfil_id` do cliente-alvo).
2. Usuário real: ativa focus jurídico "aguardando aprovação", abre modal explicativo e cria notificação `juridico_recebido` (dedup 1×/dia). Admin em impersonation: apenas toast, sem notificar o detentor.

## Dados (Supabase e APIs)

| Tipo | Nome | Uso |
|------|------|-----|
| Tabela | `perfis` | leitura (nome, empresa, segmento, `pode_publicar`, `cadastro_juridico_completo`, `empresa_change_pending`, `taxa_plataforma_percent`…); PATCH de empresa/perfil pessoal |
| Tabela | `oportunidades` | leitura das opps do detentor; PATCH (status, ativo, visibilidade) e DELETE de rascunho |
| Tabela | `negociacoes` | leitura via `fetchNegociacoesDetentor` (core.js); update de status/valor_deal via `updateNegociacao`; realtime INSERT/UPDATE |
| Tabela | `contrapartidas` | CRUD de entregas via core.js (`createContrapartida`/`updateContrapartida`/`deleteContrapartida`), incl. `provas`, `entregue`, `validado` |
| Tabela | `rodadas_negociacao` | snapshot de cada proposta/contraoferta (`createRodada`/`fetchRodadas` de core.js) |
| Tabela | `mensagens` | INSERT via `sendMensagem` (core.js); realtime por negociação |
| Tabela | `notifications` | leitura (últimas 30), INSERT (`juridico_recebido`, `aguardando_aprovacao` — dedup diária), PATCH `read_at`; realtime |
| Tabela | `acessos_oportunidade` | leitura das solicitações de acesso (RLS `acessos_select_detentor`) |
| Tabela | `convites_opp` | leitura/INSERT (gerar link)/PATCH (`revogado`) |
| Tabela | `org_members` | leitura (role + membros da equipe), DELETE (remover membro) |
| Tabela | `radar_tickets` / `radar_mensagens` | tickets de suporte bidirecionais (UI legada oculta `#vozOldUi`; o fluxo ativo é do `js/radar-inbox.js`); realtime |
| Tabela | `contratos` | select/insert/update em `handleContratoUpload` — **sem call site nesta página** (fluxo legado de upload de contrato) |
| RPC | `get_perfil_juridico` / `upsert_perfil_juridico` | ler/gravar dados jurídicos criptografados (aceita `p_perfil_id` p/ admin view) |
| RPC | `list_detentor_cnpjs` / `add_detentor_cnpj` / `update_detentor_cnpj` / `remove_detentor_cnpj` | CNPJs adicionais (máx 3 no total) |
| RPC | `get_dados_financeiros` / `upsert_dados_financeiros` | dados de recebimento (PIX/banco) com status de verificação |
| RPC | `submit_empresa_change_request` | solicitar mudança de nome/identidade da empresa (aprovação admin) |
| RPC | `get_marca_basic_info` | nome/empresa/logo das marcas solicitantes |
| RPC | `set_acesso_status` | aprovar/recusar/retirar acesso de solicitação |
| Edge Function | `admin-actions` | admin view: `list-oportunidades-as`, `update-oportunidade-as`, `delete-oportunidade-as` (valida is_admin, service_role, auditável) |
| Edge Function | `invite-org-member` | convite de membro da equipe (cria usuário + e-mail) |
| Storage | `ativacao` | upload de comprovantes de entrega (via `_uploadToStorage` de core.js) |
| Storage | `radar-anexos` | anexo de imagem no feedback/suporte (público) |
| Storage | `contratos` | upload + signed URL no fluxo legado `handleContratoUpload` (não chamado) |
| API externa | Brandfetch (`/v2/search`, `/v2/brands`) | logos de empresa/marca e site oficial (busca na troca de empresa; avatares nas negociações via `applyBrandfetchLogos`) |
| API externa | Wikipedia REST (pt→en) | sugestão de descrição da empresa na troca |
| API externa | BrasilAPI (`/cnpj/v1`) | autofill de razão social/endereço pelo CNPJ |
| API externa | ViaCEP | autofill de endereço pelo CEP |

Sem API Vercel (`api/*`) nesta página.

## Dependências

- **Scripts compartilhados:** CDN `@supabase/supabase-js@2`, `js/sanitize.js`, `js/core.js` (sessão/tokens `getValidToken`/`_getWriteToken`/`getAuthUserId`, fetchers de negociação/contrapartida/rodada/cota, `_uploadToStorage`, `gerarComprovanteAcordo`, `applyBrandfetchLogos`, `escapeHtml`, `extractCity`, `isDemoMode`), `js/radar-chat-widget.js`, `js/radar-inbox.js` (seção Mensagens), `js/admin-view-banner.js` (pílula do modo impersonation), `shared-state.js` (`SharedNeg`, fallback demo), `js/demo-data.js`+`js/demo-mode.js` (só com `?demo=true`).
- **Navega para:** `criar-oportunidade.html` (criar/editar/onboarding), `index.html` (logout/guard), `acesso-detentor.html` (senha provisória), `admin.html` (sair do admin view), `oportunidade-detalhe.html` (link de compartilhamento/convite).
- **Recebe de:** `login.html`/`acesso-detentor.html` (pós-login), `criar-oportunidade.html` (`?onboarding_done=1`), `admin.html` (impersonation `?_imp=1&_n=<nonce>`), deep-links por hash (`#negociacoes`, `#configuracoes`, `#voz`…).

## Regras de negócio importantes

- **Admin view (impersonation):** ativa só com `?_imp=1` + contexto `sb_impersonate_ctx` consumido por nonce único (localStorage por-nonce → sessionStorage por-aba; nonce da URL tem que bater com o do ctx; ctx expira ~1h). Monkey-patcha `getAuthUserId`/`getValidToken` para o cliente-alvo/token do admin. CSS `body.admin-view-mode` esconde Dashboard, Voz, Equipe, sidebar-footer e notificações — admin só mexe em Minhas Oportunidades (configurações visíveis read-only; jurídico editável via RPC com `p_perfil_id`). Escritas de oportunidade passam pela Edge Function `admin-actions` (nunca PATCH direto). **Negociações e Solicitações aparecem vazias de propósito**: a query com token do admin traria os dados DO ADMIN via RLS (vazamento) — documentado no código até existir rota `list-negociacoes-as`.
- **Onboarding em fases:** fase 1 (0 opps) → redirect ao criar-oportunidade; se voltar, focus mode bloqueia Dashboard/Mensagens e sub-abas de negociação (skeletons). Fase 2 (`MINHAS_OPPS > 0` e `!pode_publicar`) → focus jurídico: banner preto fixo ("preencha dados jurídicos" ou "aguardando aprovação"), bloqueia todas as abas de Configurações exceto Jurídico e esconde as sub-abas exceto Publicadas; botão do jurídico vira "Enviar para análise →". Aprovação do admin chega por notificação realtime `conta_aprovada` e destrava tudo sem F5.
- **Status da oportunidade é derivado:** `ativo===true` → `publicada`; senão `status` (`finalizada`/`em_revisao`) → senão `rascunho`. Encerrar/enviar p/ análise sempre gravam `ativo:false`.
- **Separação Negociações × Ativação:** "Negociações" = tudo que não é `aceita && contrato_validado` (aceitas não-pagas aparecem como "Formalização"); "Ativação" = `aceita && contrato_validado` (pagamento em custódia confirmado). `contrato_validado` é reaproveitado como flag de "pago/repasse".
- **Financeiro do deal:** líquido = bruto − `round(bruto × PLATAFORMA_TAXA)`; `PLATAFORMA_TAXA` é constante 20% no front (a taxa real por perfil, `taxa_plataforma_percent`, aparece só como informativo na aba Financeiro).
- **Dados jurídicos são criptografados** — nunca ler/escrever direto em `perfis`; sempre RPCs `get/upsert_perfil_juridico`. Validação de dígitos verificadores de CNPJ e CPF no front.
- **Limites:** equipe máx. 2 membros convidados; máx. 3 CNPJs por conta (incluindo o principal); feedback máx. 800 chars / anexo 5MB.
- **Troca de empresa** nunca é direta: grava pedido via `submit_empresa_change_request` e fica pendente de aprovação do admin (badge no card de identidade). O campo nome da empresa é sempre disabled na edição comum.
- E-mail do usuário não é editável; alteração de senha exige OTP de reautenticação por e-mail.
- Marcar entrega como "entregue" exige ao menos um comprovante anexado; entregas sugeridas pelo próprio detentor podem ser removidas a qualquer momento, mesmo aceitas.
- Mudar visibilidade reseta o cache de solicitações (`_SOLICITACOES_LOADED`); grupos de solicitações de opps que viraram públicas somem da lista.
- `doLogout()` só limpa `sb_detentor_session`/`sb_marca_session` do localStorage e redireciona — não chama `sb.auth.signOut()`.

## Pendências e dívidas conhecidas

- **Comentário de cabeçalho do script mente:** "Sem Supabase (dados mockados)" — a página é 100% integrada ao Supabase.
- **Código morto/legado considerável:** `handleContratoUpload` (tabela+bucket `contratos`) e `vozBootstrap`/UI antiga de feedback (`#vozOldUi`, `radar_tickets` direto, `VOZ_STORAGE_KEY`, botões de prioridade sem HTML) não têm call sites — o fluxo vivo é o `RadarInbox`; dezenas de funções "legado — mantido por compat" (`filterNegPill`, `toggleDealAcc`, `closeDealDetModal`, `openVisFromOpts`, CSS de modais antigos).
- Admin view não enxerga negociações nem solicitações do cliente (limitação conhecida; requer nova action na Edge Function).
- KPI "Status da conta" é hardcoded como "Ativa" (não reflete `pode_publicar`/bloqueio).
- `_NOTIF_ICONS` tem a chave `juridico_recebido` duplicada.
- `compartilharOpp` recebe o `slug` mas gera o link sempre com `?id=` (ignora slug).
- `sendNegMsg` mostra "Mensagem enviada!" antes de confirmar a persistência (otimista, sem rollback em erro).
- Notificações/realtime usam `sb.auth.getSession()` direto (não funcionam em admin view — aceitável pois o sino é escondido, mas frágil).
- `loadFinanceiro`/`loadJuridicoFromPerfil` etc. dependem da sessão do SDK; em cenários multi-portal na mesma origem o SDK pode carregar a sessão errada (mitigado no init por `setSession` de `sb_detentor_session`).
- Categorias visuais (`OPP_CAT`) hardcoded com fallback "Cultura"/"Esporte"; categorias fora do mapa perdem identidade visual.

---

*Ao modificar esta página, atualize este spec no mesmo commit (regra no CLAUDE.md da raiz). Rode `specs/check-freshness.sh` para verificar specs defasadas.*
