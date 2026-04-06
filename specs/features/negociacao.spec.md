# Spec: Negociacao

> Spec-Driven Development (SDD) — Retroactive spec describing the full negotiation lifecycle.

## Contexto

A negociacao e o fluxo central de negocio do Radar Relevantia, conectando uma **marca** (sponsor) a um **detentor** (rightsholder) em torno de uma **oportunidade** de patrocinio. O ciclo completo vai desde a manifestacao de interesse ate a validacao do contrato pelo admin.

O fluxo envolve multiplas paginas e funcoes:
- **`oportunidade-detalhe.html`** — Inicio da negociacao (marca manifesta interesse)
- **`js/core.js`** — API layer de negociacao (CRUD, mensagens, contrapartidas, rodadas)
- **Dashboard marca/detentor** — Gestao de negociacoes em andamento
- **`admin.html`** — Validacao de contratos

---

## Trigger

- Marca clica "Tenho interesse" na pagina de detalhe de uma oportunidade
- Detentor ou marca envia mensagem/proposta na thread de negociacao
- Uma das partes aceita/recusa uma proposta de valor (rodada)
- Uma das partes atualiza contrapartidas
- Detentor ou marca envia contrato
- Admin aprova ou rejeita contrato

---

## Atores

| Ator | Descricao |
|------|-----------|
| Marca | Sponsor interessado em patrocinar |
| Detentor | Dono do evento/propriedade/oportunidade |
| Admin | Valida contratos, modera negociacoes |

---

## Pre-condicoes

- Marca autenticada (para iniciar negociacao)
- Oportunidade publicada e ativa (`status='publicada'`, `ativo=true`)
- Se visibilidade='aprovacao': marca precisa de acesso aprovado

---

## Campos / Dados

### Payload de Criacao (createNegociacao)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| oportunidade_id | integer | Sim | FK para oportunidades |
| marca_id | uuid | Sim | FK para auth.users (marca) |
| detentor_id | uuid | Sim | FK para auth.users (detentor) |
| cota | text | Nao | Nome da cota selecionada (se cotas habilitadas) |
| assunto | text | Nao | Assunto/titulo da negociacao |
| status | text | Sim | Default: 'pendente' |

### Campos Completos da Negociacao (rowToNegociacao)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | integer | PK |
| oportunidade_id | integer | FK oportunidades |
| marca_id | uuid | FK auth.users |
| detentor_id | uuid | FK auth.users |
| cota | text | Nome da cota |
| assunto | text | Assunto |
| valor_proposto | numeric | Valor proposto (legacy) |
| valor_deal | numeric | Valor do acordo |
| valor_deal_proposto_por | text | 'marca' ou 'detentor' |
| valor_deal_status | text | 'proposto', 'aceito', 'recusado' |
| contrato_url | text | URL do contrato no Storage |
| contrato_enviado_por | text | 'marca' ou 'detentor' |
| contrato_enviado_em | timestamp | Data do envio |
| contrato_validado | boolean | Admin aprovou |
| contrato_validado_em | timestamp | Data da validacao |
| contrato_validado_por | uuid | ID do admin |
| admin_comentario | text | Comentario do admin |
| status | text | Estado atual da negociacao |
| status_label | text | Label customizado do status |
| status_hint | text | Dica/contexto do status |
| aceita_novas_propostas | boolean | Se novas propostas sao aceitas |
| created_at | timestamp | Data de criacao |

### Mensagem (sendMensagem)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| negociacao_id | integer | FK negociacoes |
| autor_id | uuid | FK auth.users |
| autor_role | text | 'marca' ou 'detentor' |
| autor_nome | text | Nome do autor |
| texto | text | Conteudo da mensagem |

### Contrapartida (createContrapartida)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| negociacao_id | integer | FK negociacoes |
| descricao | text | Descricao da contrapartida |
| categoria | text | Categoria |
| valor | numeric | Valor estimado |
| prazo | text | Prazo de entrega |
| status | text | 'proposta', 'aceita', 'recusada' |
| proposto_por | text | 'marca' ou 'detentor' |

