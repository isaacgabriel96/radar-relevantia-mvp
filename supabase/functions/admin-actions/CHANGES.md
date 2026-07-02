# admin-actions — histórico de mudanças

O `index.ts` nesta pasta é a fonte canônica; deploy via MCP/CLI.

## v27 (2026-07-01) — DEPLOYED — contas híbridas (admin + marca/detentor no mesmo email)

Modelo: `app_metadata.tipo='admin'` = flag de admin (fonte da verdade em `is_admin()`,
`get_admin_users`, `verifyAdmin`); `user_metadata.tipo` = papel de cliente (marca/detentor).
São campos independentes → um mesmo auth user pode ser admin E cliente sem colisão.

1. `handleCreateAdmin()`: se o email já existe (422), em vez de falhar, **promove** a conta
   existente a admin — só faz `PUT app_metadata.tipo='admin'`, preservando `user_metadata`
   (papel de cliente) e a senha. Retorna `{ ok, promoted:true }`. Se já for admin, retorna 409.
   (mudança de app_metadata exige re-login para valer).
2. `handleCreateUserAndSendAccess()`: se o email da waitlist já é de um admin, em vez de
   bloquear (409 antigo), **concede o papel de cliente** à conta admin: `PUT user_metadata`
   com o papel (mantendo app_metadata=admin), alinha `perfis.role`, NÃO reseta a senha e NÃO
   envia senha provisória (o admin usa a mesma senha). Retorna `{ success, merged_into_admin:true }`.
   Conta não-admin já existente continua com o comportamento original (reenvio de acesso).

Limitação conhecida: `remove-admin` apaga o auth user inteiro — não há "rebaixar só o admin
mantendo o cliente". Excluir/revogar via RPC é bloqueado para admins por `assert_not_admin_target`.

## v26 (2026-07-01) — DEPLOYED — segurança

1. `verifyAdmin()`: valida `app_metadata.tipo === 'admin'` (não `user_metadata`, que é
   editável pelo próprio usuário → escalonamento de privilégio).
2. `handleCreateAdmin()`: novos admins recebem `app_metadata: { tipo: 'admin' }`.
3. `handleCreateUserAndSendAccess()`: no 422, recusava sobrescrever conta admin
   (substituído em v27 pela concessão de papel de cliente).
