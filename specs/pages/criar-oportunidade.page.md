# Página: criar-oportunidade.html

> **Última sincronização:** 2026-07-01 — commit `57f61b8` — gerado por Claude Code

**Rota:** `/criar-oportunidade.html`
**Acesso:** detentor (`requireAuth('rightsholder')`) · admin via impersonation (`?_imp=1&_n=<nonce>`, sem exigir sessão de detentor)
**Tamanho aproximado:** 15.061 linhas (a maior página do projeto; ~3.400 de CSS, ~1.200 de HTML, ~10.400 de JS)

---

## O que é

Formulário-wizard de criação **e** edição de oportunidades de patrocínio — o coração do lado detentor do Radar. Guia o usuário da escolha do tipo de oportunidade até o envio para análise, passando por informações básicas com live preview do card, preview editável da página de detalhe (galeria + descrição rica em Quill), mídia kit PDF, canais sociais com dados de audiência, cotas de patrocínio, incentivo fiscal, segmentos-alvo, slug público e visibilidade.

Três modos de operação: **criação** (POST em `oportunidades`), **edição** (`?edit` + `edit_opp` no sessionStorage, com re-fetch autoritário do banco) e **impersonation** (admin preparando rascunho em nome de um detentor via Edge Function `admin-actions`). Entre o passo 1 e o formulário há um **Assistente de Cadastro (agente Gemini)** que extrai dados de texto livre, links e PDFs/DOCX e pré-preenche o formulário com badges "✦ IA" reversíveis.

## Principais funcionalidades