### Rodada (createRodada)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| negociacao_id | integer | FK negociacoes |
| numero | integer | Numero sequencial (imutavel) |
| valor | numeric | Valor proposto na rodada |
| proposto_por | text | 'marca' ou 'detentor' |
| contrapartidas | jsonb | Snapshot das contrapartidas no momento |

---

## Comportamento Esperado

### 1. Inicio da Negociacao (oportunidade-detalhe.html — submitModal)

```
1. Marca autenticada clica "Tenho interesse"
2. Modal de interesse abre com campos:
   - Cota (se oportunidade tem cotas)
   - Assunto
   - Mensagem inicial (opcional)
3. Ao submeter:
   a. Obtem sessao da marca via getSessionAsync('brand')
   b. Extrai marcaId do token
   c. Monta payload:
      {
        oportunidade_id: _CURRENT_OPP.id,
        marca_id: marcaId,
        detentor_id: _CURRENT_OPP.detentor_id,
        cota: cotaSelecionada,
        assunto: assunto,
        status: 'pendente'
      }
   d. Chama createNegociacao(payload) — POST na tabela negociacoes
   e. Se mensagem inicial preenchida:
      - sendMensagem({
          negociacao_id: novoId,
          autor_id: marcaId,
          autor_role: 'marca',
          autor_nome: nomeMarca,
          texto: mensagem
        })
4. Se sucesso: feedback visual + redirect para dashboard
5. Se erro: mensagem de erro
```

### 2. Gate de Visibilidade (oportunidade-detalhe.html — initDetail)

```
1. Parse URL: ?@perfil-slug/opp-slug ou ?id=N
2. Carrega oportunidade
3. Se visibilidade === 'aprovacao':
   a. checkApprovalAccess(oppId, marcaId)
   b. Se nao aprovado: exibe botao "Solicitar acesso"
   c. Se aprovado: exibe detalhes completos + botao interesse
4. Se visibilidade === 'publica':
   a. Exibe detalhes completos diretamente
5. Se visibilidade === 'convidadas':
   a. Nao aparece no catalogo (filtrado em fetchCatalog)
```

### 3. Thread de Mensagens (core.js — sendMensagem)

```
1. Qualquer parte (marca ou detentor) pode enviar mensagem
2. POST na tabela mensagens com:
   { negociacao_id, autor_id, autor_role, autor_nome, texto }
3. Mensagens sao carregadas junto com a negociacao via _negSelectQuery
4. Ordenadas por created_at
5. Exibidas como thread de chat no dashboard
```

### 4. Contrapartidas (core.js — createContrapartida / updateContrapartida)

```
# Criar:
1. POST na tabela contrapartidas com:
   { negociacao_id, descricao, categoria, valor, prazo, status, proposto_por }
2. status default: 'proposta'

# Atualizar:
1. PATCH na tabela contrapartidas WHERE id = cpId
2. Campos atualizaveis: descricao, categoria, valor, prazo, status, proposto_por
3. status pode mudar para 'aceita' ou 'recusada'
```

### 5. Rodadas de Negociacao (core.js — createRodada)

```
1. Calcula proximo numero: getNextRodadaNumero(rodadas)
   - Se nenhuma rodada existe: numero = 1
   - Senao: max(numero) + 1
2. Constroi snapshot de contrapartidas: buildContrapartidasSnapshot(contrapartidas)
   - Mapeia para { descricao, status, proposto_por }
3. POST na tabela rodadas_negociacao:
   { negociacao_id, numero, valor, proposto_por, contrapartidas: snapshot }
4. Rodadas sao IMUTAVEIS — uma vez criadas, nao sao editadas
5. fetchRodadas() retorna ordenado por numero DESC
```

### 6. Beneficios por Cota (core.js — fetchCotaBeneficios)

```
1. Query oportunidades WHERE id = oportunidadeId
2. Parse cotas_data (JSONB array)
3. Busca cota com nome matching (case-insensitive, trim)
4. Retorna array de beneficios da cota encontrada
5. Se nao encontrada: retorna array vazio
```

### 7. Atualizacao de Status (core.js — updateNegociacao)

