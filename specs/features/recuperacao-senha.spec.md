# Spec: Recuperacao de Senha

> Spec-Driven Development (SDD) — Retroactive spec describing the password recovery flow.

## Contexto

A recuperacao de senha do Radar Relevantia e dividida em duas paginas independentes:

1. **`esqueci-senha.html`** — Solicita envio do link de recuperacao por email
2. **`nova-senha.html`** — Recebe o link (com token na URL hash), permite definir nova senha

O envio do email e feito via **Edge Function `send-password-reset`** no Supabase. A redefinicao usa a **API REST direta** do Supabase Auth (`PUT /auth/v1/user`).

---

## Trigger

- Usuario clica "Esqueci minha senha" na tela de login (`login.html`)
- Usuario acessa link de recuperacao recebido por email (abre `nova-senha.html#access_token=...`)

---

## Atores

| Ator | Descricao |
|------|-----------|
| Usuario | Qualquer usuario autenticavel (marca, detentor, admin) |
| Edge Function | `send-password-reset` — envia email de recuperacao |
| Supabase Auth | Valida token de recuperacao e atualiza senha |

---

## Pre-condicoes

- Email do usuario cadastrado no Supabase Auth
- Edge Function `send-password-reset` deployada e funcional
- SMTP configurado no Supabase para envio de emails

---

## Campos / Dados

### Formulario esqueci-senha.html

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Email | email | Sim | Formato basico (type=email) |

### Formulario nova-senha.html

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Nova senha | password | Sim | Minimo 6 caracteres |
| Confirmar senha | password | Sim | Deve ser igual a nova senha |

### URL Hash Params (nova-senha.html)

| Parametro | Descricao |
|-----------|-----------|
| `access_token` | JWT temporario para autorizacao da troca |
| `type` | Deve ser `recovery` |
| `refresh_token` | Token de refresh (presente mas nao usado diretamente) |

---

## Comportamento Esperado

### 1. Solicitar Recuperacao (esqueci-senha.html)

```
1. Usuario preenche email e clica "Enviar"
2. Frontend faz POST para Edge Function:
   POST {SUPABASE_URL}/functions/v1/send-password-reset
   Headers: { Authorization: 'Bearer ' + SUPABASE_KEY }
   Body: { email }
3. SEMPRE exibe mensagem de sucesso, independente de o email existir ou nao
   - Mensagem: "Se este email estiver cadastrado, voce recebera um link de recuperacao"
   - Seguranca: nao revela se email existe na base
4. Se erro 4xx da Edge Function: mesma mensagem de sucesso (security by design)
5. Se erro de rede real: exibe mensagem generica de erro
```

### 2. Link de Recuperacao (email)

```
O email enviado contem link no formato:
  {APP_URL}/nova-senha.html#access_token={JWT}&type=recovery&refresh_token={RT}

- O token e incluido no HASH (fragment), nao na query string
- Isso impede que o token seja enviado ao servidor em logs
- Expiracao: 1 hora (conforme texto da UI)
```

### 3. Redefinir Senha (nova-senha.html)

```
1. Pagina carrega e faz parse do window.location.hash
2. Extrai access_token e type
3. Valida que type === 'recovery' e access_token existe
   - Se invalido: exibe mensagem de link invalido/expirado
4. Usuario preenche nova senha + confirmacao
5. Validacoes frontend:
   a. Nova senha >= 6 caracteres
   b. Confirmacao === nova senha
6. Se validacoes OK:
   PUT {SUPABASE_URL}/auth/v1/user
   Headers: {
     apikey: SUPABASE_KEY,
     Authorization: 'Bearer ' + accessToken,
     Content-Type: 'application/json'
   }
   Body: { password: novaSenha }
7. Se sucesso:
   a. Exibe mensagem de confirmacao
   b. Redirect para login.html apos 2500ms
8. Se erro: trata conforme tipo
```

---

## Queries Supabase

### Solicitar Reset (Edge Function)

