# Página: nova-senha.html

> **Última sincronização:** 2026-07-01 — commit `57f61b8` + mudanças locais não commitadas — código alinhado ao spec: o `PUT /auth/v1/user` agora zera `temp_password` além de `senha_provisoria` (necessário para recovery de contas admin, que usam a flag `temp_password`). — Claude Code

**Rota:** `/nova-senha.html` (acessada via link do email com hash `#access_token=...&type=recovery`)
**Acesso:** público (mas só funcional com token de recovery válido na URL)
**Tamanho aproximado:** 628 linhas

---

## O que é

Segunda etapa do fluxo de recuperação de senha. O usuário chega aqui pelo link enviado por email (gerado via Edge Function `send-password-reset` a partir de `esqueci-senha.html`). A página lê o `access_token` do hash da URL, exibe o formulário de nova senha e grava a alteração direto na API REST do Supabase Auth (`PUT /auth/v1/user`).

Mesmo layout split de `esqueci-senha.html` (lado esquerdo decorativo oculto no mobile), com três estados alternáveis no lado direito: link inválido, formulário e sucesso.

## Principais funcionalidades

- Máquina de estados via `showState()`: `stateInvalid` (link inválido/expirado), `stateForm` (formulário) e `stateSuccess` (senha alterada).
- Validação do link no `init()`: parseia `window.location.hash` com `URLSearchParams`; exige `access_token` presente **e** `type === 'recovery'`, senão mostra `stateInvalid` com botão "Solicitar novo link" → `esqueci-senha.html`.
- Formulário com dois campos (nova senha + confirmação), toggle de visibilidade (👁/🙈) em cada um e submit via Enter.
- Validações client-side: mínimo 6 caracteres e campos iguais; erros inline por campo.
- Tradução de erros da API para mensagens amigáveis: senha igual à anterior, senha curta, token expirado/inválido (401), erro genérico.
- Sucesso: exibe `stateSuccess` e redireciona para `login.html` após 2,5 s.
- Tela de loading "Verificando link..." exibida até o `init()` decidir o estado.

## Fluxos principais

### Chegada pelo link do email
1. Email abre `nova-senha.html#access_token={JWT}&type=recovery&...`.
2. `init()` esconde o loading, mostra o layout e valida o hash.
3. Token + type corretos → guarda o token na variável `accessToken` e mostra `stateForm`.
4. Sem token ou type diferente de `recovery` → `stateInvalid` (mensagem informa que links expiram em 1 hora).

### Salvar nova senha
1. Usuário preenche os dois campos e aciona `salvarNovaSenha()`.
2. Validações locais (≥ 6 caracteres; senhas iguais); falha → erro inline e foco.
3. `PUT {SUPABASE_URL}/auth/v1/user` com headers `apikey` + `Authorization: Bearer {accessToken}` e body `{ password, data: { senha_provisoria: false, temp_password: false } }`.
4. `res.ok` → `stateSuccess` + redirect para `login.html` em 2,5 s.
5. Erro → mapeia a mensagem da API: `same/different` → "não pode ser igual à anterior"; `at least/characters/short` → senha curta; 401 ou `expired/invalid` → "Link expirado. Solicite um novo link."; senão erro genérico. Toast de erro e formulário reabilitado.
6. Exceção de rede → toast "Erro de conexão. Tente novamente.".

## Dados (Supabase e APIs)

| Tipo | Nome | Uso |
|------|------|-----|
| Auth (REST) | `PUT /auth/v1/user` | atualiza a senha e zera `user_metadata.senha_provisoria` (e a flag legada `temp_password`), autenticado pelo token de recovery do hash |

Nenhuma tabela, RPC, Edge Function ou Storage é acessado diretamente por esta página.

## Dependências

- **Scripts compartilhados:** `js/core.js` (SUPABASE_URL, SUPABASE_KEY), SDK `@supabase/supabase-js@2` via CDN (carregado, mas a redefinição usa `fetch` direto — não usa `sb.auth.updateUser`).
- **Assets:** `logos/5.png`.
- **Navega de/para:** chega pelo link do email; sai para `login.html` (sucesso, "Voltar ao login"), `esqueci-senha.html` (link inválido) e `index.html` (logo).
- **Spec relacionado:** `specs/features/recuperacao-senha.spec.md`.

## Regras de negócio importantes

- O token de recovery é lido do **hash** da URL (não vai ao servidor em requests de página) e usado uma única vez como Bearer token; nenhuma sessão é criada nem persistida em `localStorage`.
- Junto com a nova senha, o body seta `data: { senha_provisoria: false, temp_password: false }` — isso limpa a flag de senha provisória (e a variante legada `temp_password`) usada por `login.html` para desviar usuários a `acesso-marca.html`/`acesso-detentor.html`. Ou seja, redefinir senha por aqui também conclui o "primeiro acesso".
- A validade real do link (UI diz 1 hora) é imposta pelo Supabase Auth; a página só reage ao 401/`expired`.
- Regra de senha mínima de 6 caracteres validada no client e também esperada do servidor (mensagens mapeadas).

## Pendências e dívidas conhecidas

- A página não valida o token no servidor ao carregar — um token expirado só é detectado quando o usuário tenta salvar (o estado "link inválido" no load cobre apenas hash malformado/ausente).
- Usa API REST direta em vez de `sb.auth.updateUser()`/fluxo de sessão do SDK; o SDK carregado via CDN não é utilizado (peso desnecessário).
- O `refresh_token` presente no hash do link (conforme `specs/features/recuperacao-senha.spec.md`) é ignorado pela página.
- Mensagens de erro da API são mapeadas por substring em inglês (`same`, `at least`, `expired`...) — mudanças de copy no Supabase Auth podem cair no erro genérico.

---

*Ao modificar esta página, atualize este spec no mesmo commit (regra no CLAUDE.md da raiz). Rode `specs/check-freshness.sh` para verificar specs defasadas.*
