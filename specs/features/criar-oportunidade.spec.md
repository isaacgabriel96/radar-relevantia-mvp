# Spec: Criar Oportunidade

> Spec-Driven Development (SDD) — Retroactive spec describing the opportunity creation/editing flow.

## Contexto

A criacao de oportunidade e o fluxo principal do detentor (rightsholder) no Radar Relevantia. Implementado em `criar-oportunidade.html`, e um formulario multi-step que permite criar oportunidades de patrocinio a partir de **templates** pre-definidos. Suporta dois modos: **criacao** e **edicao** (pre-fill a partir de `sessionStorage`).

O formulario oferece duas acoes de salvamento: **rascunho** (draft, nao publicado) e **publicacao** (validacao completa, visivel no catalogo).

---

## Trigger

- Detentor autenticado acessa `criar-oportunidade.html` (criacao)
- Detentor clica "Editar" em uma oportunidade existente (edicao via `sessionStorage`)
- Botao "Salvar rascunho" ou "Publicar" no formulario

---

## Atores

| Ator | Descricao |
|------|-----------|
| Detentor | Usuario autenticado com role `rightsholder` |
| Sistema | Validacao, upload de arquivos, persistencia |

---

## Pre-condicoes

- Detentor autenticado (`requireAuth('rightsholder', 'login.html')`)
- Sessao iniciada via `initSession()` (cascata SDK -> legacy -> refresh)
- `window.currentUser` populado com dados do usuario
- Supabase Storage bucket `oportunidades` acessivel

---

## Campos / Dados

### Templates Disponiveis

| Template | Categoria Mapeada | Gradiente |
|----------|-------------------|-----------|
| personalidade | Celebridade | Gradiente personalizado |
| evento | Evento | Gradiente personalizado |
| esporte | Esporte | Gradiente personalizado |
| midia | Midia Digital | Gradiente personalizado |
| local | Cultura | Gradiente personalizado |
| projeto | Tecnologia | Gradiente personalizado |

Mapeamento reverso `CAT_TO_TPL` usado na edicao para restaurar o template correto.

### Campos do Formulario

| Campo | Chave payload | Tipo | Obrigatorio (publicar) | Validacao |
|-------|---------------|------|------------------------|-----------|
| Titulo | titulo | text | Sim | Nao vazio |
| Descricao curta | descricao_curta | textarea | Nao | Livre |
| Localizacao | localizacao | text composto | Sim | Formato "Cidade, UF -- Brasil" |
| Alcance | alcance | select | Nao | Livre |
| Tags | tags | array | Nao | Livre |
| Video URL | video_url | url | Nao | Livre |
| Link externo | link_externo | url | Nao | Livre |
| Redes sociais | redes_sociais | object | Nao | Livre |
| Detalhes | detalhes | text/rich | Nao | Livre |
| Datas do evento | datas_evento | object | Nao | Datas futuras |
| Fotos | imagens | File[] | Sim (>=1 para publicar) | Imagem valida |
| Media Kit (PDF) | media_kit_url | File | Nao | PDF, max 20MB |
| Cotas habilitadas | cotas_habilitadas | boolean | Nao | - |
| Dados das cotas | cotas_data | JSON array | Se cotas habilitadas | Consistencia interna |
| Visibilidade | visibilidade | select | Nao | Default: 'publica' |
| Background gradient | bg_gradient | string | Auto | Do template selecionado |
| Categoria | categoria | string | Auto | Do template selecionado |
| Categoria slug | categoria_slug | string | Auto | Do template selecionado |

### Estrutura de Cota (cotas_data item)

```json
{
  "nome": "Cota Ouro",
  "valor": 50000,
  "vagas": 3,
  "beneficios": ["Logo no backdrop", "Mencao em redes sociais", "Area VIP"]
}
```

### Opcoes de Visibilidade

| Valor | Descricao |
|-------|-----------|
| `publica` | Visivel para todas as marcas no catalogo (default) |
| `aprovacao` | Visivel no catalogo mas requer solicitacao de acesso |
| `convidadas` | Oculta do catalogo, apenas marcas convidadas |

---

## Comportamento Esperado

### 1. Inicializacao

