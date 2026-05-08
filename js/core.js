/**
 * core.js — Radar Relevantia shared utilities (v2 — supabase-js SDK)
 *
 * REQUIRES: supabase-js CDN loaded BEFORE this file:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="js/core.js"></script>
 *
 * Provides: sb (Supabase client), showToast, getSession, clearSession,
 *           requireAuth, getCurrentUser, isDemoMode, enterDemoMode,
 *           exitDemoMode, fetchCatalog, fetchNegociacoesDetentor,
 *           fetchNegociacoesMarca, updateNegociacao, sendMensagem,
 *           createContrapartida, updateContrapartida, createNegociacao
 */

const SUPABASE_URL = 'https://bzckerazidgrkbpgqqee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Y2tlcmF6aWRncmticGdxcWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjczODksImV4cCI6MjA4ODIwMzM4OX0.HIVnwcGvKiYNGfVFEnP0Ik9kfOeXPB4c4BFqDpqFCS4';

// ─── SUPABASE CLIENT ────────────────────────────────────────
// Initialized from CDN-loaded supabase-js. Auto-refreshes tokens.
var sb = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn('[core] supabase-js not loaded. SDK features unavailable. Add CDN before core.js.');
}

// ─── LEGACY SESSION KEYS ────────────────────────────────────
// DO NOT rename — would log out existing users.
const SESSION_KEYS = {
  rightsholder: 'sb_detentor_session',
  brand:        'sb_marca_session',
  admin:        'sb_admin_session'
};

// ─── TOAST ──────────────────────────────────────────────────
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

// ─── SESSION (legacy compatibility) ─────────────────────────
function getSession(role) {
  const key = SESSION_KEYS[role];
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && now >= session.expires_at) {
      // Don't remove — refreshSessionAsync will handle it
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Async version of getSession that auto-refreshes expired tokens.
 * Use this when you need the session and can await (e.g. before writes).
 */
async function getSessionAsync(role) {
  // First try the sync version (fast path for valid tokens)
  const valid = getSession(role);
  if (valid) return valid;

  // If no stored data at all, nothing to refresh
  const key = SESSION_KEYS[role];
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  // Try to refresh the expired session
  try {
    const expired = JSON.parse(raw);
    if (!expired.refresh_token) {
      localStorage.removeItem(key);
      return null;
    }
    console.log('[getSessionAsync] Token expired for', role, '— refreshing...');
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: expired.refresh_token }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (!res.ok) {
      console.warn('[getSessionAsync] Refresh failed:', res.status);
      localStorage.removeItem(key);
      return null;
    }
    const newSession = await res.json();
    localStorage.setItem(key, JSON.stringify(newSession));
    console.log('[getSessionAsync] Token refreshed for', role);
    return newSession;
  } catch (err) {
    console.error('[getSessionAsync] Refresh error:', err);
    localStorage.removeItem(key);
    return null;
  }
}

function clearSession(role) {
  const key = SESSION_KEYS[role];
  if (key) localStorage.removeItem(key);
}

function getCurrentRole() {
  const roleMap = { brand: 'marca', rightsholder: 'detentor', admin: 'admin' };
  for (const [role, tipo] of Object.entries(roleMap)) {
    const s = getSession(role);
    if (s && s.user?.user_metadata?.tipo === tipo) return role;
  }
  return null;
}

function getCurrentUser() {
  const role = getCurrentRole();
  return role ? getSession(role) : null;
}

function requireAuth(role, redirectTo = 'login.html') {
  const session = getSession(role);
  if (!session) {
    window.location.href = redirectTo;
    return;
  }
  // Validar que o tipo da sessao corresponde ao role esperado
  const expectedTipo = { brand: 'marca', rightsholder: 'detentor', admin: 'admin' }[role];
  if (session.user?.user_metadata?.tipo !== expectedTipo) {
    clearSession(role);
    window.location.href = redirectTo;
  }
}

// ─── DEMO MODE (DESATIVADO) ─────────────────────────────────
// Demo mode desativado permanentemente. Funções mantidas como stubs
// para não quebrar chamadas existentes nos HTMLs.
function isDemoMode() {
  // Limpa qualquer resíduo de demo anterior
  localStorage.removeItem('rr_demo_mode');
  return false;
}

