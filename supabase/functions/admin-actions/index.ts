import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function verifyAdmin(req: Request): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return { ok: false, error: 'Missing token' };
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_SERVICE_KEY },
  });
  if (!res.ok) return { ok: false, error: 'Invalid token' };
  const user = await res.json();
  // app_metadata só pode ser alterado com service role; user_metadata é editável pelo próprio usuário
  if (user?.app_metadata?.tipo !== 'admin') return { ok: false, error: 'Forbidden: not an admin' };
  return { ok: true, userId: user.id };
}

function gerarSenhaProvisoria(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [
    pick(upper), pick(upper), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(symbols),
    ...Array.from({ length: 9 }, () => pick(upper + lower + digits + symbols)),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const OPP_WRITABLE_FIELDS = new Set<string>([
  'titulo', 'categoria', 'categoria_slug', 'descricao_curta', 'descricao_completa',
  'localizacao', 'alcance', 'alcance_detalhe', 'preco_minimo', 'budget_tier',
  'formato', 'rating', 'status', 'icone', 'bg_gradient', 'tags',
  'publico_descricao', 'ativo', 'video_url', 'link_externo', 'midia_kit_url',
  'imagens', 'imagem_capa', 'redes_sociais', 'detalhes', 'datas_evento',
  'recorrencia', 'visibilidade', 'cotas_habilitadas', 'cotas_data', 'slug',
  'imagens_focal', 'taxa_plataforma_percent', 'projeto_incentivado',
  'incentivo_data', 'publico_canais', 'publico_presencial',
]);

function pickWritable(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(input)) {
    if (OPP_WRITABLE_FIELDS.has(k)) out[k] = input[k];
  }
  return out;
}

async function logAdminAction(
  adminId: string, targetUserId: string | null, action: string,
  oppId: number | string | null, payload: Record<string, unknown> | null,
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/admin_actions_log`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ admin_id: adminId, target_user_id: targetUserId, action, opp_id: oppId, payload }),
    });
  } catch (e) { console.error('[admin-actions] failed to log action', action, e); }
}

async function insertNotification(userId: string, type: string, title: string, description: string, data?: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: userId, type, title, description, data: data ?? null }),
    });
  } catch (e) { console.error('[admin-actions] failed to insert notification', type, e); }
}

async function handleUpdateStatus(body: { table: string; id: string; status: string }) {
  const { table, id, status } = body;
  if (!['marcas_waitlist', 'detentores_waitlist'].includes(table)) return json({ error: 'Table not allowed' }, 403);
  if (!['pendente', 'aprovado', 'rejeitado'].includes(status)) return json({ error: 'Status not allowed' }, 400);
  if (!id) return json({ error: 'Missing id' }, 400);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return json({ error: 'Failed to update status', details: await res.text() }, 500);
  return json({ success: true, status });
}

async function handleCreateUserAndSendAccess(body: { table: string; id: string }) {
  const { table, id } = body;
  if (!['marcas_waitlist', 'detentores_waitlist'].includes(table)) return json({ error: 'Table not allowed' }, 403);
  if (!id) return json({ error: 'Missing id' }, 400);
  const tipo = table === 'marcas_waitlist' ? 'marca' : 'detentor';
  const selectFields = table === 'marcas_waitlist'
    ? 'id,email,primeiro_nome,sobrenome,empresa,segmento,website,cargo,telefone'
    : 'id,email,nome,empresa,segmento,website,cargo,telefone';
  const loginUrl = tipo === 'marca' ? 'https://radar-relevantia.com.br/acesso-marca.html' : 'https://radar-relevantia.com.br/acesso-detentor.html';
  const dataRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=${selectFields}`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const rows = await dataRes.json();
  if (!Array.isArray(rows) || !rows.length) return json({ error: 'Record not found' }, 404);
  const { email, primeiro_nome, nome, sobrenome, id: waitlist_id, empresa, segmento, website, cargo, telefone } = rows[0];
  const nomeFinal = primeiro_nome || nome || '';
  const sobrenomeFinal = sobrenome || '';
  const senhaProvisoria = gerarSenhaProvisoria();
  const userMetadata = { tipo, role: tipo, nome: nomeFinal, sobrenome: sobrenomeFinal, empresa: empresa ?? null, segmento: segmento ?? null, website: website ?? null, cargo: cargo ?? null, telefone: telefone ?? null, waitlist_id: waitlist_id ?? null, senha_provisoria: true };
  const criarRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senhaProvisoria, email_confirm: true, user_metadata: userMetadata }),
  });
  if (criarRes.status === 422) {
    const listaRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
    const listaData = await listaRes.json();
    const existing = listaData?.users?.[0];
    const userId = existing?.id;
    const existingIsAdmin = existing?.app_metadata?.tipo === 'admin' || existing?.user_metadata?.tipo === 'admin';
    if (existingIsAdmin) {
      // Conta admin existente: CONCEDE o papel de cliente (marca/detentor) sem resetar a senha
      // nem tocar no app_metadata. O admin continua admin — app_metadata.tipo='admin' é a fonte da
      // verdade (is_admin(), get_admin_users, verifyAdmin) — e passa a ter acesso de cliente com a
      // MESMA senha. Não enviamos senha provisória porque ele já tem login. (conta híbrida)
      if (!userId) return json({ error: 'Conta admin encontrada mas sem id.' }, 500);
      const mergedMeta = { ...(existing.user_metadata ?? {}), ...userMetadata, senha_provisoria: false, temp_password: false };
      const putRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_metadata: mergedMeta }),
      });
      if (!putRes.ok) return json({ error: 'Falha ao conceder papel de cliente à conta admin', details: await putRes.text() }, 500);
      // Alinha perfis.role ao papel de cliente
      await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ role: tipo, nome: nomeFinal, sobrenome: sobrenomeFinal || null, empresa: empresa ?? null, segmento: segmento ?? null, website: website ?? null, cargo: cargo ?? null, telefone: telefone ?? null, waitlist_id: waitlist_id ?? null }),
      });
      await insertNotification(userId, 'acesso_liberado', `Acesso de ${tipo} liberado`, `Sua conta de administrador agora também tem acesso de ${tipo}. Use a MESMA senha para entrar em ${loginUrl}.`, { section: 'oportunidades' });
      return json({ success: true, email, merged_into_admin: true, message: `Papel de ${tipo} concedido à conta admin existente — mantém a senha atual.` });
    }
    // Não-admin já existente: reenvia acesso com nova senha provisória (comportamento original)
    if (userId) await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: senhaProvisoria, user_metadata: userMetadata }) });
  }
  if (sobrenomeFinal) {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
      const userData = await userRes.json();
      const newUserId = userData?.users?.[0]?.id;
      if (newUserId) {
        await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${newUserId}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ sobrenome: sobrenomeFinal }),
        });
      }
    } catch (e) { console.warn('[admin-actions] failed to set sobrenome in perfis', e); }
  }
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-magic-link`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nome: nomeFinal, senha_provisoria: senhaProvisoria, login_url: loginUrl, tipo }),
  });
  if (!sendRes.ok) return json({ error: 'User created but failed to send email', details: await sendRes.json() }, 500);
  return json({ success: true, email });
}

async function handleCreateOportunidadeAs(target_user_id: string, opp_data: Record<string, unknown>, admin_user_id: string) {
  if (!target_user_id) return json({ error: 'Missing target_user_id' }, 400);
  if (!opp_data || typeof opp_data !== 'object') return json({ error: 'Missing opp_data' }, 400);
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${target_user_id}`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!userRes.ok) return json({ error: 'Target user not found' }, 404);
  const targetUser = await userRes.json();
  if (targetUser?.user_metadata?.tipo !== 'detentor') return json({ error: 'Target user must be a detentor' }, 400);
  const safeData = pickWritable(opp_data);
  (safeData as Record<string, unknown>).detentor_id = target_user_id;
  (safeData as Record<string, unknown>).criado_por_admin = admin_user_id;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades`, { method: 'POST', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(safeData) });
  if (!res.ok) return json({ error: 'Failed to create oportunidade', details: await res.text() }, 500);
  const rows = await res.json();
  const created = rows[0];
  await logAdminAction(admin_user_id, target_user_id, 'create-oportunidade-as', created?.id ?? null, { fields: Object.keys(safeData), titulo: safeData.titulo ?? null, status: safeData.status ?? null });
  return json({ success: true, oportunidade: created });
}

async function handleUpdateOportunidadeAs(opp_id: string | number, opp_data: Record<string, unknown>, admin_user_id: string, target_user_id_hint?: string) {
  if (!opp_id) return json({ error: 'Missing opp_id' }, 400);
  if (!opp_data || typeof opp_data !== 'object') return json({ error: 'Missing opp_data' }, 400);
  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?id=eq.${opp_id}&select=id,detentor_id`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!fetchRes.ok) return json({ error: 'Failed to fetch opp', details: await fetchRes.text() }, 500);
  const existing = await fetchRes.json();
  if (!Array.isArray(existing) || !existing.length) return json({ error: 'Opp not found' }, 404);
  const ownerId = existing[0].detentor_id as string;
  if (target_user_id_hint && ownerId !== target_user_id_hint) return json({ error: 'Opp não pertence ao target_user_id' }, 403);
  const patchData = pickWritable(opp_data);
  if (Object.keys(patchData).length === 0) return json({ error: 'No writable fields in opp_data' }, 400);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?id=eq.${opp_id}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(patchData) });
  if (!res.ok) return json({ error: 'Failed to update oportunidade', details: await res.text() }, 500);
  await logAdminAction(admin_user_id, ownerId, 'update-oportunidade-as', Number(opp_id), { fields: Object.keys(patchData), status: patchData.status ?? null, visibilidade: patchData.visibilidade ?? null });
  return json({ success: true });
}