- **Wizard de 8 steps virtuais em 3 fases** (Sobre → Informações Gerais → Publicar). Mapeamento step→painel (`STEP_TO_PANEL` em `nextStep()`): 1=Tipo (`panel-1`) · 2=Detalhes específicos (`panel-5`) · 3=Informações básicas (`panel-2`) · 4–7=preview da página de detalhe (`panel-3`, seções reveladas incrementalmente: descrição completa/galeria → Mídia Kit → Marca Parceira → Canais → Oportunidades/cotas+incentivo → Segmentos inline) · 8=Publicar (`panel-8`). `panel-6` existe vazio só por compatibilidade.
- **4 templates** (`TEMPLATES`): Personalidade, Evento, Artista Musical, Mídia — cada um com campos próprios renderizados dinamicamente (`renderTemplateFields`/`buildFieldHtml`): pills multiselect, tag-select, selects, público esperado, toggle de transmissão, perfil do público presencial (gênero/faixas etárias com sliders), toggle "faz shows ao vivo" etc.
- **Evento — datas e locais:** entradas múltiplas (`addEventEntry`), cada uma com país (dropdown custom com bandeiras, país sincronizado da 1ª entrada com override "Trocar país"), cidade e venue com autocomplete Google Places, botões "A confirmar" (TBC), e multi-date-picker (`_mdpNew`) com modo datas específicas ou mês de referência (`mesref:YYYY-MM`). Recorrência opcional (semanal…trienal ou datas personalizadas). Para evento, o bloco global país/cidade fica oculto (localização é por data).
- **Live preview do card** (passo 3): nome/descrição refletidos em tempo real, fotos (até 5, JPEG/PNG/WebP, 50 MB cada) com capa, carrossel, editor de ponto focal (16:9 e 1:1) e colar da área de transferência; logo/nome da organização carregados de `perfis` (fallback Brandfetch por domínio ou iniciais).
- **Preview da página de detalhe** (steps 4–7): título editável inline, galeria editável (adicionar/substituir fotos), descrição completa em Quill sempre ativo, campo "O que buscamos em uma marca parceira" (480 chars).
- **Mídia kit PDF** (opcional, até 100 MB): upload com drag&drop, viewer pdf.js (CDN lazy) com paginação e fullscreen, undo de remoção (`mkRestoreBar`); em edição, o PDF existente é pré-carregado em background.
- **Canais sociais dinâmicos** (Instagram, TikTok, YouTube, LinkedIn, Twitch, Kwai, Kick — múltiplos por rede): username + painel de audiência (seguidores obrigatórios, formatos de conteúdo obrigatórios, gênero somando 100% com pie chart, faixas etárias 13-17…45+ somando 100%, período de referência com chips ou datas custom, cidade, toggle "estimativa vs dado real"). Canal precisa ser explicitamente **salvo** (`saveCanal` valida tudo) para avançar/publicar.
- **Cotas de patrocínio** ("Oportunidades", sempre habilitadas — toggle legado oculto): cards com nome, valor+moeda (BRL/USD/EUR/GBP), "mostrar valor", vagas, descrição, benefícios (título+descrição) e fotos por cota (drag&drop/paste); modo preview com modal de detalhe navegável.
- **Projeto incentivado:** toggle + lei (Rouanet, LIE, Paulo Gustavo, ISS, ICMS, PRONAC, outras), categoria, valor com máscara por moeda, status (aprovado/em andamento); vira banner dourado resumido após salvar, com editar/excluir.
- **Segmentos-alvo:** 18 pills fixas, em dois grids espelhados (`#segmentPillGridInline` no panel-3 e `#segmentPillGrid` legado no panel-5); ambos são lidos em `collectOppData` → coluna `tags`.
- **Slug público** (passo 8): auto-gerado do título (`slugify`, máx. 80 chars), sanitização em tempo real, validação de unicidade contra `oportunidades` (permissiva em falha de rede); prefixo exibido `radar.relevantia.com/@perfil/`.
- **Visibilidade:** `publica` (default) · `aprovacao` · `convidadas` (modal de sucesso mostra link de convite `oportunidade-detalhe.html?slug=…`).
- **Salvar rascunho + auto-save silencioso:** `silentSaveDraft()` roda em cada transição de step e a cada 60 s após a primeira criação — persiste no banco (não em sessionStorage), incluindo uploads de fotos/cotas/PDF; indicador "✓ Salvo automaticamente" na topbar.
- **Agente de IA (painel entre passo 1 e 2):** chat com Gemini via proxies Vercel; aceita texto, links (aciona busca web) e PDFs até 20 MB (upload em 3 etapas para a Files API do Google) ou DOCX (texto extraído no browser via mammoth.js CDN); resposta JSON (com reparo iterativo de JSON malformado `agRepairJson`) é resumida no chat com resumo de deltas entre turnos; "Preencher formulário" grava `autofill_opp` no sessionStorage e reusa `maybePreFillEdit(true)`. Campos preenchidos ganham badge "✦ IA" com limpar/restaurar por campo e banner por painel. O agente NÃO preenche canais, cotas, incentivo nem cidade (só país).
- **Topbar inteligente em edição** (`_updateEditTopbar`): rótulos por status; `publicada` ganha botão "Encerrar oportunidade" (→ `finalizada`, `ativo=false`) e esconde o publicar; `finalizada` permite "Reativar" (→ `em_revisao`). Stepper de fases vira clicável em modo edição.
- **Onboarding/focus mode:** `?onboarding=true` mostra modal de boas-vindas e ativa `rr_focus_active` (localStorage) — banner "Primeiros passos", sidebar e botão voltar bloqueados até publicar a 1ª oportunidade.
- **Modais informativos:** "Como funciona?" (guia ilustrado dos passos) e "O que o agente preenche?".
- **Modo mock/demo:** `?mock` preenche o formulário com dados fictícios (`loadMockData`); `?demo=true` injeta `js/demo-mode.js`.

## Fluxos principais

### Criação (detentor)
1. `init()` → `requireAuth('rightsholder')` → `initSession()` (SDK + fallbacks de sessão legada) → `_guardDuplicateOpp()`.
2. Passo 1: escolhe template → "Próximo" abre o **painel do agente** (`abrirPainelAgente`). Usuário conversa/anexa e clica "Preencher formulário", ou "Pular e preencher manualmente" (→ `nextStep(2)`).
3. Passos 2–7: preenche detalhes, informações, materiais; a cada transição `silentSaveDraft()` cria/atualiza o registro como `rascunho` (`ativo=false`) e liga auto-save de 60 s.
4. Passo 8: slug auto-preenchido e validado; escolhe visibilidade; "Enviar para análise" → `publishOpportunity()`.
5. `publishOpportunity()` valida (ver Regras), checa `pode_publicar` + dados jurídicos (`_checkJuridicoCompleto`), resolve CNPJ, faz POST/PATCH com `status='em_revisao'`/`ativo=false`, sobe fotos → cotas → mídia kit (PATCHs incrementais) e abre o modal de sucesso → dashboard.