function getDemoRole() { return null; }
function enterDemoMode() { /* desativado */ }
function exitDemoMode() { window.location.href = 'admin.html'; }

function showDemoBannerIfActive() {
  // Demo desativado permanentemente — stub mantido para compatibilidade
  return;
}

// ─── LEGACY FETCH (backward compat for pages not yet migrated) ──
function sbFetch(path, token, opts = {}) {
  if (isDemoMode()) {
    console.warn('[DEMO] Blocked API call:', opts.method || 'GET', path);
    const isWrite = opts.method && opts.method !== 'GET';
    const body = JSON.stringify(isWrite ? { demo: true } : []);
    return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  return fetch(SUPABASE_URL + path, { ...opts, headers });
}

function sbPublicFetch(path, opts = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  return fetch(SUPABASE_URL + path, { ...opts, headers });
}

// ─── SDK AUTH HELPER ────────────────────────────────────────

/**
 * Get a valid access token from the SDK (auto-refreshes if needed).
 * Returns null if no session exists.
 */
async function getValidToken() {
  if (!sb) return null;
  if (isDemoMode()) return null;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  } catch { return null; }
}

/**
 * Get current user ID from SDK session.
 */
async function getAuthUserId() {
  // 1. Tenta SDK (auto-refresh de token)
  if (sb) {
    try {
      const { data } = await sb.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch { /* SDK falhou, tenta fallback */ }
  }
  // 2. Fallback: legacy localStorage (sync — token ainda válido)
  const legacy = getSession('rightsholder') || getSession('brand');
  if (legacy?.user?.id) return legacy.user.id;
  // 3. Fallback: legacy localStorage (async — tenta refresh do token expirado)
  const legacyAsync = await getSessionAsync('rightsholder') || await getSessionAsync('brand');
  if (legacyAsync?.user?.id) return legacyAsync.user.id;
  return null;
}

/**
 * Restore SDK session from legacy localStorage session.
 * Called once on page load to bridge old login flow with new SDK.
 */
async function restoreSessionToSDK() {
  if (!sb) return;
  // Check if SDK already has a session
  const { data: existing } = await sb.auth.getSession();
  if (existing?.session) return; // SDK already has a valid session

  // Try to restore from legacy localStorage (with auto-refresh for expired tokens)
  const legacy = await getSessionAsync('rightsholder') || await getSessionAsync('brand');
  if (legacy && legacy.access_token && legacy.access_token !== 'DEMO_TOKEN') {
    try {
      await sb.auth.setSession({
        access_token: legacy.access_token,
        refresh_token: legacy.refresh_token || ''
      });
      console.log('[core] Legacy session restored to SDK successfully');
    } catch (e) {
      console.warn('[core] Could not restore legacy session to SDK:', e.message);
    }
  } else {
    console.warn('[core] No legacy session available to restore to SDK');
  }
}

// Auto-restore on load
if (sb && !isDemoMode()) {
  restoreSessionToSDK();
}

// ─── CATALOG API ────────────────────────────────────────────

function parsePreco(str) {
  if (!str && str !== 0) return 0;
  if (typeof str === 'number') return str;
  const s = String(str);
  const cleaned = s.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function extractRegion(loc) {
  if (!loc) return '';
  const stateToRegion = {
    'SP': 'São Paulo', 'RJ': 'Rio de Janeiro', 'MG': 'Minas Gerais',
    'BA': 'Bahia', 'PR': 'Paraná', 'SC': 'Santa Catarina', 'RS': 'Rio Grande do Sul',
    'PE': 'Pernambuco', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'GO': 'Goiás',
    'AM': 'Amazonas', 'PA': 'Pará', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
    'ES': 'Espírito Santo', 'MA': 'Maranhão', 'PB': 'Paraíba', 'RN': 'Rio Grande do Norte',
    'AL': 'Alagoas', 'PI': 'Piauí', 'SE': 'Sergipe', 'RO': 'Rondônia',
    'TO': 'Tocantins', 'AC': 'Acre', 'AP': 'Amapá', 'RR': 'Roraima'
  };
  const match = loc.match(/,\s*([A-Z]{2})\b/);
  if (match && stateToRegion[match[1]]) return stateToRegion[match[1]];
  if (loc.toLowerCase().includes('online')) return 'Online';
  return '';
}

function extractCity(loc) {
  if (!loc) return '';
  return loc.split(',')[0].trim();
}

function makeInitials(name) {
  if (!name) return '??';
  const words = name.trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function rowToCatalogItem(row) {
  const orgNome = (row.perfis && row.perfis.empresa) ? row.perfis.empresa : '';
  return {
    id: row.id, slug: row.slug || null, perfilSlug: (row.perfis && row.perfis.slug) || null,
    title: row.titulo || '', category: row.categoria || '',
    city: extractCity(row.localizacao), region: extractRegion(row.localizacao),
    org: orgNome, orgInitials: makeInitials(orgNome),
    detentorLogoUrl:       (row.perfis && row.perfis.logo_url)       || null,
    detentorEmpresaDomain: (row.perfis && row.perfis.empresa_domain) || null,
    desc: row.descricao_curta || '', price: parsePreco(row.preco_minimo),
    date: row.alcance || '', gradient: row.bg_gradient || 'linear-gradient(135deg, #1a1a2e, #16213e)',
    imagem_capa: row.imagem_capa || null,
    imagens_focal: row.imagens_focal || null,
    visibilidade: row.visibilidade || 'publica',
    projetoIncentivado: !!row.projeto_incentivado
  };
}

async function fetchCatalog() {
  try {
    const path = '/rest/v1/oportunidades?select=id,slug,titulo,categoria,localizacao,preco_minimo,descricao_curta,alcance,bg_gradient,imagem_capa,imagens_focal,visibilidade,projeto_incentivado,perfis:detentor_id(empresa,slug,logo_url,empresa_domain)&ativo=eq.true&order=id.asc';
    const res = await sbPublicFetch(path);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    // Filtra oportunidades "convidadas" — nunca aparecem no catálogo público
    const filtered = rows.filter(r => (r.visibilidade || 'publica') !== 'convidadas');
    return filtered.map(rowToCatalogItem);
  } catch (err) {
    console.error('[fetchCatalog] Failed:', err);
    return null;
  }
}

// ─── BRANDFETCH LOGO UTILITY ────────────────────────────────
// Shared by all pages. Percorre um container e busca logos via Brandfetch
// para cards que não têm logo_url direto.
// Prioridade: data-bf-domain (domínio exato) → data-bf-name (nome da empresa)
const _rrBfCache = {};
const _RR_BF_CLIENT = '1idE-ar9WXT49s6Qb2f';

function _rrApplyLogo(row, src) {
  const img  = row.querySelector('img');
  const span = row.querySelector('span');
  if (!img) return;
  img.src = src;
  img.style.display = 'block';
  if (span) span.style.display = 'none';
  img.onerror = () => { img.style.display = 'none'; if (span) span.style.display = ''; };
}

function _rrFetchBf(query, row) {
  if (_rrBfCache[query]) { _rrApplyLogo(row, _rrBfCache[query]); return; }
  fetch('https://api.brandfetch.io/v2/search/' + encodeURIComponent(query) + '?c=' + _RR_BF_CLIENT)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const icon = Array.isArray(data) && data.length > 0 ? data[0].icon : null;
      if (icon) { _rrBfCache[query] = icon; _rrApplyLogo(row, icon); }
    })
    .catch(() => {});
}

function applyBrandfetchLogos(container) {
  if (!container) return;
  container.querySelectorAll('[data-bf-domain]').forEach(row => {
    const d = row.dataset.bfDomain; if (d) _rrFetchBf(d, row);
  });
  container.querySelectorAll('[data-bf-name]').forEach(row => {
    const n = row.dataset.bfName; if (n) _rrFetchBf(n, row);
  });
}

// ─── NEGOTIATIONS API (SDK-powered) ─────────────────────────

function _fmtDate(iso, withTime) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (!withTime) return dd + '/' + mm + '/' + d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + ' · ' + hh + ':' + min;
}