```
POST {SUPABASE_URL}/functions/v1/send-password-reset
Headers: {
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Content-Type: 'application/json'
}
Body: { "email": "user@example.com" }
```

### Atualizar Senha

```
PUT {SUPABASE_URL}/auth/v1/user
Headers: {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + access_token_do_hash,
  Content-Type: 'application/json'
}
Body: { "password": "novaSenha123" }
```

---

## Regras de Negocio

1. **Sem rate limiting na solicitacao**: A pagina `esqueci-senha.html` NAO implementa rate limiter. Qualquer pessoa pode solicitar multiplos envios (protecao dependeria de rate limiting no servidor/Edge Function).

2. **Resposta identica para email existente ou inexistente**: Por seguranca, a mensagem exibida e a mesma independente de o email existir na base. Isso impede enumeracao de emails.

3. **Erros 4xx tratados como sucesso**: Se a Edge Function retorna erro 4xx (email nao encontrado), o frontend mostra a mesma mensagem de "verifique seu email", nao um erro.

4. **Token no hash (fragment)**: O access_token e passado via `#` na URL, nao `?`. Isso impede que o token apareca em server logs, referrer headers ou historico de navegacao do servidor.

5. **Expiracao de 1 hora**: O token de recuperacao expira em 1 hora (definido no Supabase Auth config, informado no texto da UI).

6. **Senha minima de 6 caracteres**: Unica regra de complexidade imposta no frontend.

7. **Redirect automatico apos sucesso**: Apos redefinicao bem-sucedida, redireciona para `login.html` apos 2500ms de delay (para usuario ler a mensagem).

8. **Edge Function para envio**: O envio do email de recuperacao e delegado a uma Edge Function (`send-password-reset`) em vez de usar `supabase.auth.resetPasswordForEmail()` do SDK.

---

## Estados Possiveis

### esqueci-senha.html

| Estado | Condicao |
|--------|----------|
| Formulario vazio | Pagina carregada |
| Enviando | POST em andamento para Edge Function |
| Mensagem enviada | Resposta recebida (sucesso ou 4xx) |
| Erro de rede | Falha de conexao real |

### nova-senha.html

| Estado | Condicao |
|--------|----------|
| Link valido | Hash contem access_token e type=recovery |
| Link invalido | Hash ausente, malformado ou type != recovery |
| Formulario vazio | Link valido, campos vazios |
| Validacao falhou | Senha curta ou confirmacao diferente |
| Salvando | PUT em andamento |
| Senha alterada | PUT retornou sucesso |
| Token expirado | PUT retornou 401 |
| Erro | PUT retornou outro erro |

---

## Erros e Excecoes

| Erro | Origem | Tratamento |
|------|--------|------------|
| Email nao existe | Edge Function 4xx | Mesma mensagem de sucesso (seguranca) |
| Erro de rede (solicitacao) | fetch error | Mensagem generica de erro |
| Link invalido/malformado | Parse do hash | "Link invalido ou expirado" |
| Token expirado | PUT 401 | "Link expirado. Solicite um novo." |
| Senha muito curta | Validacao frontend | "Minimo 6 caracteres" |
| Senhas nao coincidem | Validacao frontend | "As senhas nao coincidem" |
| Mesma senha anterior | Supabase Auth erro | "A nova senha deve ser diferente da atual" |
| Erro generico no PUT | Supabase Auth 4xx/5xx | Mensagem generica |

---

## Fora do Escopo

- Configuracao SMTP do Supabase (infra)
- Template do email de recuperacao (configurado no Supabase Dashboard)
- Logica interna da Edge Function `send-password-reset`
- Complexidade de senha alem de 6 caracteres (sem requisitos de maiuscula, numero, etc.)
- Rate limiting no envio (nao implementado no frontend; pode existir na Edge Function)
- Recuperacao via SMS ou outros canais
- Troca de senha com senha atual (sem tela de "alterar senha" no perfil)
