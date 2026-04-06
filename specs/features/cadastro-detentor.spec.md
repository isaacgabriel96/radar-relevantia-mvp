# Spec: Cadastro de Detentor

> Spec-Driven Development (SDD) — Retroactive spec describing the rightsholder registration flow.

## Contexto

O cadastro de detentor (rightsholder/event organizer) e um formulario de pagina unica em `cadastro-detentor.html`. Diferente do cadastro de marca (4 steps), este e um formulario simples que coleta dados pessoais e profissionais. Requer um **codigo de acesso** obrigatorio (validado contra a tabela `codigos_convite`). Ao submeter, insere na tabela `detentores_waitlist` com `status='pendente'`.

---

## Trigger

- Usuario acessa `cadastro-detentor.html` diretamente ou via link na landing page
- Validacao em tempo real do codigo de acesso (com throttle)
- Submissao do formulario

---

## Atores

| Ator | Descricao |
|------|-----------|
| Visitante | Usuario nao autenticado preenchendo o cadastro |
| Admin | Aprova/rejeita o cadastro posteriormente (fora deste spec) |

---

## Pre-condicoes

- Supabase acessivel (tabelas `detentores_waitlist`, `codigos_convite`)
- `js/sanitize.js` carregado
- `js/core.js` carregado
- Visitante possui codigo de acesso valido (fornecido por embaixador ou admin)

---

## Campos / Dados

### Formulario (pagina unica)

| Campo | ID/name | Tipo | Obrigatorio | Validacao |
|-------|---------|------|-------------|-----------|
| Nome completo | nome | text | Sim | Nao vazio |
| Email | email | email | Sim | `validateEmail()` |
| Empresa/Organizacao | empresa | text | Sim | Nao vazio |
| Segmento | segmento | select | Sim | Nao vazio |
| Telefone | telefone | tel | Sim | `validatePhone()` com seletor de pais |
| Website | website | url | Nao | Se preenchido: `validateURL()` |
| Estado | estado | select | Sim | Nao vazio |
| Cidade | cidade | select | Sim | Nao vazio (dropdown dinamico) |
| Cargo | cargo | text | Sim | Nao vazio |
| Indicacao | indicacao | text | Nao | Livre (quem indicou) |
| Codigo de acesso | codigo_acesso | text | Sim | Validacao contra `codigos_convite` |

### Seletor de Pais (telefone)

O campo telefone inclui um dropdown com 14 paises e seus codigos DDI:

```
Brasil (+55), EUA (+1), Argentina (+54), Chile (+56),
Colombia (+57), Mexico (+52), Peru (+51), Paraguai (+595),
Uruguai (+598), Bolivia (+591), Equador (+593),
Venezuela (+58), Portugal (+351), Espanha (+34)
```

### Dropdown Dinamico de Cidade

- Quando o usuario seleciona um **estado**, o dropdown de **cidade** e populado dinamicamente com as cidades daquele estado.
- Antes da selecao de estado, o campo cidade fica desabilitado.

---

## Comportamento Esperado

### 1. Validacao do Codigo de Acesso (em tempo real)

```
1. Campo codigo_acesso tem listener de input com throttle(800ms)
2. A cada alteracao (apos debounce):
   a. Query: SELECT * FROM codigos_convite WHERE codigo = ? AND ativo = true
   b. Se encontrado: exibe indicador verde (valido)
   c. Se nao encontrado: exibe indicador vermelho (invalido)
3. Se campo vazio: remove indicadores
```

### 2. Validacao de Email

```
1. validateEmail(email) — RFC 5322 simplificado
2. NAO bloqueia dominios gratuitos (diferente do cadastro de marca)
3. gmail.com, hotmail.com, etc. sao aceitos
```

### 3. Validacao de Website (opcional)

```
1. Se campo vazio: ignora
2. Se preenchido:
   a. validateURL(url)
   b. Adiciona https:// se protocolo ausente
   c. Verifica se hostname tem TLD valido
```

### 4. Selecao de Estado/Cidade