```
1. requireAuth('rightsholder', 'login.html')
2. initSession() — cascata 3 niveis para obter currentUser
3. maybePreFillEdit() — verifica modo edicao
4. loadMockData() — carrega dados auxiliares
5. initLang() + applyTranslations() — internacionalizacao
6. Setup listener click-outside para date picker calendars
```

### 2. Modo Edicao (maybePreFillEdit)

```
1. Le sessionStorage.getItem('edit_opp')
2. Se existe:
   a. Parse JSON do objeto oportunidade
   b. Define formState.editId = opp.id
   c. Define formState.editSlug = opp.slug
   d. Usa CAT_TO_TPL para selecionar template correto:
      CAT_TO_TPL = {
        'Celebridade': 'personalidade',
        'Evento': 'evento',
        'Esporte': 'esporte',
        'Midia Digital': 'midia',
        'Cultura': 'local',
        'Tecnologia': 'projeto'
      }
   e. Pre-preenche todos os campos:
      - nome, descricao
      - localizacao: parse "Cidade, UF -- Brasil" para separar cidade/UF
      - abrangencia, link_externo, video_url
      - redes_sociais
      - visibilidade
      - fotos existentes (como thumbnails)
3. Se nao existe: modo criacao normal
```

### 3. Coleta de Dados (collectOppData)

```
1. Le todos os campos do formulario
2. Monta payload:
   {
     titulo, categoria, categoria_slug, descricao_curta,
     localizacao, alcance, tags, bg_gradient,
     video_url, link_externo, redes_sociais,
     detalhes, datas_evento,
     cotas_habilitadas, cotas_data,
     visibilidade: visibilidade || 'publica',
     status: 'publicada',    // ou 'rascunho' se draft
     ativo: true             // ou false se draft
   }
3. Retorna objeto completo
```

### 4. Salvar Rascunho (saveDraft)

```
1. Coleta dados via collectOppData()
2. Sobrescreve: status = 'rascunho', ativo = false
3. Obtem token: _getWriteToken()
4. Obtem userId: getAuthUserId()
5. Se modo criacao (sem editId):
   a. Adiciona detentor_id = userId ao payload
   b. POST na tabela oportunidades
   c. Salva ID retornado em formState.editId
6. Se modo edicao (com editId):
   a. PATCH na tabela oportunidades WHERE id = editId
7. Upload de fotos se houver novas: uploadPhotos(oppId, token)
8. Upload de PDF se houver: uploadPDF(oppId, token)
9. Redirect para dashboard-detentor.html#oportunidades apos 1200ms
```

### 5. Publicar (publishOpportunity)

```
1. Validacoes obrigatorias:
   a. titulo nao vazio
   b. localizacao nao vazio
   c. Pelo menos 1 foto
   d. Se cotas habilitadas: consistencia dos dados de cotas
2. Se validacao falha: exibe erros, aborta
3. Coleta dados via collectOppData()
4. status = 'publicada', ativo = true
5. Mesma logica de criacao/edicao que saveDraft (POST ou PATCH)
6. Upload de fotos e PDF
7. Se erros no upload: rastreia separadamente (nao aborta publicacao)
8. Exibe successModal ao concluir
```

### 6. Upload de Fotos (uploadPhotos)

```
1. Para cada foto (data URI):
   a. Converte data URI para Blob
   b. Path: oportunidades/{oppId}/{timestamp}-{index}.{ext}
   c. Upload via Supabase Storage
2. Retorna:
   {
     imagens: [array de URLs publicas],
     imagem_capa: primeira URL,
     imagens_focal: [pontos focais se definidos]
   }
3. Atualiza registro da oportunidade com URLs
```

### 7. Upload de PDF (uploadPDF)

```
1. Valida via validateFileUpload():
   - allowedTypes: ['application/pdf']
   - maxSizeMB: 20
2. Path: oportunidades/opp-{oppId}-midia-kit-{safeName}
3. Upload via Supabase Storage
4. Atualiza registro com media_kit_url
```

---

## Queries Supabase

### Criar Oportunidade

```sql
INSERT INTO oportunidades (
  titulo, categoria, categoria_slug, descricao_curta,
  localizacao, alcance, tags, bg_gradient,
  video_url, link_externo, redes_sociais,
  detalhes, datas_evento,
  cotas_habilitadas, cotas_data,
  visibilidade, status, ativo, detentor_id
) VALUES (...)
RETURNING id
```