async function handleListOportunidadesAs(target_user_id: string, admin_user_id: string) {
  if (!target_user_id) return json({ error: 'Missing target_user_id' }, 400);
  const fields = ['id','slug','titulo','categoria','categoria_slug','descricao_curta','descricao_completa','localizacao','alcance','alcance_detalhe','preco_minimo','budget_tier','formato','status','ativo','bg_gradient','imagem_capa','imagens','imagens_focal','visibilidade','link_externo','video_url','detalhes','tags','redes_sociais','cotas_data','cotas_habilitadas','criado_em','detentor_id','midia_kit_url','publico_canais','publico_presencial','projeto_incentivado','incentivo_data','publico_descricao','taxa_plataforma_percent','datas_evento'].join(',');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?detentor_id=eq.${target_user_id}&select=${fields}&order=criado_em.desc`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) return json({ error: 'Failed to list oportunidades', details: await res.text() }, 500);
  const opps: Array<Record<string, unknown>> = await res.json();
  const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${target_user_id}&select=slug`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  let perfilSlug: string | null = null;
  if (perfilRes.ok) { const arr = await perfilRes.json(); if (Array.isArray(arr) && arr.length) perfilSlug = arr[0].slug ?? null; }
  const rows = opps.map(o => ({ ...o, perfis: perfilSlug ? { slug: perfilSlug } : null }));
  await logAdminAction(admin_user_id, target_user_id, 'list-oportunidades-as', null, { count: rows.length });
  return json({ success: true, oportunidades: rows });
}

