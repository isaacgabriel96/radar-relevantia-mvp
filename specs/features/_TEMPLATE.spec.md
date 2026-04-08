# Spec: [NOME DA FEATURE]

**Versão:** 1.0
**Status:** `draft` | `review` | `approved` | `implemented`
**Autor:** [nome]
**Data:** YYYY-MM-DD
**Arquivo de implementação:** `[caminho/para/arquivo.html]` ou `[a definir]`

---

## 1. Visão Geral

> Uma frase descrevendo o que essa feature faz e por que existe.

**Problema que resolve:**
> Descreva o problema do usuário ou necessidade de negócio.

**Critério de sucesso:**
> Como saberemos que a feature está funcionando? O que o usuário consegue fazer depois que não conseguia antes?

---

## 2. Atores e Roles

| Ator | Role | Ação permitida |
|------|------|----------------|
| Marca | `marca` | |
| Detentor | `detentor` | |
| Admin | `admin` | |
| Público (não autenticado) | — | |

> Remova as linhas que não se aplicam.

---

## 3. Pré-condições

> O que precisa ser verdade ANTES de o usuário acessar essa feature?

- [ ] Usuário autenticado com role `___`
- [ ] Registro `___` existe no banco com status `___`
- [ ] Campo `___` preenchido em `___`
- [ ] (adicione outros pré-requisitos)

---

## 4. Fluxo Principal

> Caminho feliz — o que acontece quando tudo dá certo.

**Trigger:** [como o usuário chega aqui — URL direta, botão em X, redirect após Y]

```
1. Usuário [ação]
2. Sistema [reação imediata / UI feedback]
3. Sistema chama [Supabase table / edge function / endpoint]
4. Se sucesso → [próxima tela / estado / mensagem]
5. [continua...]
```

**Estado final esperado:**
- UI mostra: `___`
- Banco de dados: tabela `___`, coluna `___` = `___`
- URL: `___`

---

## 5. Fluxos Alternativos

### 5.1 [Nome do cenário alternativo]

> Quando / por que esse caminho ocorre?

```
1. [passo diferente do fluxo principal]
2. Sistema [reação]
3. [resolução]
```

### 5.2 [Outro cenário]

```
1. ...
```

---

## 6. Fluxos de Erro

| # | Cenário de erro | Causa provável | Mensagem ao usuário | Ação do sistema |
|---|----------------|----------------|---------------------|-----------------|
| E1 | | | | |
| E2 | | | | |
| E3 | | | | |

> **Padrão de mensagens de erro Radar Relevantia:**
> - Seja específico: "Email não encontrado" em vez de "Erro no login"
> - Sugira ação quando possível: "Verifique sua conexão e tente novamente"
> - Nunca exponha erros técnicos (stack traces, mensagens do Supabase) ao usuário

---

## 7. Validações

### 7.1 Campos do Formulário (se aplicável)

| Campo | Tipo | Obrigatório | Regra de validação | Mensagem de erro |
|-------|------|-------------|-------------------|------------------|
| `campo_a` | text | Sim | min 3 chars | "Mínimo 3 caracteres" |
| `campo_b` | email | Sim | formato email válido | "Email inválido" |
| `campo_c` | number | Não | > 0 | "Deve ser positivo" |

### 7.2 Regras de Negócio

- [ ] [Regra 1: ex. "Uma oportunidade só pode ser editada se status = 'rascunho'"]
- [ ] [Regra 2]
- [ ] [Regra 3]

---

## 8. Modelo de Dados

### 8.1 Tabelas Envolvidas

```sql
-- Tabela principal afetada
TABLE nome_tabela (
  id          uuid PRIMARY KEY,
  campo_a     text NOT NULL,
  campo_b     numeric,
  status      text CHECK (status IN ('valor1', 'valor2')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

### 8.2 Operações Supabase

```javascript
// Leitura
const { data, error } = await supabase
  .from('tabela')
  .select('campo_a, campo_b')
  .eq('id', id)
  .single();

// Escrita
const { data, error } = await supabase
  .from('tabela')
  .insert({ campo_a: valor })
  .select()
  .single();

// Atualização
const { data, error } = await supabase
  .from('tabela')
  .update({ status: 'novo_status' })
  .eq('id', id)
  .select()
  .single();
