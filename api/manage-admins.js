/**
 * Vercel Edge Function — Gerenciamento de usuários admin
 * Radar Relevantia · /api/manage-admins
 *
 * Actions (POST body: { action, ...params }):
 *   list   → lista todos os usuários com tipo === 'admin'
 *   invite → cria novo usuário admin com senha temporária
 *   remove → exclui usuário admin pelo id
 *
 * Segurança:
 *   - Verifica Bearer JWT do chamador via Supabase /auth/v1/user
 *   - Exige que o chamador tenha user_metadata.tipo === 'admin'
 *   - Operações de escrita usam SUPABASE_SERVICE_ROLE_KEY (server-side only)
 *
 * Variáveis de ambiente necessárias no painel da Vercel:
 *   SUPABASE_URL              = https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = eyJ...  (encontrado em Project Settings → API)
 */

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://bzckerazidgrkbpgqqee.supabase.co';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Verifica se o token pertence a um admin e retorna os dados do usuário */
async function verifyAdmin(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (user?.user_metadata?.tipo !== 'admin') return null;
  return user;
}

/** Lista todos os usuários admin */
async function listAdmins(serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erro ao listar usuários');
  }
  const data = await res.json();
  const users = data.users || [];
  return users
    .filter(u => u.user_metadata?.tipo === 'admin')
    .map(u => ({
      id: u.id,
      email: u.email,
      nome: u.user_metadata?.nome || u.email?.split('@')[0] || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
}

/** Cria novo usuário admin */
async function inviteAdmin(serviceKey, { email, nome, tempPassword }) {
  if (!email || !tempPassword) throw new Error('email e senha são obrigatórios');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: tempPassword,
      email_confirm: true,           // pula verificação por email
      user_metadata: {
        tipo: 'admin',
        nome: nome || email.split('@')[0],
        temp_password: true,         // flag para forçar troca de senha no 1º login
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.msg || 'Erro ao criar usuário');
  return { id: data.id, email: data.email };
}

/** Remove usuário admin (exclui da Auth) */
async function removeAdmin(serviceKey, userId) {
  if (!userId) throw new Error('userId é obrigatório');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erro ao remover usuário');
  }
  return { ok: true };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  // Autenticação
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return json({ error: 'Não autenticado.' }, 401);

  const caller = await verifyAdmin(token);
  if (!caller) return json({ error: 'Acesso restrito a administradores.' }, 403);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return json({ error: 'Configuração do servidor incompleta (service role key ausente).' }, 500);

  let body = {};
  try { body = await req.json(); } catch {}

  const { action } = body;

  try {
    if (action === 'list') {
      const admins = await listAdmins(serviceKey);
      return json({ admins });
    }

    if (action === 'invite') {
      const result = await inviteAdmin(serviceKey, {
        email: body.email?.trim().toLowerCase(),
        nome: body.nome?.trim(),
        tempPassword: body.tempPassword,
      });
      return json({ ok: true, ...result });
    }

    if (action === 'remove') {
      // Impede que o admin remova a si mesmo
      if (body.userId === caller.id) {
        return json({ error: 'Você não pode remover sua própria conta.' }, 400);
      }
      await removeAdmin(serviceKey, body.userId);
      return json({ ok: true });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error('[manage-admins] Erro:', err.message);
    return json({ error: err.message || 'Erro interno do servidor.' }, 500);
  }
}