function rowToNegociacao(row) {
  const marcaNome = (row.marca && row.marca.empresa) ? row.marca.empresa : '';
  const oppTitulo = (row.oportunidade && row.oportunidade.titulo) ? row.oportunidade.titulo : '';
  const oppCat    = (row.oportunidade && row.oportunidade.categoria) ? row.oportunidade.categoria : '';
  const cps = (row.contrapartidas || []).map(cp => ({
    id: cp.id, descricao: cp.descricao || '', categoria: cp.categoria || '',
    valor: cp.valor ? parseFloat(cp.valor) : null,
    prazo: cp.prazo || '',
    status: cp.status || 'proposta', propostoPor: cp.proposto_por || 'marca'
  }));
  const thread = (row.mensagens || []).map(m => ({
    autor: m.autor_role || 'marca', nome: m.autor_nome || '',
    texto: m.texto || '', data: _fmtDate(m.created_at, true)
  }));
  const statusLabels = { 'pendente':'Pendente', 'analise':'Em análise', 'aceita':'Aceita', 'recusada':'Recusada', 'cancelada':'Cancelada' };
  return {
    id: row.id, opp_id: row.oportunidade_id, opp: oppTitulo, categoria: oppCat,
    marca: marcaNome, marca_id: row.marca_id, detentor_id: row.detentor_id,
    cota: row.cota || '', assunto: row.assunto || '',
    valor: row.valor_proposto ? 'R$ ' + parseFloat(row.valor_proposto).toLocaleString('pt-BR') : '',
    enviadaEm: _fmtDate(row.created_at, false),
    status: row.status || 'pendente',
    statusLabel: row.status_label || statusLabels[row.status] || 'Pendente',
    statusHint: row.status_hint || '',
    aceitaNovasPropostas: row.aceita_novas_propostas !== false,
    thread, contrapartidas: cps,
    valor_deal: row.valor_deal ? parseFloat(row.valor_deal) : null,
    valorDeal: {
      proposto: row.valor_deal ? parseFloat(row.valor_deal) : null,
      propostoPor: row.valor_deal_proposto_por || null,
      status: row.valor_deal_status || (row.valor_deal ? 'aceito' : 'sem_proposta')
    },
    contrato_url: (Array.isArray(row.contratos) && row.contratos[0] && row.contratos[0].documento_url) || null,
    contrato_enviado_por: row.contrato_enviado_por || null,
    contrato_enviado_em: row.contrato_enviado_em || null,
    contrato_validado: row.contrato_validado || false,
    contrato_validado_em: row.contrato_validado_em || null,
    admin_comentario: row.admin_comentario || null,
    campanha_id: row.campanha_id || null,
    _supaId: row.id
  };
}

