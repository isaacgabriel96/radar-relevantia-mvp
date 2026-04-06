# Schema: Oportunidades (Modelo de Dados)

> Spec-Driven Development (SDD) — Retroactive schema documentation based on actual code usage.

## Contexto

A tabela `oportunidades` armazena as oportunidades de patrocinio criadas pelos detentores. E a entidade central do marketplace, conectando-se a negociacoes, perfis de detentor, e o catalogo publico. O schema foi inferido a partir de `criar-oportunidade.html` (collectOppData, saveDraft, publishOpportunity), `js/core.js` (fetchCatalog, fetchCotaBeneficios) e `oportunidade-detalhe.html`.

---

## Tabela: oportunidades

### Colunas

| Coluna | Tipo Inferido | Nullable | Default | Descricao |
|--------|---------------|----------|---------|-----------|
| `id` | integer (PK) | Nao | auto-increment | Identificador unico |
| `detentor_id` | uuid (FK) | Nao | - | Referencia para `auth.users.id` (criador) |
| `titulo` | text | Nao | - | Nome/titulo da oportunidade |
| `slug` | text | Sim | gerado | Slug para URL amigavel |
| `categoria` | text | Nao | - | Categoria mapeada do template (Celebridade, Evento, Esporte, Midia Digital, Cultura, Tecnologia) |
| `categoria_slug` | text | Nao | - | Slug da categoria |
| `descricao_curta` | text | Sim | null | Descricao resumida |
| `localizacao` | text | Sim | null | Formato: "Cidade, UF -- Brasil" |
| `alcance` | text | Sim | null | Abrangencia/escopo do evento |
| `tags` | text[] ou jsonb | Sim | null | Tags descritivas |
| `bg_gradient` | text | Sim | null | CSS gradient string do template |
| `video_url` | text | Sim | null | URL de video (YouTube, etc.) |
| `link_externo` | text | Sim | null | Link para site externo |
| `redes_sociais` | jsonb | Sim | null | Objeto com links de redes sociais |
| `detalhes` | text | Sim | null | Descricao longa/detalhada |
| `datas_evento` | jsonb | Sim | null | Datas do evento |
| `cotas_habilitadas` | boolean | Sim | false | Se o sistema de cotas esta ativo |
| `cotas_data` | jsonb | Sim | null | Array de cotas com beneficios |
| `visibilidade` | text | Nao | 'publica' | 'publica', 'aprovacao', 'convidadas' |
| `status` | text | Nao | - | 'rascunho' ou 'publicada' |
| `ativo` | boolean | Nao | - | Se a oportunidade esta ativa |
| `imagens` | text[] ou jsonb | Sim | null | URLs das fotos no Storage |
| `imagem_capa` | text | Sim | null | URL da foto de capa |
| `imagens_focal` | jsonb | Sim | null | Pontos focais das imagens |
| `media_kit_url` | text | Sim | null | URL do PDF no Storage |
| `created_at` | timestamptz | Nao | now() | Data de criacao |
| `updated_at` | timestamptz | Sim | now() | Data de atualizacao |

### Foreign Keys

| Coluna | Referencia | ON DELETE |
|--------|------------|-----------|
| `detentor_id` | `auth.users.id` | Inferido: CASCADE |

### Indices Inferidos

| Colunas | Tipo | Justificativa |
|---------|------|---------------|
| `id` | PK | Chave primaria |
| `detentor_id` | Index | Filtragem por detentor no dashboard |
| `status` | Index | Filtragem por status no catalogo |
| `ativo` | Index | Filtragem de ativas no catalogo |
| `visibilidade` | Index | Filtragem no fetchCatalog |
| `slug` | Unique? | Usado em URLs (`?@perfil-slug/opp-slug`) |

---

## Estrutura JSONB: cotas_data

Quando `cotas_habilitadas = true`, o campo `cotas_data` contem um array JSON de cotas:

```json
[
  {
    "nome": "Cota Diamante",
    "valor": 100000,
    "vagas": 1,
    "beneficios": [
      "Naming rights do evento",
      "Logo exclusivo no backdrop",
      "Area VIP premium",
      "Mencoes em todas as redes"
    ]
  },
  {
    "nome": "Cota Ouro",
    "valor": 50000,
    "vagas": 3,
    "beneficios": [
      "Logo no backdrop",
      "Mencao em redes sociais",
      "Area VIP"
    ]
  },
  {
    "nome": "Cota Prata",
    "valor": 25000,
    "vagas": 5,
    "beneficios": [
      "Logo no material impresso",
      "Mencao no site"
    ]
  }
]
```

### Campos de cada Cota

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `nome` | string | Nome da cota (ex: "Cota Ouro") |
| `valor` | number | Valor em reais |
| `vagas` | number | Quantidade de vagas disponiveis |
| `beneficios` | string[] | Lista de beneficios inclusos |

### Acesso via Codigo (fetchCotaBeneficios)

```javascript
// core.js — fetchCotaBeneficios(oportunidadeId, cotaNome)
// 1. Busca oportunidade por id
// 2. Parse cotas_data
// 3. Busca cota com nome matching (case-insensitive, trim)
// 4. Retorna array de beneficios
```

---

## Estrutura JSONB: redes_sociais

```json
{
  "instagram": "https://instagram.com/evento",
  "facebook": "https://facebook.com/evento",
  "twitter": "https://twitter.com/evento",
  "linkedin": "https://linkedin.com/company/evento",
  "youtube": "https://youtube.com/@evento",
  "tiktok": "https://tiktok.com/@evento"
}
```