```
1. PATCH na tabela negociacoes WHERE id = negId
2. Campos atualizaveis:
   - status, status_label, status_hint
   - aceita_novas_propostas
   - valor_proposto, valor_deal, valor_deal_proposto_por, valor_deal_status
   - contrato_url, contrato_enviado_por, contrato_enviado_em
   - Qualquer campo adicional via spread
3. preferRole determina qual sessao usar (default depende do chamador)
```

### 8. Validacao de Contrato pelo Admin (admin.html)

```
# loadDeals():
1. Fetch negociacoes WHERE contrato_url IS NOT NULL
2. Joins: marca(nome,empresa), detentor(nome), oportunidade(titulo), contrapartidas

# renderDeals(filter):
1. 'pendentes': contrato_validado !== true
2. 'validados': contrato_validado === true

# aprovarContrato(negId):
1. PATCH negociacoes SET:
   {
     contrato_validado: true,
     contrato_validado_em: new Date().toISOString(),
     contrato_validado_por: adminId,
     admin_comentario: comentario (se preenchido)
   }

# rejeitarContrato(negId):
1. Exige comentario obrigatorio
2. PATCH negociacoes SET:
   {
     contrato_url: null,
     contrato_enviado_por: null,
     contrato_enviado_em: null,
     contrato_validado: false,
     contrato_validado_em: null,
     contrato_validado_por: null,
     admin_comentario: comentario
   }
3. Anula TODOS os campos de contrato (volta ao estado pre-contrato)

# salvarComentario(negId):
1. PATCH negociacoes SET admin_comentario = texto
```

### 9. Exclusao de Negociacao (core.js — deleteNegociacao)

```
1. DELETE FROM negociacoes WHERE id = negId
2. Usa sessao do preferRole para autorizacao
3. Cascata: mensagens, contrapartidas e rodadas devem ser deletadas via FK cascade ou manualmente
```

---

## Queries Supabase

### Criar Negociacao

```javascript
supabase.from('negociacoes').insert({
  oportunidade_id, marca_id, detentor_id,
  cota, assunto, status: 'pendente'
})
```

### Fetch Negociacoes (select query completa)

```javascript
var _negSelectQuery = 'id,oportunidade_id,marca_id,detentor_id,cota,assunto,' +
  'valor_proposto,valor_deal,valor_deal_proposto_por,valor_deal_status,' +
  'contrato_url,contrato_enviado_por,contrato_enviado_em,' +
  'contrato_validado,contrato_validado_em,contrato_validado_por,admin_comentario,' +
  'status,status_label,status_hint,aceita_novas_propostas,created_at,' +
  'marca:marca_id(nome,empresa),' +
  'oportunidade:oportunidade_id(titulo,categoria),' +
  'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por),' +
  'mensagens(id,autor_role,autor_nome,texto,created_at)';
```

### Fetch por Role

```javascript
// Detentor
supabase.from('negociacoes').select(_negSelectQuery).eq('detentor_id', userId)

// Marca
supabase.from('negociacoes').select(_negSelectQuery).eq('marca_id', userId)
```

### Enviar Mensagem

```javascript
supabase.from('mensagens').insert({
  negociacao_id, autor_id, autor_role, autor_nome, texto
})
```

### Criar Contrapartida

```javascript
supabase.from('contrapartidas').insert({
  negociacao_id, descricao, categoria, valor, prazo, status, proposto_por
})
```

### Criar Rodada

```javascript
supabase.from('rodadas_negociacao').insert({
  negociacao_id, numero, valor, proposto_por, contrapartidas: snapshot
})
```

### Admin — Deals com Contrato

```javascript
supabase.from('negociacoes')
  .select('*,marca:marca_id(nome,empresa),detentor:detentor_id(nome),' +
    'oportunidade:oportunidade_id(titulo),contrapartidas(*)')
  .not('contrato_url', 'is', null)
```

---

## Regras de Negocio

1. **Apenas marca inicia negociacao**: O botao "Tenho interesse" so aparece para marcas autenticadas. Detentor nao pode iniciar negociacao na propria oportunidade.