// Shared query string for negociacoes with all joins
var _negSelectQuery = 'id,oportunidade_id,marca_id,detentor_id,cota,assunto,valor_proposto,valor_deal,' +
  'valor_deal_proposto_por,valor_deal_status,' +
  'contrato_enviado_por,contrato_enviado_em,' +
  'contrato_validado,contrato_validado_em,contrato_validado_por,admin_comentario,' +
  'status,status_label,status_hint,aceita_novas_propostas,created_at,campanha_id,' +
  'marca:marca_id(nome,empresa),' +
  'oportunidade:oportunidade_id(titulo,categoria),' +
  'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por),' +
  'contratos(id,documento_url,status,completo_em),' +
  'mensagens(id,autor_role,autor_nome,texto,created_at)';

/**
 * Fetch negotiations using SDK (auto-refreshes token).
 * Falls back to legacy sbFetch if SDK unavailable.
 */
async function fetchNegociacoesDetentor() {
  if (isDemoMode()) return null;
  try {
    // Try SDK first (has auto token refresh)
    if (sb) {
      const token = await getValidToken();
      if (token) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?select=' + _negSelectQuery +
          '&order=created_at.desc&mensagens.order=created_at.asc', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = await res.json();
        return rows.map(rowToNegociacao);
      }
    }
    // Fallback to legacy token (with auto-refresh)
    const session = await getSessionAsync('rightsholder');
    if (session?.access_token && session.access_token !== 'DEMO_TOKEN') {
      const res = await sbFetch('/rest/v1/negociacoes?select=' + _negSelectQuery +
        '&order=created_at.desc&mensagens.order=created_at.asc', session.access_token);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      return rows.map(rowToNegociacao);
    }
    return null;
  } catch (err) {
    console.error('[fetchNegociacoesDetentor] Failed:', err);
    return null;
  }
}

// rowToNegociacao para o lado da marca — lê detentor em vez de marca
function rowToNegociacaoMarca(row) {
  // O nome exibido para a marca é o nome/empresa do detentor (organizador)
  const detentorNome = (row.detentor && row.detentor.empresa) ? row.detentor.empresa
    : (row.detentor && row.detentor.nome) ? row.detentor.nome : '';
  // Reutiliza rowToNegociacao e sobrescreve apenas o campo marca
  const neg = rowToNegociacao(row);
  neg.marca = detentorNome;   // na visão da marca, "marca" aponta pro detentor (organizador)
  return neg;
}

