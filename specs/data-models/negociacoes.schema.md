# Schema: Negociacoes (Modelo de Dados)

> Spec-Driven Development (SDD) — Retroactive schema documentation based on actual code usage.

## Contexto

O modelo de dados de negociacoes e o nucleo do sistema Radar Relevantia, representando a relacao comercial entre marcas e detentores. Engloba 4 tabelas principais interconectadas: `negociacoes`, `contrapartidas`, `rodadas_negociacao` e `mensagens`.

Este schema foi inferido a partir do codigo fonte (`js/core.js`, `admin.html`, `oportunidade-detalhe.html`, dashboards) — nao de migrations SQL ou schema dump.

---

## Tabela: negociacoes

### Colunas

| Coluna | Tipo Inferido | Nullable | Default | Descricao |
|--------|---------------|----------|---------|-----------|
| `id` | integer (PK) | Nao | auto-increment | Identificador unico |
| `oportunidade_id` | integer (FK) | Nao | - | Referencia para `oportunidades.id` |
| `marca_id` | uuid (FK) | Nao | - | Referencia para `auth.users.id` (marca) |
| `detentor_id` | uuid (FK) | Nao | - | Referencia para `auth.users.id` (detentor) |
| `cota` | text | Sim | null | Nome da cota selecionada |
| `assunto` | text | Sim | null | Assunto/titulo da negociacao |
| `valor_proposto` | numeric | Sim | null | Valor proposto (campo legacy) |
| `valor_deal` | numeric | Sim | null | Valor do acordo atual |
| `valor_deal_proposto_por` | text | Sim | null | 'marca' ou 'detentor' |
| `valor_deal_status` | text | Sim | null | 'proposto', 'aceito', 'recusado' |
| `contrato_url` | text | Sim | null | URL do contrato no Supabase Storage |
| `contrato_enviado_por` | text | Sim | null | 'marca' ou 'detentor' |
| `contrato_enviado_em` | timestamptz | Sim | null | Data/hora do envio do contrato |
| `contrato_validado` | boolean | Sim | null/false | Se o admin aprovou o contrato |
| `contrato_validado_em` | timestamptz | Sim | null | Data/hora da validacao admin |
| `contrato_validado_por` | uuid | Sim | null | ID do admin que validou |
| `admin_comentario` | text | Sim | null | Comentario do admin sobre o contrato |
| `status` | text | Nao | 'pendente' | Estado atual da negociacao |
| `status_label` | text | Sim | null | Label customizado exibido na UI |
| `status_hint` | text | Sim | null | Dica/contexto adicional do status |
| `aceita_novas_propostas` | boolean | Sim | true | Se novas propostas de valor sao aceitas |
| `created_at` | timestamptz | Nao | now() | Data de criacao |

### Foreign Keys

| Coluna | Referencia | ON DELETE |
|--------|------------|-----------|
| `oportunidade_id` | `oportunidades.id` | Inferido: CASCADE ou RESTRICT |
| `marca_id` | `auth.users.id` | Inferido: CASCADE |
| `detentor_id` | `auth.users.id` | Inferido: CASCADE |
| `contrato_validado_por` | `auth.users.id` | Inferido: SET NULL |

### Indices Inferidos

| Colunas | Tipo | Justificativa |
|---------|------|---------------|
| `id` | PK | Chave primaria |
| `marca_id` | Index | Usado em `fetchNegociacoesMarca()` com `.eq('marca_id', userId)` |
| `detentor_id` | Index | Usado em `fetchNegociacoesDetentor()` com `.eq('detentor_id', userId)` |
| `contrato_url` | Filter | Usado em `admin.html` com `.not('contrato_url', 'is', null)` |

### Joins Usados no Codigo

```javascript
// _negSelectQuery em core.js:
'marca:marca_id(nome,empresa)'           // -> auth.users ou perfis via marca_id
'oportunidade:oportunidade_id(titulo,categoria)'  // -> oportunidades
'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por)'  // -> contrapartidas
'mensagens(id,autor_role,autor_nome,texto,created_at)'  // -> mensagens

// admin.html loadDeals:
'marca:marca_id(nome,empresa)'
'detentor:detentor_id(nome)'
'oportunidade:oportunidade_id(titulo)'
'contrapartidas(*)'
```

### Valores de Status

| status | Descricao |
|--------|-----------|
| `pendente` | Interesse manifestado, aguardando resposta do detentor |
| `analise` | Detentor esta avaliando a proposta |
| `aceita` | Negociacao aceita |
| `recusada` | Negociacao recusada |
| `cancelada` | Cancelada por uma das partes |

### Valores de valor_deal_status

| valor_deal_status | Descricao |
|-------------------|-----------|
| `proposto` | Valor proposto, aguardando resposta |
| `aceito` | Valor aceito |
| `recusado` | Valor recusado |

---

## Tabela: contrapartidas

### Colunas

| Coluna | Tipo Inferido | Nullable | Default | Descricao |
|--------|---------------|----------|---------|-----------|
| `id` | integer (PK) | Nao | auto-increment | Identificador unico |
| `negociacao_id` | integer (FK) | Nao | - | Referencia para `negociacoes.id` |
| `descricao` | text | Nao | - | Descricao da contrapartida |
| `categoria` | text | Sim | null | Categoria da contrapartida |
| `valor` | numeric | Sim | null | Valor estimado |
| `prazo` | text | Sim | null | Prazo de entrega |
| `status` | text | Nao | 'proposta' | Estado da contrapartida |
| `proposto_por` | text | Nao | - | 'marca' ou 'detentor' |

### Foreign Keys

| Coluna | Referencia | ON DELETE |
|--------|------------|-----------|
| `negociacao_id` | `negociacoes.id` | Inferido: CASCADE |