Campos sao opcionais — o objeto pode conter qualquer subconjunto das redes.

---

## Estrutura JSONB: datas_evento

```json
{
  "inicio": "2026-06-15",
  "fim": "2026-06-17",
  "tipo": "periodo"
}
```

Formatos possiveis:
- Evento com data fixa: `{ "data": "2026-06-15" }`
- Evento com periodo: `{ "inicio": "2026-06-15", "fim": "2026-06-17" }`
- Evento continuo/sem data de fim: `{ "inicio": "2026-06-15", "continua": true }`

---

## Valores Enumerados

### status

| Valor | Descricao |
|-------|-----------|
| `rascunho` | Nao publicada, nao visivel no catalogo |
| `publicada` | Publicada e visivel (se ativo=true) |

### visibilidade

| Valor | Descricao | Comportamento no Catalogo |
|-------|-----------|---------------------------|
| `publica` | Visivel para todas as marcas | Aparece em `fetchCatalog()` |
| `aprovacao` | Visivel mas requer acesso | Aparece no catalogo, detalhes bloqueados |
| `convidadas` | Apenas para marcas convidadas | Filtrada em `fetchCatalog()` (nao aparece) |

### Template -> Categoria Mapping

| Template (criar-oportunidade) | Categoria (banco) |
|-------------------------------|-------------------|
| `personalidade` | `Celebridade` |
| `evento` | `Evento` |
| `esporte` | `Esporte` |
| `midia` | `Midia Digital` |
| `local` | `Cultura` |
| `projeto` | `Tecnologia` |

---

## Storage (Supabase Storage)

### Bucket: `oportunidades`

| Tipo | Path Pattern | Descricao |
|------|-------------|-----------|
| Foto | `oportunidades/{oppId}/{timestamp}-{index}.{ext}` | Imagens do evento/propriedade |
| PDF | `oportunidades/opp-{oppId}-midia-kit-{safeName}` | Media kit em PDF |

### Regras de Upload

- **Fotos**: Sem limite de tipo especifico (aceita imagens comuns), sem limite de tamanho explicito no codigo
- **PDF**: Apenas `application/pdf`, maximo 20MB (`validateFileUpload`)
- **Upload pos-save**: Arquivos sao enviados APOS o INSERT/PATCH do registro

---

## Queries no Codigo

### fetchCatalog (core.js)

```javascript
supabase
  .from('oportunidades')
  .select('*, perfil:detentor_id(nome, slug, avatar_url)')
  .eq('ativo', true)
  .neq('visibilidade', 'convidadas')
```

Nota: filtra `ativo=true` e exclui `visibilidade='convidadas'` do catalogo publico.

### Criar (criar-oportunidade.html)

```javascript
// POST (nova oportunidade)
supabase.from('oportunidades').insert(payload).select()

// PATCH (edicao)
supabase.from('oportunidades').update(payload).eq('id', editId)
```

### Detalhe (oportunidade-detalhe.html)

```javascript
// Por slug
supabase.from('oportunidades')
  .select('*, perfil:detentor_id(nome, slug, ...)')
  .eq('slug', oppSlug)
  .single()

// Por ID
supabase.from('oportunidades')
  .select('*, perfil:detentor_id(nome, slug, ...)')
  .eq('id', oppId)
  .single()
```

### Beneficios de Cota (core.js)

```javascript
supabase.from('oportunidades')
  .select('cotas_data')
  .eq('id', oportunidadeId)
  .single()
```

---

## Relacionamentos

```
auth.users (detentor)
     |
     | detentor_id
     v
oportunidades
     |
     |--- negociacoes (1:N via oportunidade_id)
     |
     |--- perfis (join via detentor_id para dados de exibicao)
     |
     `--- Storage: oportunidades/{id}/* (fotos, PDF)
```

### Tabela: perfis (join)

Usada em `fetchCatalog()` para exibir informacoes do detentor:

| Campo acessado | Descricao |
|----------------|-----------|
| `nome` | Nome de exibicao do detentor |
| `slug` | Slug para URL do perfil |
| `avatar_url` | URL do avatar |

---

## Notas Tecnicas

1. **Slug gerado**: O slug parece ser gerado automaticamente (possivelmente trigger no banco ou no backend). E usado para URLs amigaveis no formato `?@perfil-slug/opp-slug`.

2. **cotas_data como JSONB denormalizado**: Os dados de cotas sao armazenados como JSONB na propria tabela de oportunidades, nao em tabela separada. Isso simplifica queries mas dificulta consultas granulares por cota.

3. **Imagens como array no registro**: As URLs das fotos sao armazenadas na propria tabela (campos `imagens`, `imagem_capa`), nao em tabela separada de midias.

4. **ativo vs status**: Dois campos controlam a visibilidade: `status='publicada'` indica intencao de publicacao, `ativo=true` indica disponibilidade. Rascunhos tem `status='rascunho'` E `ativo=false`.

5. **bg_gradient**: Cada template define um gradiente CSS que e salvo na oportunidade para renderizacao visual no catalogo.

6. **Localizacao como texto livre**: O formato "Cidade, UF -- Brasil" e composto no frontend a partir de campos separados. No banco e armazenado como texto unico.

7. **Media kit opcional**: O PDF de media kit e um recurso complementar, nao obrigatorio nem para publicacao.