async function handleDeleteOportunidadeAs(opp_id: string | number, target_user_id: string | undefined, admin_user_id: string) {
  if (!opp_id) return json({ error: 'Missing opp_id' }, 400);
  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?id=eq.${opp_id}&select=id,detentor_id`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!fetchRes.ok) return json({ error: 'Failed to fetch opp', details: await fetchRes.text() }, 500);
  const existing = await fetchRes.json();
  if (!Array.isArray(existing) || !existing.length) return json({ error: 'Opp not found' }, 404);
  const ownerId = existing[0].detentor_id as string;
  if (target_user_id && ownerId !== target_user_id) return json({ error: 'Opp não pertence ao target_user_id' }, 403);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?id=eq.${opp_id}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' } });
  if (!res.ok) return json({ error: 'Failed to delete oportunidade', details: await res.text() }, 500);
  await logAdminAction(admin_user_id, ownerId, 'delete-oportunidade-as', Number(opp_id), null);
  return json({ success: true });
}

async function handleListOportunidades() {
  const oppRes = await fetch(
    `${SUPABASE_URL}/rest/v1/oportunidades?select=id,titulo,categoria,status,criado_em,detentor_id&order=criado_em.desc&limit=500`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!oppRes.ok) return json({ error: 'Failed to list oportunidades', details: await oppRes.text() }, 500);
  const opps: Array<Record<string, unknown>> = await oppRes.json();
  const ids = [...new Set(opps.map(o => o.detentor_id as string).filter(Boolean))];
  const perfisMap: Record<string, { nome?: string; empresa?: string; pode_publicar?: boolean; cadastro_juridico_completo?: boolean }> = {};
  if (ids.length > 0) {
    const inClause = ids.map(id => `"${id}"`).join(',');
    const perfisRes = await fetch(
      `${SUPABASE_URL}/rest/v1/perfis?id=in.(${inClause})&select=id,nome,empresa,pode_publicar,cadastro_juridico_completo`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (perfisRes.ok) {
      const perfisRows: Array<{ id: string; nome?: string; empresa?: string; pode_publicar?: boolean; cadastro_juridico_completo?: boolean }> = await perfisRes.json();
      for (const p of perfisRows) perfisMap[p.id] = { nome: p.nome, empresa: p.empresa, pode_publicar: p.pode_publicar, cadastro_juridico_completo: p.cadastro_juridico_completo };
    }
  }
  const rows = opps.map(o => ({ ...o, perfil_detentor: perfisMap[o.detentor_id as string] ?? null }));
  return json({ success: true, oportunidades: rows });
}

async function handleDeleteOportunidade(body: { opp_id: string }) {
  const { opp_id } = body;
  if (!opp_id) return json({ error: 'Missing opp_id' }, 400);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oportunidades?id=eq.${opp_id}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Prefer': 'return=minimal' } });
  if (!res.ok) return json({ error: 'Failed to delete oportunidade', details: await res.text() }, 500);
  return json({ success: true });
}

async function handleListDetentores() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_detentores_aprovados`, { method: 'POST', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  if (!res.ok) return json({ error: 'Failed to list detentores', details: await res.text() }, 500);
  const rows: Array<{ id: string; nome: string; empresa: string; email: string }> = await res.json();
  return json({ success: true, detentores: rows ?? [] });
}

async function handleApproveMarcaChange(body: { perfil_id: string }) {
  const { perfil_id } = body;
  if (!perfil_id) return json({ error: 'Missing perfil_id' }, 400);
  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${perfil_id}&select=empresa_change_pending`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!fetchRes.ok) return json({ error: 'Failed to fetch perfil', details: await fetchRes.text() }, 500);
  const rows = await fetchRes.json();
  if (!Array.isArray(rows) || !rows.length) return json({ error: 'Perfil not found' }, 404);
  let pending: Record<string, unknown> = {};
  try { const raw = rows[0].empresa_change_pending; pending = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {}); } catch { /* keep empty */ }
  const patch: Record<string, unknown> = { empresa: pending['name'] ?? null, empresa_domain: pending['domain'] ?? null, logo_url: pending['icon'] ?? null, website: pending['website'] ?? null, descricao: pending['description'] ?? null, empresa_change_pending: null };
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${perfil_id}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) });
  if (!patchRes.ok) return json({ error: 'Failed to apply marca change', details: await patchRes.text() }, 500);
  const novaEmpresa = (pending['name'] as string) || '';
  await insertNotification(perfil_id, 'empresa_aprovada', 'Empresa atualizada!', novaEmpresa ? `Sua solicitação foi aprovada. Sua empresa agora é "${novaEmpresa}".` : 'Sua solicitação de mudança de empresa foi aprovada.', { section: 'configuracoes' });
  return json({ success: true });
}

async function handleRejectMarcaChange(body: { perfil_id: string }) {
  const { perfil_id } = body;
  if (!perfil_id) return json({ error: 'Missing perfil_id' }, 400);
  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${perfil_id}&select=empresa_change_pending`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!fetchRes.ok) return json({ error: 'Failed to fetch perfil', details: await fetchRes.text() }, 500);
  const rows = await fetchRes.json();
  if (!Array.isArray(rows) || !rows.length) return json({ error: 'Perfil not found' }, 404);
  let pending: Record<string, unknown> = {};
  try { const raw = rows[0].empresa_change_pending; pending = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {}); } catch { /* keep empty */ }
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${perfil_id}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ empresa_change_pending: null }) });
  if (!patchRes.ok) return json({ error: 'Failed to reject marca change', details: await patchRes.text() }, 500);
  const novaEmpresa = (pending['name'] as string) || '';
  await insertNotification(perfil_id, 'empresa_rejeitada', 'Solicitação não aprovada', novaEmpresa ? `Sua solicitação para mudar para "${novaEmpresa}" não foi aprovada. Entre em contato para mais detalhes.` : 'Sua solicitação de mudança de empresa não foi aprovada.', { section: 'configuracoes' });
  return json({ success: true });
}