### Valores de Status

| status | Descricao |
|--------|-----------|
| `proposta` | Contrapartida sugerida, aguardando avaliacao |
| `aceita` | Aceita pela outra parte |
| `recusada` | Recusada pela outra parte |

---

## Tabela: rodadas_negociacao

### Colunas

| Coluna | Tipo Inferido | Nullable | Default | Descricao |
|--------|---------------|----------|---------|-----------|
| `id` | integer (PK) | Nao | auto-increment | Identificador unico |
| `negociacao_id` | integer (FK) | Nao | - | Referencia para `negociacoes.id` |
| `numero` | integer | Nao | - | Numero sequencial da rodada (imutavel) |
| `valor` | numeric | Nao | - | Valor proposto nesta rodada |
| `proposto_por` | text | Nao | - | 'marca' ou 'detentor' |
| `contrapartidas` | jsonb | Sim | null | Snapshot das contrapartidas no momento |
| `created_at` | timestamptz | Nao | now() | Data de criacao |

### Foreign Keys

| Coluna | Referencia | ON DELETE |
|--------|------------|-----------|
| `negociacao_id` | `negociacoes.id` | Inferido: CASCADE |

### Formato do JSONB contrapartidas

```json
[
  {
    "descricao": "Logo no backdrop do evento",
    "status": "aceita",
    "proposto_por": "detentor"
  },
  {
    "descricao": "Mencao em redes sociais",
    "status": "proposta",
    "proposto_por": "marca"
  }
]
```

Gerado por `buildContrapartidasSnapshot()` em `core.js`.

### Comportamento

- Rodadas sao **imutaveis**: uma vez criadas, nao sao atualizadas
- `fetchRodadas()` ordena por `numero DESC`
- `getNextRodadaNumero()` retorna `max(numero) + 1` ou `1` se nenhuma rodada existe
- Cada rodada captura o estado completo das contrapartidas naquele ponto no tempo

---

## Tabela: mensagens

### Colunas

| Coluna | Tipo Inferido | Nullable | Default | Descricao |
|--------|---------------|----------|---------|-----------|
| `id` | integer (PK) | Nao | auto-increment | Identificador unico |
| `negociacao_id` | integer (FK) | Nao | - | Referencia para `negociacoes.id` |
| `autor_id` | uuid | Nao | - | ID do autor (auth.users) |
| `autor_role` | text | Nao | - | 'marca' ou 'detentor' |
| `autor_nome` | text | Nao | - | Nome de exibicao do autor |
| `texto` | text | Nao | - | Conteudo da mensagem |
| `created_at` | timestamptz | Nao | now() | Data de criacao |

### Foreign Keys

| Coluna | Referencia | ON DELETE |
|--------|------------|-----------|
| `negociacao_id` | `negociacoes.id` | Inferido: CASCADE |

---

## Diagrama de Relacionamentos

```
auth.users (marca)
     |
     | marca_id
     v
negociacoes -----> oportunidades (via oportunidade_id)
     |    \
     |     \ detentor_id
     |      v
     |   auth.users (detentor)
     |
     |--- contrapartidas (1:N via negociacao_id)
     |
     |--- rodadas_negociacao (1:N via negociacao_id)
     |
     |--- mensagens (1:N via negociacao_id)
     |
     `--- auth.users (admin via contrato_validado_por)
```

---

## Operacoes CRUD no Codigo

### CREATE

| Funcao | Tabela | Arquivo |
|--------|--------|---------|
| `createNegociacao()` | negociacoes | core.js |
| `createContrapartida()` | contrapartidas | core.js |
| `createRodada()` | rodadas_negociacao | core.js |
| `sendMensagem()` | mensagens | core.js |

### READ

| Funcao | Tabela | Arquivo |
|--------|--------|---------|
| `fetchNegociacoesMarca()` | negociacoes + joins | core.js |
| `fetchNegociacoesDetentor()` | negociacoes + joins | core.js |
| `fetchRodadas()` | rodadas_negociacao | core.js |
| `fetchCotaBeneficios()` | oportunidades (cotas_data) | core.js |
| `loadDeals()` | negociacoes + joins | admin.html |

### UPDATE

| Funcao | Tabela | Arquivo |
|--------|--------|---------|
| `updateNegociacao()` | negociacoes | core.js |
| `updateContrapartida()` | contrapartidas | core.js |
| `aprovarContrato()` | negociacoes | admin.html |
| `rejeitarContrato()` | negociacoes | admin.html |
| `salvarComentario()` | negociacoes | admin.html |

### DELETE

| Funcao | Tabela | Arquivo |
|--------|--------|---------|
| `deleteNegociacao()` | negociacoes | core.js |

---

## Notas Tecnicas

1. **Dual fetch pattern**: Todas as funcoes de leitura (fetchNegociacoesMarca, fetchNegociacoesDetentor) usam SDK-first + fallback fetch manual.

2. **rowToNegociacao()**: Funcao de mapeamento completa que transforma a row do Supabase em objeto de aplicacao, incluindo parsing de joins, formatacao de valores monetarios, e normalizacao de campos opcionais.

3. **JSONB para snapshots**: As rodadas armazenam contrapartidas como JSONB, nao como FK. Isso garante imutabilidade do historico mesmo que as contrapartidas originais sejam editadas.

4. **Admin nao tem tabela separada para deals**: Os "deals" do admin sao simplesmente negociacoes filtradas por `contrato_url IS NOT NULL`.

5. **Sem soft delete**: `deleteNegociacao()` faz DELETE real, nao soft delete.

6. **valor_proposto vs valor_deal**: `valor_proposto` parece ser um campo legacy. O fluxo atual usa `valor_deal` + `valor_deal_proposto_por` + `valor_deal_status` para negociacao de valor.