### Edição (detentor)
1. Dashboard grava `edit_opp` no sessionStorage e abre `?edit`.
2. `maybePreFillEdit()`: **re-fetch autoritário** das colunas críticas (`_AUTH_FIELDS`: midia_kit_url, datas_evento, incentivo, cotas, detalhes, redes_sociais, tags, imagens…) direto do banco (ou via `admin-actions list-oportunidades-as` sob impersonation) — o cache do dashboard pode estar defasado.
3. Mapeia `categoria`→template (`CAT_TO_TPL`; Esporte/Cultura→evento, Arte→artista…), seleciona o card e força o caminho `currentStep=1 → nextStep(2)` (único que chama `renderTemplateFields` → `_applyPendingDetalhes`).
4. Restaura: título/descrições, Quill, busca_marca, país+cidade (sem chamar `toggleOppLocBrasil`, que limparia a cidade), slug, canais + audiência (`detalhes.publico_canais`), visibilidade, fotos existentes (sem `file`, não re-sobem), PDF (`formState.existingMkUrl` + preload), tags; datas/locais, detalhes do template, cotas e incentivo ficam em `formState._pending*` e são aplicados por `_applyPendingDetalhes` na renderização.
5. Salvar preserva o status original (não rebaixa `publicada`/`em_revisao` para rascunho); `_editOriginal` (snapshot) + merge-guards em `mergePreviewData` protegem campos não renderizados de serem apagados no PATCH.

### Publicação — portões jurídico e CNPJ
1. `_checkJuridicoCompleto()`: consulta `perfis.pode_publicar` em tempo real e os dados reais via RPC `get_perfil_juridico` (não confia em flags de cache).
2. `no_permission` → modal "Conta em análise" + insere notificação `aguardando_aprovacao` (máx. 1/dia) na tabela `notifications`.
3. `no_juridico` → modal jurídico (`#modal-juridico-publish`) com máscaras e validação de dígitos de CNPJ/CPF, autofill por CEP (ViaCEP) e por CNPJ (BrasilAPI); "Salvar e publicar" → RPC `upsert_perfil_juridico` → re-invoca `publishOpportunity()`. Alternativa: "Publicar depois" salva rascunho.
4. CNPJ: RPC `list_detentor_cnpjs` → se 2+ aprovados abre `#modal-cnpj-select`; o escolhido (ou o único) é vinculado após criar/atualizar via RPC `set_oportunidade_cnpj`.

### Impersonation (admin cria/edita como cliente)
1. `initImpersonateMode()` roda ANTES do `requireAuth`: exige `?_imp=1`, consome contexto por nonce (`?_n=…`, localStorage→sessionStorage) com `admin_token`, `target_user_id`, nome/email; sidebar mostra o cliente; botão "Enviar para análise" é escondido.
2. `_impersonateMaybeLoadDraft()`: via Edge Function busca oportunidades do detentor (`list-oportunidades-as`) + status (`get-perfil-pode-publicar`); se há rascunho/em_revisao, carrega no formulário (overlay de loading evita flash do passo 1).
3. Toda escrita passa pela Edge Function `admin-actions` (`create-oportunidade-as` / `update-oportunidade-as`) — RLS bloqueia PATCH direto; campos server-owned (id, detentor_id, timestamps…) são removidos do payload no cliente (defesa em profundidade). Uploads de Storage usam `_freshAdminToken()` (prioriza o snapshot `ctx.admin_token` sobre a sessão do SDK, que pode ser de outro portal na mesma origem).
4. `publishOpportunity()` sob impersonation SEMPRE cai em `saveDraft()` — admin nunca publica; o detentor completa jurídico e envia pelo fluxo normal (preserva os dois portões).