async function fetchNegociacoesMarca() {
  if (isDemoMode()) return null;
  try {
    if (sb) {
      const token = await getValidToken();
      if (token) {
        // Para marca, faz join no detentor (organizador) em vez da marca
        const marcaSelect = _negSelectQuery.replace('marca:marca_id(nome,empresa),', 'detentor:detentor_id(nome,empresa),');
        const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?select=' + marcaSelect +
          '&order=created_at.desc&mensagens.order=created_at.asc', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = await res.json();
        // Usa rowToNegociacaoMarca para ler o campo detentor corretamente
        return rows.map(rowToNegociacaoMarca);
      }
    }
    // Fallback: tenta sessão legada da marca
    const session = await getSessionAsync('brand');
    if (session?.access_token && session.access_token !== 'DEMO_TOKEN') {
      const marcaSelect = _negSelectQuery.replace('marca:marca_id(nome,empresa),', 'detentor:detentor_id(nome,empresa),');
      const res = await sbFetch('/rest/v1/negociacoes?select=' + marcaSelect +
        '&order=created_at.desc&mensagens.order=created_at.asc', session.access_token);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      return rows.map(rowToNegociacaoMarca);
    }
    return null;
  } catch (err) {
    console.error('[fetchNegociacoesMarca] Failed:', err);
    return null;
  }
}

// ─── WRITE OPERATIONS (SDK-powered) ─────────────────────────

async function _getWriteToken(preferRole) {
  // SDK token (auto-refreshed) > legacy token
  const sdkToken = await getValidToken();
  if (sdkToken) return sdkToken;
  let legacy;
  if (preferRole) {
    legacy = await getSessionAsync(preferRole);
  }
  if (!legacy) {
    legacy = await getSessionAsync('rightsholder') || await getSessionAsync('brand');
  }
  return (legacy && legacy.access_token !== 'DEMO_TOKEN') ? legacy.access_token : null;
}

async function updateNegociacao(negId, fields, preferRole) {
  try {
    const token = await _getWriteToken(preferRole);
    if (!token) { console.warn('[updateNegociacao] No valid token'); if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return false; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?id=eq.' + negId, {
      method: 'PATCH', body: JSON.stringify(fields),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }
    });
    if (!res.ok && typeof showToast === 'function') showToast('Erro ao atualizar negociação. Tente novamente.', 'error');
    return res.ok;
  } catch (err) { console.error('[updateNegociacao] Failed:', err); if (typeof showToast === 'function') showToast('Erro de conexão. Verifique sua internet.', 'error'); return false; }
}

async function sendMensagem(msg) {
  try {
    const token = await _getWriteToken();
    if (!token) { console.warn('[sendMensagem] No valid token'); if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/mensagens', {
      method: 'POST', body: JSON.stringify(msg),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) { if (typeof showToast === 'function') showToast('Erro ao enviar mensagem. Tente novamente.', 'error'); throw new Error('HTTP ' + res.status); }
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[sendMensagem] Failed:', err); if (typeof showToast === 'function' && !err.message?.startsWith('HTTP')) showToast('Erro de conexão ao enviar mensagem.', 'error'); return null; }
}

async function createContrapartida(cp) {
  try {
    const token = await _getWriteToken();
    if (!token) { if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/contrapartidas', {
      method: 'POST', body: JSON.stringify(cp),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) { if (typeof showToast === 'function') showToast('Erro ao criar contrapartida. Tente novamente.', 'error'); throw new Error('HTTP ' + res.status); }
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[createContrapartida] Failed:', err); return null; }
}

async function updateContrapartida(cpId, fields) {
  try {
    const token = await _getWriteToken();
    if (!token) { if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return false; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/contrapartidas?id=eq.' + cpId, {
      method: 'PATCH', body: JSON.stringify(fields),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }
    });
    if (!res.ok && typeof showToast === 'function') showToast('Erro ao atualizar contrapartida.', 'error');
    return res.ok;
  } catch (err) { console.error('[updateContrapartida] Failed:', err); if (typeof showToast === 'function') showToast('Erro de conexão.', 'error'); return false; }
}

