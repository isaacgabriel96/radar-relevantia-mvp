# Spec: Cadastro de Marca

> Spec-Driven Development (SDD) — Retroactive spec describing the brand registration flow.

## Contexto

O cadastro de marca (brand/sponsor) e um formulario multi-step de 4 etapas em `cadastro-marca.html`. O fluxo coleta dados pessoais, empresariais, perfil de consumo/objetivos e categorias de interesse. Ao final, insere um registro na tabela `marcas_waitlist` com `status='pendente'` para aprovacao manual pelo admin.

Nao ha criacao de conta Supabase Auth nesta etapa — a conta e criada posteriormente pelo admin via Edge Function `create-user-and-send-access` apos aprovacao.

---

## Trigger

- Usuario acessa `cadastro-marca.html` diretamente ou via link na landing page
- Navegacao entre steps via botoes "Proximo" e "Voltar"
- Submissao final no Step 4

---

## Atores

| Ator | Descricao |
|------|-----------|
| Visitante | Usuario nao autenticado preenchendo o cadastro |
| Admin | Aprova/rejeita o cadastro posteriormente (fora deste spec) |

---

## Pre-condicoes

- Supabase acessivel (tabelas `marcas_waitlist`, `codigos_convite`)
- `js/sanitize.js` carregado (valida email, CNPJ, telefone, URL)
- `js/core.js` carregado (acesso ao Supabase client)

---

## Campos / Dados

### Step 1 — Dados Pessoais

| Campo | ID/name | Tipo | Obrigatorio | Validacao |
|-------|---------|------|-------------|-----------|
| Nome | firstName | text | Sim | Nao vazio |
| Sobrenome | lastName | text | Sim | Nao vazio |
| Email corporativo | email | email | Sim | `validateEmail()` + bloqueio FREE_DOMAINS |
| Telefone | phone | tel | Sim | `validatePhone()` (10-13 digitos) |
| Cargo | cargo | text | Sim | Nao vazio |
| Codigo convite | invite-code | text | Nao | Se preenchido: valida contra `codigos_convite` |

#### FREE_DOMAINS (emails bloqueados)

```javascript
const FREE_DOMAINS = [
  'gmail.com', 'hotmail.com', 'yahoo.com', 'yahoo.com.br',
  'outlook.com', 'live.com', 'aol.com', 'icloud.com',
  'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'uol.com.br', 'bol.com.br', 'terra.com.br',
  'ig.com.br', 'globo.com', 'r7.com'
];
```

Logica: extrai dominio do email (`email.split('@')[1].toLowerCase()`), rejeita se esta na lista.

### Step 2 — Dados Empresariais

| Campo | ID/name | Tipo | Obrigatorio | Validacao |
|-------|---------|------|-------------|-----------|
| Empresa | company | text/search | Sim | Busca ou criacao manual |
| CNPJ | cnpj | text | Sim | `validateCNPJ()` (algoritmo checksum completo) |
| Setor | setor | select | Sim | Nao vazio |

A busca de empresa faz query na tabela de empresas existentes. Se nao encontrada, permite criacao manual.

### Step 3 — Perfil e Objetivos

| Campo | ID/name | Tipo | Obrigatorio | Validacao |
|-------|---------|------|-------------|-----------|
| Perfil de consumo | perfil_consumo | select/radio | Sim | Nao vazio |
| Objetivos | objetivos | checkbox group | Sim | Minimo 1, maximo 3 selecionados |
| Orcamento | orcamento | select | Sim | Nao vazio |

### Step 4 — Categorias de Interesse

| Campo | ID/name | Tipo | Obrigatorio | Validacao |
|-------|---------|------|-------------|-----------|
| Categorias | categorias | checkbox group | Sim | Minimo 1 selecionada |

---

## Comportamento Esperado

### 1. Navegacao Multi-Step

```
1. Step 1 visivel por padrao, steps 2-4 ocultos
2. Sidebar lateral mostra progresso (steps 1-4)
3. Botao "Proximo":
   a. Valida campos do step atual
   b. Se invalido: exibe erros inline, impede avanco
   c. Se valido: esconde step atual, mostra proximo
   d. Atualiza sidebar de progresso
4. Botao "Voltar":
   a. Volta ao step anterior sem perda de dados
   b. Campos preenchidos sao preservados
```

### 2. Validacao de Email (Step 1)

```
1. validateEmail(email) — formato RFC 5322 simplificado
2. Extrai dominio: email.split('@')[1].toLowerCase()
3. Verifica se dominio esta em FREE_DOMAINS
4. Se dominio bloqueado: exibe "Use seu email corporativo"
5. Se formato invalido: exibe "Email invalido"
```

### 3. Validacao de Codigo Convite (Step 1)

```
1. Se campo vazio: ignora (opcional)
2. Se preenchido:
   a. Query: SELECT * FROM codigos_convite WHERE codigo = ? AND ativo = true
   b. Se nao encontrado: exibe "Codigo invalido ou expirado"
   c. Se encontrado: marca como valido, armazena para INSERT
```

### 4. Validacao de CNPJ (Step 2)