### Agente de cadastro (Gemini)
1. PDF: `POST api/gemini-upload` (obtém uploadUrl da Files API) → `PUT` binário direto ao Google (resposta ilegível por CORS, ignorada) → `POST api/gemini-finalize` (resolve `fileUri` server-to-server). DOCX: mammoth.js extrai texto no browser.
2. Primeira mensagem inclui tipo selecionado, links destacados e fileUris; `POST api/gemini-agent` com `useSearch:true` (turnos seguintes só usam search se houver link; fileData é removido do histórico). Timeout de 150 s com AbortController; fases de loading animadas.
3. Resposta JSON parseada (com reparo de vírgulas/chaves faltantes e fechamento de JSON truncado) → mensagem de confirmação com resumo, e delta em relação ao turno anterior; botões "Preencher formulário" / "Preciso de ajustes".
4. `agPreencher()` → `agToFormData()` (mapeia campos, segmentos via `AG_SEGMENTO_MAP`, detalhes por template via `agApplyTemplateDetalhes`, localização só país via `agApplyLocalizacao`) → sessionStorage `autofill_opp` → `maybePreFillEdit(true)` → badges ✦IA (`agMarkStandardFields`).

## Dados (Supabase e APIs)

| Tipo | Nome | Uso |
|------|------|-----|
| Tabela | `oportunidades` | POST (criação), PATCH (edição/auto-save/uploads incrementais/encerrar/reativar), GET (re-fetch autoritário em edição, validação de slug, guard de duplicata). Colunas usadas: titulo, slug, categoria, categoria_slug, descricao_curta, descricao_completa, localizacao, alcance, tags, bg_gradient, video_url, link_externo, redes_sociais, detalhes (JSONB c/ publico_canais, publico_presencial, busca_marca…), datas_evento, cotas_habilitadas, cotas_data, projeto_incentivado, incentivo_data, formato, visibilidade, status, ativo, detentor_id, imagens, imagem_capa, imagens_focal, midia_kit_url, publico_descricao |
| Tabela | `perfis` | leitura — empresa/logo_url/empresa_domain (live preview, inclusive do cliente sob impersonation) e pode_publicar (portão de publicação, guard de duplicata) |
| Tabela | `notifications` | leitura + insert — notificação `aguardando_aprovacao` (1×/dia) quando conta sem permissão tenta publicar |
| RPC | `get_perfil_juridico` | carrega dados jurídicos reais (check antes de publicar + pré-preenchimento do modal) |
| RPC | `upsert_perfil_juridico` | salva CNPJ principal, endereço e responsável legal no fluxo "Salvar e publicar" |
| RPC | `list_detentor_cnpjs` | lista CNPJs da conta; filtra `status='aprovado'` para seleção na publicação |
| RPC | `set_oportunidade_cnpj` | vincula o CNPJ escolhido à oportunidade após criar/atualizar |
| Edge Function | `admin-actions` | impersonation: `list-oportunidades-as`, `get-perfil-pode-publicar`, `create-oportunidade-as`, `update-oportunidade-as` (bypass de RLS com token admin) |
| Storage | `oportunidades` (bucket único) | fotos da opp (`<oppId>/<ts>-<i>.<ext>`), fotos de cota (`cotas/<oppId>/<idx>/…`) e mídia kit (`opp-<oppId>-midia-kit-<nome>.pdf`); upload via REST `storage/v1` com `x-upsert` |
| API Vercel | `api/gemini-upload` | inicia upload resumível do PDF na Files API do Gemini (devolve uploadUrl) |
| API Vercel | `api/gemini-finalize` | confirma o upload e resolve o `fileUri` (server-to-server, contorna CORS) |
| API Vercel | `api/gemini-agent` | chat do agente (Gemini 2.5 Flash + google_search; orquestra PDF+search em 2 etapas no servidor) |
| API externa | Google Maps Places | autocomplete de cidade/venue (chave embutida no JS, carregada lazy) |
| API externa | Brandfetch (`api.brandfetch.io/v2/search`) | logo da organização no live preview quando `logo_url` ausente |
| API externa | ViaCEP / BrasilAPI (CNPJ) | autofill de endereço e razão social no modal jurídico |