```
1. Usuario seleciona estado no dropdown
2. Sistema popula dropdown de cidades com municipios do estado
3. Campo cidade fica habilitado
4. Se usuario muda o estado: reseta selecao de cidade
```

### 5. Submissao

```
1. Valida todos os campos obrigatorios
2. Valida codigo de acesso (query final de confirmacao)
3. Monta payload:
   {
     nome: nome,
     email: email,
     empresa: empresa,
     segmento: segmento,
     telefone: codigoPais + telefone,
     website: website || null,
     estado: estado,
     cidade: cidade,
     cargo: cargo,
     indicacao: indicacao || null,
     codigo_acesso: codigo_acesso,
     status: 'pendente'
   }
4. INSERT na tabela detentores_waitlist
5. Se sucesso: exibe tela de confirmacao
6. Se erro: exibe mensagem de erro
```

---

## Queries Supabase

### Validacao de Codigo de Acesso (throttled)

```sql
SELECT * FROM codigos_convite
WHERE codigo = :codigo AND ativo = true
LIMIT 1
```

### INSERT Waitlist

```sql
INSERT INTO detentores_waitlist (
  nome, email, empresa, segmento, telefone,
  website, estado, cidade, cargo, indicacao,
  codigo_acesso, status
) VALUES (...)
```

---

## Regras de Negocio

1. **Codigo de acesso obrigatorio**: Diferente da marca (onde e opcional), o detentor DEVE fornecer um codigo de acesso valido. Sem codigo, a submissao e bloqueada.

2. **Sem bloqueio de dominio de email**: Diferente da marca, o detentor pode usar email pessoal (gmail, hotmail, etc.). Nao ha lista FREE_DOMAINS aplicada.

3. **Formulario de pagina unica**: Nao ha multi-step. Todos os campos estao visiveis na mesma pagina.

4. **Throttle na validacao do codigo**: A funcao `checkCodigo` usa `throttle(800ms)` para evitar queries excessivas ao Supabase durante digitacao.

5. **Status inicial = 'pendente'**: Identico ao fluxo de marca — entra como pendente para aprovacao admin.

6. **Sem criacao de conta Auth**: Apenas dados coletados. Conta criada pelo admin ao aprovar.

7. **Website opcional**: Unico campo opcional do formulario (alem de indicacao).

8. **Seletor de pais internacional**: Suporte a 14 paises para o codigo do telefone, nao apenas Brasil.

9. **Cidade dinamica por estado**: O dropdown de cidade depende da selecao do estado, populado dinamicamente.

---

## Estados Possiveis

| Estado | Condicao |
|--------|----------|
| Formulario vazio | Pagina carregada, nenhum campo preenchido |
| Codigo validando | Throttle ativo, query em andamento |
| Codigo valido | Query retornou codigo ativo |
| Codigo invalido | Query retornou vazio ou ativo=false |
| Formulario com erros | Validacao falhou em 1+ campos |
| Submissao em andamento | POST sendo enviado |
| Cadastro concluido | INSERT retornou sucesso |
| Erro de submissao | INSERT falhou |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Codigo de acesso invalido | Query codigos_convite | Indicador vermelho + bloqueio de submit |
| Email invalido | validateEmail() | Mensagem inline |
| Telefone invalido | validatePhone() | Mensagem inline |
| Website invalido | validateURL() | Mensagem inline (se preenchido) |
| Campos obrigatorios vazios | Validacao frontend | Highlighting + mensagem |
| Email duplicado | Supabase constraint | Mensagem de erro |
| Erro de rede | fetch/SDK error | Mensagem generica |

---

## Fora do Escopo

- Aprovacao pelo admin (ver ARCHITECTURE.md)
- Criacao de conta Supabase Auth (Edge Function `create-user-and-send-access`)
- Gestao de codigos de acesso (feita pelo admin em `admin.html`)
- Gestao de embaixadores que fornecem os codigos (feita pelo admin)
- Edicao de dados apos submissao
- Validacao de CNPJ (detentor nao pede CNPJ, apenas marca)
- Lista de estados/cidades (dados estaticos embutidos no HTML)