async function handleListAdmins() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_users`, { method: 'POST', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  if (!res.ok) return json({ error: 'Erro ao listar admins', details: await res.text() }, 500);
  const admins = await res.json();
  return json({ admins: admins ?? [] });
}

async function handleCreateAdmin(body: { email: string; nome?: string; tempPassword: string }) {
  const { email, nome, tempPassword } = body;
  if (!email || !tempPassword) return json({ error: 'email e senha são obrigatórios' }, 400);
  if (tempPassword.length < 8) return json({ error: 'A senha precisa ter no mínimo 8 caracteres' }, 400);
  // tipo=admin vai em app_metadata (só alterável com service role) — é o que is_admin() e verifyAdmin checam
  const emailNorm = email.trim().toLowerCase();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailNorm, password: tempPassword, email_confirm: true, app_metadata: { tipo: 'admin' }, user_metadata: { tipo: 'admin', nome: nome || email.split('@')[0], temp_password: true } }) });
  if (res.status === 422) {
    // Email já existe (ex.: uma marca/detentor) → PROMOVE a admin preservando o papel de cliente e a senha.
    // Só adiciona app_metadata.tipo='admin'; user_metadata (papel de cliente) e senha ficam intactos.
    // Conta híbrida: continua marca/detentor nos portais de cliente E vira admin no painel. (exige re-login)
    const listaRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(emailNorm)}`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
    const existing = (await listaRes.json())?.users?.[0];
    if (!existing?.id) return json({ error: 'Email já registrado, mas não foi possível localizar a conta.' }, 500);
    if (existing.app_metadata?.tipo === 'admin') return json({ error: 'Este email já é um administrador.' }, 409);
    const upRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, { method: 'PUT', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ app_metadata: { ...(existing.app_metadata ?? {}), tipo: 'admin' } }) });
    if (!upRes.ok) return json({ error: 'Falha ao promover usuário a admin', details: await upRes.text() }, 500);
    return json({ ok: true, id: existing.id, email: existing.email, promoted: true, message: 'Usuário existente promovido a admin (mantém o papel de cliente e a senha atual). Precisa re-logar para o acesso admin valer.' });
  }
  const data = await res.json();
  if (!res.ok) return json({ error: data.message || data.msg || 'Erro ao criar usuário' }, 500);
  return json({ ok: true, id: data.id, email: data.email });
}