## Dependências

- **Scripts compartilhados:** `js/sanitize.js`, `js/core.js` (`requireAuth`, `getSession`/`getSessionAsync`, `getAuthUserId`, `_getWriteToken`, `getValidToken`, `restoreSessionToSDK`, `sb`, `SUPABASE_URL/KEY`, `isDemoMode`), `js/admin-view-banner.js` (pílula do modo admin), `js/demo-data.js`, `js/demo-mode.js` (só com `?demo=true`), `js/i18n.js`.
- **CDN:** `@supabase/supabase-js@2`, Quill 2.0.3, pdf.js (lazy), mammoth.js 1.8.0 (lazy, só p/ DOCX no agente), Google Maps JS API (lazy).
- **Navega de/para:** `dashboard-detentor.html` (origem da edição e destino pós-salvar/publicar, com `?_imp=1&_n=` preservado sob impersonation), `login.html` (sessão expirada), `admin.html` (saída do modo admin), `index.html` (logout), `oportunidade-detalhe.html` (link de convite gerado).
- **Parâmetros de URL:** `?edit`, `?onboarding=true`, `?mock`, `?demo=true`, `?_imp=1&_n=<nonce>`.
- **sessionStorage:** `edit_opp` (edição), `autofill_opp` (agente), `sb_impersonate_ctx`; **localStorage:** `rr_focus_active`, `sb_detentor_session`.

## Regras de negócio importantes

- **Fluxo de status:** publicar envia `status='em_revisao'` + `ativo=false` (aprovação admin acontece fora desta página); rascunho = `rascunho`/`ativo=false`; salvar em edição preserva `publicada`/`em_revisao` (nunca rebaixa); encerrar = `finalizada`/`ativo=false`; reativar = salva e volta a `em_revisao`.
- **Validações de publicação (nesta ordem):** título → descrição curta → localização com cidade (exceto evento, que usa datas/locais) → ≥1 foto → cotas habilitadas exigem ≥1 cota → slug preenchido e único (pulado se inalterado em edição) → campos `required` do template → ≥1 canal social **salvo** → permissão (`pode_publicar`) → jurídico completo → CNPJ resolvido.
- **Guard de duplicata (`_guardDuplicateOpp`):** detentor em onboarding (sem opp aprovada OU sem `pode_publicar`) que já tem 1 oportunidade não pode criar outra — toast + redirect ao dashboard. Não se aplica a impersonation, edição ou demo.
- **Merge-guards em edição (`mergePreviewData`):** `_pendingDetalhes` vira base do objeto `detalhes` (DOM tem precedência); cotas/incentivo pendentes são preservados se a seção não foi visitada; `datas_evento`, slug e localização caem no snapshot `_editOriginal` quando o DOM não os tem; em template evento a `localizacao` é derivada da 1ª data/local (o bloco global oculto produziria lixo tipo "Estados Unidos — Brasil").
- **Datas/locais de evento:** a coluna `datas_evento` é canônica (array `{pais, cidade, venue, datas[], cidadeTBC, venueTBC}`); `_applyPendingDetalhes` restaura SEM chamar `syncEventPais()` — essa função executa `_clearAcField()` (zera cidade/venue) e era a causa raiz dos campos sumirem em edição; na restauração apenas os country codes são propagados ao autocomplete.
- **Fotos em edição:** itens sem `file` (URLs existentes) não são re-enviados por `uploadPhotos`; foco/capa preservados via `imagens_focal`/`imagem_capa`. Mídia kit: sem arquivo novo, `uploadMediaKit` devolve `existingMkUrl`; remoção explícita (X sem restaurar) grava `midia_kit_url=null` (`_mkExplicitlyRemoved`), senão o PDF antigo "voltaria".
- **Impersonation nunca publica:** botão escondido + `publishOpportunity()` redireciona para `saveDraft()`; payloads têm campos server-owned removidos; token admin priorizado sobre a sessão do SDK (que pode pertencer a outro portal aberto na mesma origem).
- **Slug:** validação de unicidade é permissiva em erro de rede (não bloqueia publicação); em edição o próprio id é excluído da checagem (`id=neq.`).
- **Agente:** por decisão de produto não extrai canais, cotas, incentivo nem cidade (autocomplete do Maps exige seleção manual); segmentos do agente são normalizados via `AG_SEGMENTO_MAP`.
- **Categoria gravada ≠ template:** `catMap` converte template→categoria de catálogo (personalidade→"Celebridade", midia→"Midia Digital", evento→"Evento"); na volta, `CAT_TO_TPL` aceita também categorias legadas (Esporte/Cultura→evento, Arte→artista).

