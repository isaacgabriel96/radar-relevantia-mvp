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
      localStorage.removeItem(key);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function clearSession(role) {
  const key = SESSION_KEYS[role];
  if (key) localStorage.removeItem(key);
}

function getCurrentRole() {
  if (getSession('brand'))        return 'brand';
  if (getSession('rightsholder')) return 'rightsholder';
  if (getSession('admin'))        return 'admin';
  return null;
}

function getCurrentUser() {
  return getSession('brand') || getSession('rightsholder') || getSession('admin') || null;
}

function requireAuth(role, redirectTo = 'login.html') {
  if (!getSession(role)) {
    window.location.href = redirectTo;
  }
}

// ─── DEMO MODE ──────────────────────────────────────────────
function isDemoMode() {
  const urlParam = new URLSearchParams(window.location.search).get('demo');
  if (urlParam === 'marca' || urlParam === 'detentor') {
    localStorage.setItem('rr_demo_mode', urlParam);
    return true;
  }
  return !!localStorage.getItem('rr_demo_mode');
}

function getDemoRole() {
  return localStorage.getItem('rr_demo_mode') || null;
}

function enterDemoMode(role) {
  const tipo = role === 'brand' ? 'marca' : 'detentor';
  const demoData = (window.DEMO && tipo === 'marca') ? window.DEMO.marca : (window.DEMO ? window.DEMO.detentor : {});
  const user = demoData.user || {};
  const fakeSession = {
    access_token: 'DEMO_TOKEN',
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
    user: {
      id: 'demo-' + tipo + '-001',
      email: user.email || 'demo@radar.com',
      user_metadata: { tipo, nome: user.nome || 'Demo User', _demo: true }
    }
  };
  const key = role === 'brand' ? SESSION_KEYS.brand : SESSION_KEYS.rightsholder;
  localStorage.setItem(key, JSON.stringify(fakeSession));
  localStorage.setItem('rr_demo_mode', tipo);
}

function exitDemoMode() {
  localStorage.removeItem('rr_demo_mode');
  [SESSION_KEYS.brand, SESSION_KEYS.rightsholder].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const s = JSON.parse(raw); if (s.access_token === 'DEMO_TOKEN') localStorage.removeItem(key); }
    } catch { /* ignore */ }
  });
  window.location.href = 'admin.html';
}

function showDemoBannerIfActive() {
  if (!isDemoMode()) return;
  const banner = document.getElementById('demoBanner');
  if (banner) banner.style.display = 'flex';
  const sidebarName = document.getElementById('sidebarName');
  if (sidebarName && !document.getElementById('demoBadge')) {
    const badge = document.createElement('span');
    badge.id = 'demoBadge';
    badge.textContent = 'DEMO';
    badge.style.cssText = 'display:inline-block;background:linear-gradient(135deg,#B8860B,#C8A84B);color:#1A1200;font-size:9px;font-weight:700;letter-spacing:0.1em;padding:2px 8px;border-radius:100px;margin-left:8px;vertical-align:middle;';
    sidebarName.parentNode.insertBefore(badge, sidebarName.nextSibling);
  }
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
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id || null;
  } catch { return null; }
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

  // Try to restore from legacy localStorage
  const legacy = getSession('rightsholder') || getSession('brand');
  if (legacy && legacy.access_token && legacy.access_token !== 'DEMO_TOKEN') {
    try {
      await sb.auth.setSession({
        access_token: legacy.access_token,
        refresh_token: legacy.refresh_token || ''
      });
    } catch (e) {
      console.warn('[core] Could not restore legacy session to SDK:', e.message);
    }
  }
}

// Auto-restore on load
if (sb && !isDemoMode()) {
  restoreSessionToSDK();
}

// ─── CATALOG API ────────────────────────────────────────────

function parsePreco(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
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
    desc: row.descricao_curta || '', price: parsePreco(row.preco_minimo),
    date: row.alcance || '', gradient: row.bg_gradient || 'linear-gradient(135deg, #1a1a2e, #16213e)',
    imagem_capa: row.imagem_capa || null
  };
}