/**
 * Fetch beneficios array for a specific cota from oportunidade.cotas_data JSON.
 * Returns string[] of benefit descriptions, or empty array if not found.
 */
async function fetchCotaBeneficios(oportunidadeId, cotaNome) {
  if (!oportunidadeId || !cotaNome) return [];
  try {
    const res = await sbPublicFetch('/rest/v1/oportunidades?select=cotas_data&id=eq.' + oportunidadeId);
    if (!res.ok) return [];
    const rows = await res.json();
    if (!rows || !rows[0] || !rows[0].cotas_data) return [];
    // Match flexível: cota na negociação pode ser "ouro — R$ 20.000", cotas_data tem "ouro"
    var cotaLower = cotaNome.toLowerCase().trim();
    const cota = rows[0].cotas_data.find(function(c) {
      var nome = (c.nome || '').toLowerCase().trim();
      return cotaLower === nome || cotaLower.indexOf(nome) === 0;
    });
    return (cota && cota.beneficios) ? cota.beneficios.filter(Boolean) : [];
  } catch (err) { console.error('[fetchCotaBeneficios] Failed:', err); return []; }
}

// ─── RODADAS DE NEGOCIAÇÃO (histórico imutável) ────────────

/**
 * Create a new negotiation round (immutable snapshot).
 * @param {Object} rodada - { negociacao_id, numero, valor, proposto_por, contrapartidas (JSONB) }
 * @returns {Object|null} created row or null
 */
async function createRodada(rodada) {
  try {
    const token = await _getWriteToken();
    if (!token) { if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/rodadas_negociacao', {
      method: 'POST', body: JSON.stringify(rodada),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) { if (typeof showToast === 'function') showToast('Erro ao registrar rodada.', 'error'); throw new Error('HTTP ' + res.status); }
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[createRodada] Failed:', err); return null; }
}

/**
 * Fetch all rounds for a negotiation, ordered by numero DESC (newest first).
 * @param {string} negociacaoId
 * @returns {Array} rounds or []
 */
async function fetchRodadas(negociacaoId) {
  if (!negociacaoId) return [];
  try {
    const token = await _getWriteToken();
    if (!token) return [];
    const res = await fetch(SUPABASE_URL + '/rest/v1/rodadas_negociacao?negociacao_id=eq.' + negociacaoId + '&order=numero.desc', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) { console.error('[fetchRodadas] Failed:', err); return []; }
}

/**
 * Build a JSONB-ready snapshot of current contrapartidas.
 * @param {Array} contrapartidas - in-memory contrapartidas array
 * @returns {Array} snapshot for JSONB storage
 */
function buildContrapartidasSnapshot(contrapartidas) {
  return (contrapartidas || []).map(function(c) {
    return { descricao: c.descricao || '', status: c.status || 'proposta', proposto_por: c.propostoPor || c.proposto_por || 'marca' };
  });
}

/**
 * Get next round number based on existing rounds.
 * @param {Array} rodadas - array of existing rounds (newest first)
 * @returns {number}
 */
function getNextRodadaNumero(rodadas) {
  return (rodadas && rodadas.length > 0 ? rodadas[0].numero : 0) + 1;
}

async function deleteNegociacao(negId, preferRole) {
  try {
    const token = await _getWriteToken(preferRole);
    if (!token) { console.warn('[deleteNegociacao] No valid token'); if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return false; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?id=eq.' + negId, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Prefer': 'return=minimal' }
    });
    if (!res.ok && typeof showToast === 'function') showToast('Erro ao excluir negociação.', 'error');
    return res.ok;
  } catch (err) { console.error('[deleteNegociacao] Failed:', err); if (typeof showToast === 'function') showToast('Erro de conexão.', 'error'); return false; }
}

async function createNegociacao(neg, preferRole) {
  try {
    const token = await _getWriteToken(preferRole || 'brand');
    if (!token) { console.warn('[createNegociacao] No valid token for role:', preferRole || 'brand'); if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes', {
      method: 'POST', body: JSON.stringify(neg),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) { if (typeof showToast === 'function') showToast('Erro ao criar negociação. Verifique seu login.', 'error'); throw new Error('HTTP ' + res.status); }
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[createNegociacao] Failed:', err); return null; }
}