## Pendências e dívidas conhecidas

- **Bug histórico "campos somem ao editar" (datas/locais, incentivo, PDF)** — causa raiz confirmada no código: `syncEventPais()` chama `_clearAcField()` que faz `input.value=''` em cidade/venue, apagando valores recém-restaurados; agravado por cache defasado do `sessionStorage` (`edit_opp`). Mitigações JÁ presentes no código: (a) `_applyPendingDetalhes` restaura `datas_evento` sem chamar `syncEventPais` (comentário "CRÍTICO" na linha ~6590); (b) re-fetch autoritário de `_AUTH_FIELDS` em `maybePreFillEdit`; (c) merge-guards em `mergePreviewData` (snapshot `_editOriginal`); (d) preservação do PDF via `existingMkUrl` + `_mkExplicitlyRemoved`. **Riscos residuais:** `syncEventPais` continua limpando cidade/venue quando o usuário troca o país manualmente (comportamento intencional, mas destrutivo se acidental); a restauração de datas tem fallback para a chave legada `detalhes['undefined']` (registros antigos onde o campo event-dates não tinha label); monitorar em produção antes de dar por encerrado.
- `collectOppData` lê `#opp-abrangencia`, `#videoUrl` e `#opp-link-externo`, mas esses inputs não existem mais no HTML — `alcance`, `video_url` e `link_externo` saem sempre vazios/null na criação (e `maybePreFillEdit` tenta restaurá-los em elementos inexistentes). Código morto ou campo perdido em algum redesign — decidir se remove ou reintroduz os campos.
- Elementos legados mantidos "para compatibilidade": toggle de cotas oculto sempre-ativo (`cotas_habilitadas` é sempre true no save), `panel-6` vazio, grid de segmentos duplicado (`#segmentPillGrid` no panel-5 nunca é revelado no fluxo atual — `s5SegmentosWrap` sempre display:none), funções antigas de fotos (`previewPhotos`/`triggerUpload` sem input correspondente).
- Chaves de API expostas no cliente: Google Maps (`AIzaSy…`) e Brandfetch (`?c=1idE-ar9WXT49s6Qb2f`) hardcoded no HTML — restringir por referrer/quota no console dos provedores.
- Validação de slug permissiva: se o check falhar (rede), `slugIsValid=true` — colisão possível sob concorrência (mitigável por unique constraint no banco; confirmar se existe).
- Sem locking otimista em edição: dois editores simultâneos (ex.: admin em impersonation + detentor) sobrescrevem-se silenciosamente; auto-save de 60 s amplia a janela.
- Auto-save cria o registro no banco já na 1ª transição de step — abandonos geram rascunhos órfãos (o guard de duplicata depois bloqueia o usuário de criar outra até concluir/publicar).
- `_freshAdminToken`: se o snapshot `admin_token` expirar (~1h) e o SDK estiver com sessão de outro usuário, os saves sob impersonation falham sem recuperação elegante.
- Dependência de 4 CDNs em runtime (Supabase, Quill, pdf.js, mammoth) sem fallback local.
- `js/demo-data.js` é carregado sempre, mesmo fora do modo demo (peso morto).
- `demo-criar-oportunidade.html` (se ainda em uso) é cópia paralela fora da regra de specs — mudanças aqui precisam ser replicadas manualmente.

---

*Ao modificar esta página, atualize este spec no mesmo commit (regra no CLAUDE.md da raiz). Rode `specs/check-freshness.sh` para verificar specs defasadas.*