async function fetchCatalog() {
  try {
    const path = '/rest/v1/oportunidades?select=id,slug,titulo,categoria,localizacao,preco_minimo,descricao_curta,alcance,bg_gradient,imagem_capa,perfis:detentor_id(empresa,slug)&ativo=eq.true&order=id.asc';
    const res = await sbPublicFetch(path);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows.map(rowToCatalogItem);
  } catch (err) {
    console.error('[fetchCatalog] Failed:', err);
    return null;
  }
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
    valorDeal: {
      proposto: row.valor_deal ? parseFloat(row.valor_deal) : null,
      propostoPor: null,
      status: row.valor_deal ? 'aceito' : 'sem_proposta'
    },
    _supaId: row.id
  };
}

// Shared query string for negociacoes with all joins
var _negSelectQuery = 'id,oportunidade_id,marca_id,detentor_id,cota,assunto,valor_proposto,valor_deal,' +
  'status,status_label,status_hint,aceita_novas_propostas,created_at,' +
  'marca:marca_id(nome,empresa),' +
  'oportunidade:oportunidade_id(titulo,categoria),' +
  'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por),' +
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
    // Fallback to legacy token
    const session = getSession('rightsholder');
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

async function fetchNegociacoesMarca() {
  if (isDemoMode()) return null;
  try {
    if (sb) {
      const token = await getValidToken();
      if (token) {
        // For marca, join detentor instead of marca
        const marcaSelect = _negSelectQuery.replace('marca:marca_id(nome,empresa),', 'detentor:detentor_id(nome,empresa),');
        const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?select=' + marcaSelect +
          '&order=created_at.desc&mensagens.order=created_at.asc', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = await res.json();
        return rows.map(rowToNegociacao);
      }
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
    legacy = getSession(preferRole);
  }
  if (!legacy) {
    legacy = getSession('rightsholder') || getSession('brand');
  }
  return (legacy && legacy.access_token !== 'DEMO_TOKEN') ? legacy.access_token : null;
}

async function updateNegociacao(negId, fields, preferRole) {
  try {
    const token = await _getWriteToken(preferRole);
    if (!token) { console.warn('[updateNegociacao] No valid token'); return false; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes?id=eq.' + negId, {
      method: 'PATCH', body: JSON.stringify(fields),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }
    });
    return res.ok;
  } catch (err) { console.error('[updateNegociacao] Failed:', err); return false; }
}

async function sendMensagem(msg) {
  try {
    const token = await _getWriteToken();
    if (!token) { console.warn('[sendMensagem] No valid token'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/mensagens', {
      method: 'POST', body: JSON.stringify(msg),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[sendMensagem] Failed:', err); return null; }
}

async function createContrapartida(cp) {
  try {
    const token = await _getWriteToken();
    if (!token) return null;
    const res = await fetch(SUPABASE_URL + '/rest/v1/contrapartidas', {
      method: 'POST', body: JSON.stringify(cp),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[createContrapartida] Failed:', err); return null; }
}

async function updateContrapartida(cpId, fields) {
  try {
    const token = await _getWriteToken();
    if (!token) return false;
    const res = await fetch(SUPABASE_URL + '/rest/v1/contrapartidas?id=eq.' + cpId, {
      method: 'PATCH', body: JSON.stringify(fields),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }
    });
    return res.ok;
  } catch (err) { console.error('[updateContrapartida] Failed:', err); return false; }
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

async function createNegociacao(neg, preferRole) {
  try {
    const token = await _getWriteToken(preferRole || 'brand');
    if (!token) { console.warn('[createNegociacao] No valid token for role:', preferRole || 'brand'); return null; }
    const res = await fetch(SUPABASE_URL + '/rest/v1/negociacoes', {
      method: 'POST', body: JSON.stringify(neg),
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) { console.error('[createNegociacao] Failed:', err); return null; }
}