### Editar Oportunidade

```sql
UPDATE oportunidades
SET titulo = ?, categoria = ?, ...
WHERE id = :editId
```

### Upload Storage

```
POST {SUPABASE_URL}/storage/v1/object/oportunidades/{path}
Headers: { Authorization: 'Bearer ' + token }
Body: File blob
```

---

## Regras de Negocio

1. **Rascunho vs Publicado**: Rascunho define `status='rascunho'` e `ativo=false`. Publicado define `status='publicada'` e `ativo=true`. Um rascunho nao aparece no catalogo.

2. **Validacao apenas para publicacao**: Rascunhos podem ser salvos sem titulo, sem localizacao, sem fotos. A validacao completa so e exigida ao publicar.

3. **Template obrigatorio**: Toda oportunidade nasce a partir de um template que define a categoria, categoria_slug e bg_gradient.

4. **Visibilidade default 'publica'**: Se nao selecionada explicitamente, a oportunidade e publica.

5. **Fotos obrigatorias para publicar**: Minimo 1 foto necessaria. O upload acontece APOS o INSERT/PATCH do registro principal.

6. **PDF max 20MB**: Validacao de tamanho via `validateFileUpload`.

7. **Edicao via sessionStorage**: O modo edicao e ativado quando existe `sessionStorage.edit_opp`. O dashboard-detentor.html e responsavel por popular esse item antes de navegar.

8. **Upload pos-save**: Fotos e PDF sao enviados depois do INSERT/PATCH da oportunidade. Erros no upload sao rastreados separadamente e nao cancelam a publicacao.

9. **Mapeamento reverso de categoria**: Na edicao, `CAT_TO_TPL` converte a categoria salva de volta para o ID do template, permitindo re-selecionar o template correto.

10. **Cotas opcionais**: O sistema de cotas e habilitado por checkbox. Quando habilitado, cada cota tem nome, valor, vagas e array de beneficios.

---

## Estados Possiveis

| Estado | Condicao |
|--------|----------|
| Modo criacao | Nenhum `edit_opp` no sessionStorage |
| Modo edicao | `edit_opp` presente no sessionStorage |
| Template selecionado | Usuario escolheu um dos 6 templates |
| Preenchendo formulario | Campos sendo preenchidos |
| Validacao falhou | Tentativa de publicar com campos faltantes |
| Salvando rascunho | POST/PATCH em andamento (rascunho) |
| Publicando | POST/PATCH em andamento (publicacao) |
| Upload em andamento | Fotos/PDF sendo enviados ao Storage |
| Upload com erro | Um ou mais uploads falharam |
| Publicacao concluida | successModal exibido |
| Rascunho salvo | Redirect para dashboard em 1200ms |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Titulo vazio | Validacao publicacao | Mensagem inline |
| Localizacao vazia | Validacao publicacao | Mensagem inline |
| Sem fotos | Validacao publicacao | Mensagem inline |
| Cotas inconsistentes | Validacao publicacao | Mensagem inline |
| PDF > 20MB | validateFileUpload() | "Arquivo muito grande" |
| PDF tipo invalido | validateFileUpload() | "Tipo nao permitido" |
| Falha no upload foto | Supabase Storage error | Rastreado em uploadErrors |
| Falha no INSERT/PATCH | Supabase error | Mensagem generica |
| Sessao expirada | getWriteToken() falha | Redirect para login |
| sessionStorage corrompido | JSON.parse falha | Modo criacao (ignora edicao) |

---

## Fora do Escopo

- Visualizacao publica da oportunidade (ver `oportunidade-detalhe.html`)
- Catalogo de oportunidades (ver `fetchCatalog()` em core.js)
- Gestao de oportunidades no dashboard (dashboard-detentor.html)
- Exclusao de oportunidades (se existente, e no dashboard)
- Crop/redimensionamento de imagens (sem processamento de imagem)
- Internacionalizacao completa (i18n existe mas nao e spec'd aqui)
- Templates customizaveis pelo usuario (fixos em 6 opcoes)