```

### 8.3 Row Level Security (RLS)

| Operação | Quem pode | Condição |
|----------|-----------|----------|
| SELECT | `marca` | `auth.uid() = marca_id` |
| INSERT | `marca` | `auth.uid() IS NOT NULL` |
| UPDATE | `marca` | `auth.uid() = marca_id AND status = 'rascunho'` |
| DELETE | `admin` | sempre |

---

## 9. Comportamento de UI

### 9.1 Estados Visuais

| Estado | O que o usuário vê |
|--------|--------------------|
| Loading | Spinner / skeleton |
| Empty | Mensagem "___" + CTA "___" |
| Erro | Toast/banner com mensagem de erro |
| Sucesso | Toast "___" + redirect para "___" |

### 9.2 Feedback Imediato

- Botão de submit: desabilita durante requisição, mostra "Aguarde..."
- Campos: validação on-blur (não on-keyup para evitar ruído)
- Erros: aparecem abaixo do campo afetado, não em alert()

### 9.3 Responsividade

- [ ] Mobile (< 768px): [descreva diferenças se houver]
- [ ] Desktop: layout padrão

---

## 10. Integrações Externas

| Sistema | Quando é chamado | Dados enviados | Resposta esperada |
|---------|-----------------|----------------|-------------------|
| Supabase Auth | | | |
| Supabase Storage | | | |
| n8n / Webhook | | | |
| WhatsApp API | | | |

> Remova linhas não aplicáveis.

---

## 11. Segurança

- [ ] Rota protegida por `requireAuth('role')`
- [ ] Dados sensíveis não expostos no frontend
- [ ] Upload de arquivos: validar tipo e tamanho antes do upload
- [ ] Inputs sanitizados (Supabase parameteriza automaticamente, mas atenção a campos usados em `.filter()` dinâmico)
- [ ] [Considerações específicas desta feature]

---

## 12. Critérios de Aceitação

> Lista objetiva e testável. Cada item deve ser verificável manualmente ou por teste automatizado.

```gherkin
DADO   [contexto inicial / pré-condição]
QUANDO [ação do usuário]
ENTÃO  [resultado esperado]

DADO   usuário autenticado como marca
QUANDO acessa a página de [feature]
ENTÃO  vê [elemento X] e não vê [elemento Y restrito a admin]

DADO   campo obrigatório vazio
QUANDO clica em "Salvar"
ENTÃO  vê mensagem de erro "___" e formulário não é submetido

DADO   operação bem-sucedida
QUANDO sistema salva no banco
ENTÃO  usuário vê confirmação "___" e é redirecionado para "___"
```

---

## 13. Casos de Teste (Manual)

| # | Cenário | Passo a passo | Resultado esperado |
|---|---------|---------------|-------------------|
| T1 | Fluxo principal | 1. Faça X<br>2. Clique Y<br>3. Preencha Z | Tela W aparece, banco tem registro |
| T2 | Campo obrigatório vazio | 1. Deixe campo A vazio<br>2. Clique Salvar | Erro "___" aparece |
| T3 | Usuário sem permissão | 1. Acesse URL diretamente como role errada | Redirect para login |
| T4 | Erro de rede | 1. Simule offline<br>2. Tente salvar | Mensagem de erro amigável |

---

## 14. Dependências

### 14.1 Depende de (features que devem existir antes)

- `autenticacao.spec.md` — sessão ativa obrigatória
- `[outra feature]` — [motivo]

### 14.2 É dependência de (features que dependem desta)

- `[feature futura]` — [motivo]

---

## 15. Fora de Escopo (MVP)

> O que explicitamente NÃO será implementado nesta versão.

- [ ] [Ex: notificações por email]
- [ ] [Ex: histórico de edições]
- [ ] [Ex: export para PDF]

---

## 16. Notas de Implementação

> Dicas, gotchas, decisões técnicas relevantes para quem vai codar.

- **Padrão de sessão:** usar `getSession('role')` de `core.js`, nunca acessar localStorage diretamente
- **Erros Supabase:** sempre verificar `if (error)` antes de usar `data`
- **Fonts:** headings = Poppins, body = DM Sans, métricas = Space Grotesk (ver design-system)
- [Adicione notas específicas desta feature]

---

## 17. Histórico de Revisões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0 | YYYY-MM-DD | | Criação inicial |
| 1.1 | | | |

---

*Este template segue o padrão SDD do Radar Relevantia. Antes de iniciar o código, este spec deve estar com status `approved`.*