```
1. Remove formatacao (mantem so digitos)
2. Verifica comprimento === 14
3. Rejeita CNPJs com todos digitos iguais (ex: 11111111111111)
4. Calcula primeiro digito verificador (pesos: 5,4,3,2,9,8,7,6,5,4,3,2)
5. Calcula segundo digito verificador (pesos: 6,5,4,3,2,9,8,7,6,5,4,3,2)
6. Compara digitos calculados com fornecidos
```

### 5. Validacao de Objetivos (Step 3)

```
1. Conta checkboxes marcados no grupo "objetivos"
2. Se < 1: exibe "Selecione pelo menos 1 objetivo"
3. Se > 3: exibe "Selecione no maximo 3 objetivos"
4. Ao marcar o 4o checkbox: desmarca automaticamente ou impede
```

### 6. Submissao Final (Step 4)

```
1. Valida Step 4 (minimo 1 categoria)
2. Monta payload completo:
   {
     nome: firstName + ' ' + lastName,
     email: email,
     telefone: phone,
     cargo: cargo,
     empresa: company,
     cnpj: cnpj,
     setor: setor,
     perfil_consumo: perfil_consumo,
     objetivos: [array de objetivos selecionados],
     orcamento: orcamento,
     categorias: [array de categorias selecionadas],
     codigo_convite: invite-code || null,
     status: 'pendente'
   }
3. INSERT na tabela marcas_waitlist
4. Se sucesso: exibe tela de confirmacao
5. Se erro: exibe mensagem de erro generico
```

---

## Queries Supabase

### Validacao de Codigo Convite

```sql
SELECT * FROM codigos_convite
WHERE codigo = :codigo AND ativo = true
LIMIT 1
```

### INSERT Waitlist

```sql
INSERT INTO marcas_waitlist (
  nome, email, telefone, cargo, empresa, cnpj, setor,
  perfil_consumo, objetivos, orcamento, categorias,
  codigo_convite, status
) VALUES (...)
```

---

## Regras de Negocio

1. **Email corporativo obrigatorio**: Dominios gratuitos (gmail, hotmail, yahoo, outlook, etc.) sao bloqueados. A lista `FREE_DOMAINS` contem 17 dominios. Esta restricao se aplica APENAS ao cadastro de marca, NAO ao cadastro de detentor.

2. **CNPJ com validacao completa**: Nao apenas formato — o algoritmo de digitos verificadores (modulo 11) e aplicado. CNPJs com todos digitos iguais sao rejeitados.

3. **Codigo convite opcional**: O campo existe mas nao e obrigatorio. Se preenchido, deve corresponder a um codigo ativo na tabela `codigos_convite`.

4. **Maximo 3 objetivos**: Hard limit no frontend para selecao de objetivos.

5. **Status inicial = 'pendente'**: Todo cadastro entra como pendente para revisao manual pelo admin.

6. **Sem criacao de conta Auth**: Nesta etapa, apenas os dados sao coletados. A conta Supabase Auth e criada pelo admin ao aprovar (via Edge Function `create-user-and-send-access`).

7. **Dados preservados entre steps**: Ao navegar para frente e para tras, os campos preenchidos sao mantidos. Nao ha persistencia intermediaria (nao salva rascunho).

8. **Telefone flexivel**: Aceita formatos brasileiros com 10-13 digitos (fixo, celular, com ou sem codigo do pais).

---

## Estados Possiveis

| Estado | Condicao |
|--------|----------|
| Step 1 ativo | Formulario inicial carregado |
| Step 2 ativo | Step 1 validado com sucesso |
| Step 3 ativo | Step 2 validado com sucesso |
| Step 4 ativo | Step 3 validado com sucesso |
| Submissao em andamento | POST sendo enviado ao Supabase |
| Cadastro concluido | INSERT retornou sucesso, tela de confirmacao |
| Erro de submissao | INSERT falhou, mensagem de erro |
| Codigo convite invalido | Query retornou vazio ou ativo=false |
| Email bloqueado | Dominio na lista FREE_DOMAINS |
| CNPJ invalido | Checksum dos digitos verificadores falhou |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Email com dominio gratuito | Validacao frontend | "Use seu email corporativo" — impede avanco |
| CNPJ invalido | validateCNPJ() | Mensagem inline no campo |
| Telefone invalido | validatePhone() | Mensagem inline no campo |
| Codigo convite invalido | Query codigos_convite | "Codigo invalido ou expirado" |
| Email duplicado na waitlist | Supabase unique constraint | Mensagem de erro (email ja cadastrado) |
| Erro de rede | fetch/SDK error | Mensagem generica de erro |
| Campos obrigatorios vazios | Validacao por step | Highlighting dos campos + mensagem |

---

## Fora do Escopo

- Aprovacao do cadastro pelo admin (ver `admin.html` / ARCHITECTURE.md)
- Criacao de conta Supabase Auth (feita pelo admin via Edge Function)
- Envio de email de boas-vindas (Edge Function `create-user-and-send-access`)
- Edicao de dados apos submissao (nao implementado para waitlist)
- Upload de documentos ou logo da marca (nao existe nesta etapa)
- Validacao de CNPJ contra Receita Federal (apenas checksum local)
- Bloqueio de email duplicado em tempo real (apenas no INSERT)