async function handleRemoveAdmin(body: { userId: string }, callerId: string) {
  const { userId } = body;
  if (!userId) return json({ error: 'userId é obrigatório' }, 400);
  if (userId === callerId) return json({ error: 'Você não pode remover sua própria conta' }, 400);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) return json({ error: 'Erro ao remover usuário', details: await res.text() }, 500);
  return json({ ok: true });
}

async function handleSetPodePublicar(body: { perfil_id: string; value: boolean }, adminId: string) {
  const { perfil_id, value } = body;
  if (!perfil_id) return json({ error: 'Missing perfil_id' }, 400);
  if (typeof value !== 'boolean') return json({ error: 'value must be boolean' }, 400);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${perfil_id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ pode_publicar: value }),
  });
  if (!res.ok) return json({ error: 'Failed to update pode_publicar', details: await res.text() }, 500);
  await logAdminAction(adminId, perfil_id, value ? 'liberar-publicacao' : 'bloquear-publicacao', null, { pode_publicar: value });
  return json({ success: true, pode_publicar: value });
}

async function handleSetCnpjStatus(body: { cnpj_id: string; status: string }, adminId: string) {
  const { cnpj_id, status } = body;
  if (!cnpj_id) return json({ error: 'Missing cnpj_id' }, 400);
  if (!['aprovado', 'rejeitado'].includes(status)) return json({ error: 'status must be aprovado or rejeitado' }, 400);
  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/detentor_cnpjs?id=eq.${cnpj_id}&select=id,perfil_id,apelido`, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!fetchRes.ok) return json({ error: 'Failed to fetch cnpj', details: await fetchRes.text() }, 500);
  const rows = await fetchRes.json();
  if (!Array.isArray(rows) || !rows.length) return json({ error: 'CNPJ not found' }, 404);
  const { perfil_id, apelido } = rows[0];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/detentor_cnpjs?id=eq.${cnpj_id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status, validado_em: new Date().toISOString(), validado_por: adminId }),
  });
  if (!res.ok) return json({ error: 'Failed to update cnpj status', details: await res.text() }, 500);
  await logAdminAction(adminId, perfil_id, status === 'aprovado' ? 'aprovar-cnpj' : 'rejeitar-cnpj', null, { cnpj_id, apelido: apelido ?? null });
  await insertNotification(
    perfil_id,
    status === 'aprovado' ? 'cnpj_aprovado' : 'cnpj_rejeitado',
    status === 'aprovado' ? 'CNPJ aprovado!' : 'CNPJ não aprovado',
    status === 'aprovado'
      ? `O CNPJ "${apelido || ''}" foi aprovado e já pode ser usado em suas oportunidades.`
      : `O CNPJ "${apelido || ''}" não foi aprovado. Revise os dados em Configurações > Jurídico.`,
    { section: 'configuracoes' },
  );
  return json({ success: true, status });
}

async function handleGetPerfilPodePublicar(body: { perfil_id?: string; email?: string }) {
  const { perfil_id, email } = body;
  if (!perfil_id && !email) return json({ error: 'Missing perfil_id or email' }, 400);
  let url = `${SUPABASE_URL}/rest/v1/perfis?select=id,email,pode_publicar,cadastro_juridico_completo&limit=1`;
  if (perfil_id) url += `&id=eq.${perfil_id}`;
  else url += `&email=eq.${encodeURIComponent(email!)}`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) return json({ error: 'Failed to fetch perfil', details: await res.text() }, 500);
  const rows = await res.json();
  return json({ success: true, perfil: rows[0] ?? null });
}

async function handleListApprovalHistory(body: { limit?: number }) {
  const limit = Math.min(body.limit ?? 50, 200);

  // Busca log de aprovações/bloqueios ordenado do mais recente
  const logRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_actions_log` +
    `?action=in.(liberar-publicacao,bloquear-publicacao,aprovar-cnpj,rejeitar-cnpj)` +
    `&order=created_at.desc&limit=${limit}` +
    `&select=id,admin_id,target_user_id,action,created_at`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!logRes.ok) return json({ error: 'Failed to fetch log', details: await logRes.text() }, 500);
  const logs: Array<{ id: number; admin_id: string; target_user_id: string; action: string; created_at: string }> = await logRes.json();
  if (!logs.length) return json({ success: true, history: [] });

  // Coleta IDs únicos de admins e targets para buscar nomes
  const adminIds  = [...new Set(logs.map(l => l.admin_id).filter(Boolean))];
  const targetIds = [...new Set(logs.map(l => l.target_user_id).filter(Boolean))];

  // Busca nomes dos targets (perfis)
  const targetMap: Record<string, { nome: string; email: string; empresa: string }> = {};
  if (targetIds.length) {
    const pr = await fetch(
      `${SUPABASE_URL}/rest/v1/perfis?id=in.(${targetIds.map(id => `"${id}"`).join(',')})&select=id,nome,email,empresa`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (pr.ok) {
      const rows: Array<{ id: string; nome: string; email: string; empresa: string }> = await pr.json();
      for (const r of rows) targetMap[r.id] = { nome: r.nome, email: r.email, empresa: r.empresa };
    }
  }

  // Busca nomes dos admins via auth.users (service role)
  const adminMap: Record<string, string> = {};
  if (adminIds.length) {
    for (const aid of adminIds) {
      try {
        const ar = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${aid}`, {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
        });
        if (ar.ok) {
          const u = await ar.json();
          adminMap[aid] = u?.user_metadata?.nome || u?.email || aid;
        }
      } catch { /* skip */ }
    }
  }

  const history = logs.map(l => ({
    id: l.id,
    action: l.action,
    created_at: l.created_at,
    admin_nome: adminMap[l.admin_id] ?? '—',
    target_nome: targetMap[l.target_user_id]?.nome ?? '—',
    target_email: targetMap[l.target_user_id]?.email ?? '—',
    target_empresa: targetMap[l.target_user_id]?.empresa ?? '—',
  }));

  return json({ success: true, history });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = await verifyAdmin(req);
  if (!auth.ok) return json({ error: auth.error }, 403);
  const adminId = auth.userId ?? '';
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  switch (body.action) {
    case 'update-status':               return handleUpdateStatus(body as { table: string; id: string; status: string });
    case 'create-user-and-send-access': return handleCreateUserAndSendAccess(body as { table: string; id: string });
    case 'create-oportunidade-as':      return handleCreateOportunidadeAs((body['target_user_id'] as string) ?? '', (body['opp_data'] as Record<string, unknown>) ?? {}, adminId);
    case 'update-oportunidade-as':      return handleUpdateOportunidadeAs((body['opp_id'] as string | number) ?? '', (body['opp_data'] as Record<string, unknown>) ?? {}, adminId, body['target_user_id'] as string | undefined);
    case 'list-oportunidades-as':       return handleListOportunidadesAs((body['target_user_id'] as string) ?? '', adminId);
    case 'delete-oportunidade-as':      return handleDeleteOportunidadeAs((body['opp_id'] as string | number) ?? '', body['target_user_id'] as string | undefined, adminId);
    case 'list-oportunidades':          return handleListOportunidades();
    case 'delete-oportunidade':         return handleDeleteOportunidade(body as { opp_id: string });
    case 'list-detentores':             return handleListDetentores();
    case 'approve-marca-change':        return handleApproveMarcaChange(body as { perfil_id: string });
    case 'reject-marca-change':         return handleRejectMarcaChange(body as { perfil_id: string });
    case 'list-admins':                 return handleListAdmins();
    case 'create-admin':                return handleCreateAdmin(body as { email: string; nome?: string; tempPassword: string });
    case 'remove-admin':                return handleRemoveAdmin(body as { userId: string }, adminId);
    case 'set-pode-publicar':           return handleSetPodePublicar(body as { perfil_id: string; value: boolean }, adminId);
    case 'set-cnpj-status':             return handleSetCnpjStatus(body as { cnpj_id: string; status: string }, adminId);
    case 'get-perfil-pode-publicar':    return handleGetPerfilPodePublicar(body as { perfil_id?: string; email?: string });
    case 'list-approval-history':       return handleListApprovalHistory(body as { limit?: number });
    default:                            return json({ error: `Unknown action: ${body.action}` }, 400);
  }
});