2. **Status default 'pendente'**: Toda negociacao comeca como pendente.

3. **Mensagem inicial opcional**: A marca pode enviar uma mensagem junto com o interesse, mas nao e obrigatorio.

4. **Rodadas sao imutaveis**: Uma vez criada, uma rodada nao pode ser editada. Novo valor = nova rodada com numero incrementado.

5. **Snapshot de contrapartidas**: Cada rodada captura o estado das contrapartidas naquele momento como JSONB, criando historico auditavel.

6. **Contrapartida status**: Ciclo `proposta` -> `aceita` ou `recusada`. Nao ha status intermediario.

7. **aceita_novas_propostas**: Flag que pode ser desabilitada para bloquear novas propostas de valor numa negociacao.

8. **Contrato anulavel**: Ao rejeitar contrato, o admin zera TODOS os campos de contrato. A parte pode enviar novo contrato.

9. **Comentario obrigatorio na rejeicao**: O admin deve explicar por que rejeitou o contrato.

10. **Comentario opcional na aprovacao**: Pode adicionar observacoes ao aprovar.

11. **Gate de visibilidade**: Oportunidades com `visibilidade='aprovacao'` exigem que a marca tenha acesso aprovado antes de ver detalhes e iniciar negociacao.

12. **Favoritos via localStorage**: O sistema de favoritos em `oportunidade-detalhe.html` usa `localStorage` (chave `rr_favoritos_v1`), nao persiste no banco.

13. **Dual fetch pattern**: `fetchNegociacoesMarca()` e `fetchNegociacoesDetentor()` seguem padrao SDK-first + legacy fallback, identico ao resto do sistema.

---

## Estados Possiveis

### Negociacao

| Estado | status | Descricao |
|--------|--------|-----------|
| Pendente | pendente | Interesse manifestado, aguardando resposta |
| Em analise | analise | Detentor esta avaliando |
| Aceita | aceita | Negociacao aceita |
| Recusada | recusada | Negociacao recusada |
| Cancelada | cancelada | Cancelada por uma das partes |

### Valor Deal

| Estado | valor_deal_status | Descricao |
|--------|-------------------|-----------|
| Proposto | proposto | Valor proposto, aguardando resposta |
| Aceito | aceito | Valor aceito por ambas as partes |
| Recusado | recusado | Valor recusado |

### Contrapartida

| Estado | status | Descricao |
|--------|--------|-----------|
| Proposta | proposta | Sugerida, aguardando avaliacao |
| Aceita | aceita | Aceita pela outra parte |
| Recusada | recusada | Recusada pela outra parte |

### Contrato

| Estado | Condicao |
|--------|----------|
| Sem contrato | contrato_url IS NULL |
| Contrato enviado | contrato_url NOT NULL, contrato_validado = false/null |
| Contrato aprovado | contrato_validado = true |
| Contrato rejeitado | contrato_url anulado pelo admin + admin_comentario |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Marca nao autenticada | getSessionAsync('brand') falha | Redirect para login |
| Oportunidade nao encontrada | Query retorna vazio | Mensagem de erro na pagina |
| Acesso nao aprovado (visibilidade) | checkApprovalAccess() falha | Exibe botao "Solicitar acesso" |
| Erro ao criar negociacao | POST falha | Mensagem generica |
| Erro ao enviar mensagem | POST mensagens falha | Mensagem de erro |
| Rejeicao sem comentario | Admin tenta rejeitar sem texto | Exige preenchimento |
| Contrato invalido | Arquivo nao acessivel | Mensagem de erro |

---

## Fora do Escopo

- Upload do contrato (feito no dashboard, nao documentado aqui em detalhe)
- Notificacoes por email de novas mensagens (se existem, sao Edge Functions nao spec'd)
- Chat em tempo real (mensagens sao fetch periodico, nao realtime/websocket)
- Historico de edicao de contrapartidas (apenas estado atual + rodadas snapshot)
- Workflow automatizado de mudanca de status (todas as transicoes sao manuais)
- Calculo financeiro/comissao sobre deals (nao implementado no MVP)
- Assinatura digital do contrato (fora do escopo MVP)
