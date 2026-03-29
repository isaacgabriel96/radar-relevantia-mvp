/**
 * core.js — Radar Relevantia shared utilities
 *
 * Include this before any page-specific script:
 *   <script src="/js/core.js"></script>
 *
 * Provides: SUPABASE_URL, SUPABASE_KEY, showToast, getSession,
 *           clearSession, requireAuth, getCurrentUser, sbFetch,
 *           isDemoMode, enterDemoMode, exitDemoMode
 */

const SUPABASE_URL = 'https://bzckerazidgrkbpgqqee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Y2tlcmF6aWRncmticGdxcWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjczODksImV4cCI6MjA4ODIwMzM4OX0.HIVnwcGvKiYNGfVFEnP0Ik9kfOeXPB4c4BFqDpqFCS4';

// localStorage key mapping — DO NOT rename these keys, they would log out existing users.
// See GLOSSARY.md for meaning of each key.
const SESSION_KEYS = {
  rightsholder: 'sb_detentor_session',   // detentor = rights holder
  brand:        'sb_marca_session',       // marca = brand
  admin:        'sb_admin_session'
};

/**
 * Display a toast notification at the bottom of the page.
 * @param {string} msg   — message text
 * @param {string} type  — 'success' | 'error' | '' (neutral)
 */
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

/**
 * Read a stored session from localStorage.
 * @param {'brand'|'rightsholder'|'admin'} role
 * @returns {object|null} parsed session object, or null if missing/expired
 */
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

/**
 * Remove a stored session from localStorage.
 * @param {'brand'|'rightsholder'|'admin'} role
 */
function clearSession(role) {
  const key = SESSION_KEYS[role];
  if (key) localStorage.removeItem(key);
}

/**
 * Detect current user's role from any active session.
 * @returns {'brand'|'rightsholder'|'admin'|null}
 */
function getCurrentRole() {
  if (getSession('brand'))        return 'brand';
  if (getSession('rightsholder')) return 'rightsholder';
  if (getSession('admin'))        return 'admin';
  return null;
}

/**
 * Return the current user's session data (any role).
 * @returns {object|null}
 */
function getCurrentUser() {
  return getSession('brand') || getSession('rightsholder') || getSession('admin') || null;
}

/**
 * Guard a page: redirect to login if no valid session for the given role.
 * Call this in init() before rendering anything.
 * @param {'brand'|'rightsholder'|'admin'} role
 * @param {string} [redirectTo='login.html']
 */
function requireAuth(role, redirectTo = 'login.html') {
  if (!getSession(role)) {
    window.location.href = redirectTo;
  }
}

// ─── DEMO MODE ───────────────────────────────────────────────
// Internal-only mode for admin onboarding demos.
// Activated via admin.html or URL param ?demo=marca|detentor

/**
 * Check if demo mode is currently active.
 * @returns {boolean}
 */
function isDemoMode() {
  const urlParam = new URLSearchParams(window.location.search).get('demo');
  if (urlParam === 'marca' || urlParam === 'detentor') {
    localStorage.setItem('rr_demo_mode', urlParam);
    return true;
  }
  return !!localStorage.getItem('rr_demo_mode');
}

/**
 * Get the active demo role.
 * @returns {'marca'|'detentor'|null}
 */
function getDemoRole() {
  return localStorage.getItem('rr_demo_mode') || null;
}

/**
 * Activate demo mode: creates a synthetic session in localStorage
 * so that getSession() / getCurrentUser() work normally.
 * @param {'brand'|'rightsholder'} role
 */
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
      user_metadata: {
        tipo: tipo,
        nome: user.nome || 'Demo User',
        _demo: true
      }
    }
  };

  const key = role === 'brand' ? SESSION_KEYS.brand : SESSION_KEYS.rightsholder;
  localStorage.setItem(key, JSON.stringify(fakeSession));
  localStorage.setItem('rr_demo_mode', tipo);
}

/**
 * Exit demo mode: clears synthetic session and demo flag.
 */
function exitDemoMode() {
  localStorage.removeItem('rr_demo_mode');
  // Clear any demo sessions (identified by DEMO_TOKEN)
  [SESSION_KEYS.brand, SESSION_KEYS.rightsholder].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.access_token === 'DEMO_TOKEN') localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  });
  window.location.href = 'admin.html';
}

/**
 * Show the demo banner if demo mode is active.
 * Call this from init() on any dashboard page.
 * Expects an element with id="demoBanner" in the HTML.
 */
function showDemoBannerIfActive() {
  if (!isDemoMode()) return;
  const banner = document.getElementById('demoBanner');
  if (banner) banner.style.display = 'flex';
  // Add small badge next to sidebar name
  const sidebarName = document.getElementById('sidebarName');
  if (sidebarName && !document.getElementById('demoBadge')) {
    const badge = document.createElement('span');
    badge.id = 'demoBadge';
    badge.textContent = 'DEMO';
    badge.style.cssText = 'display:inline-block;background:linear-gradient(135deg,#B8860B,#C8A84B);color:#1A1200;font-size:9px;font-weight:700;letter-spacing:0.1em;padding:2px 8px;border-radius:100px;margin-left:8px;vertical-align:middle;';
    sidebarName.parentNode.insertBefore(badge, sidebarName.nextSibling);
  }
}

// ─── SUPABASE FETCH ─────────────────────────────────────────

/**
 * Authenticated fetch wrapper for Supabase REST API.
 * Automatically includes apikey and Authorization headers.
 * In demo mode, returns fake responses to prevent real API calls.
 * @param {string} path   — path after SUPABASE_URL (e.g. '/rest/v1/table_name')
 * @param {string} token  — access_token from session
 * @param {object} [opts] — fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
function sbFetch(path, token, opts = {}) {
  // DEMO GUARD: never hit real API in demo mode
  if (isDemoMode()) {
    console.warn('[DEMO] Blocked API call:', opts.method || 'GET', path);
    const isWrite = opts.method && opts.method !== 'GET';
    const body = JSON.stringify(isWrite ? { demo: true } : []);
    return Promise.resolve(new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  return fetch(SUPABASE_URL + path, { ...opts, headers });
}

/**
 * Public (anon) fetch — for endpoints that don't require auth.
 * Uses the anon key only, no user token.
 * @param {string} path — path after SUPABASE_URL
 * @param {object} [opts] — fetch options
 * @returns {Promise<Response>}
 */
function sbPublicFetch(path, opts = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  return fetch(SUPABASE_URL + path, { ...opts, headers });
}

// ─── CATALOG API ────────────────────────────────────────────

/**
 * Parse "R$80.000" or "R$ 200.000" → 80000 (number).
 * Returns 0 if unparseable.
 */
function parsePreco(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Extract region from localizacao string.
 * "São Paulo, SP — Brasil" → "São Paulo"
 * "Las Vegas, NV — EUA" → "Online" (non-BR)
 */
function extractRegion(loc) {
  if (!loc) return '';
  // Mapping of state abbreviations to region names
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

/**
 * Extract city from localizacao.
 * "São Paulo, SP — Brasil" → "São Paulo"
 */
function extractCity(loc) {
  if (!loc) return '';
  const parts = loc.split(',');
  return parts[0].trim();
}

/**
 * Generate org initials from detentor name or empresa.
 * "Instituto Esportivo SP" → "IE"
 */
function makeInitials(name) {
  if (!name) return '??';
  const words = name.trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/**
 * Transform a Supabase oportunidades row into the format renderCards() expects.
 * @param {object} row — row from Supabase
 * @returns {object} — { id, title, category, city, region, org, orgInitials, desc, price, date, gradient }
 */
function rowToCatalogItem(row) {
  const orgNome = (row.perfis && row.perfis.empresa) ? row.perfis.empresa : '';
  return {
    id:          row.id,
    title:       row.titulo || '',
    category:    row.categoria || '',
    city:        extractCity(row.localizacao),
    region:      extractRegion(row.localizacao),
    org:         orgNome,
    orgInitials: makeInitials(orgNome),
    desc:        row.descricao_curta || '',
    price:       parsePreco(row.preco_minimo),
    date:        row.alcance || '',           // reuse alcance as date/reach label
    gradient:    row.bg_gradient || 'linear-gradient(135deg, #1a1a2e, #16213e)'
  };
}

/**
 * Fetch the public catalog of active opportunities from Supabase.
 * Joins with perfis to get the org name.
 * Returns array in the same format as DEMO.catalog.
 * @returns {Promise<Array>}
 */
async function fetchCatalog() {
  try {
    const path = '/rest/v1/oportunidades?select=id,titulo,categoria,localizacao,preco_minimo,descricao_curta,alcance,bg_gradient,perfis:detentor_id(empresa)&ativo=eq.true&order=id.asc';
    const res = await sbPublicFetch(path);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows.map(rowToCatalogItem);
  } catch (err) {
    console.error('[fetchCatalog] Failed, falling back to demo data:', err);
    return null; // signals caller to use fallback
  }
}

// ─── NEGOTIATIONS API ───────────────────────────────────────

/**
 * Format ISO date to "DD/MM/YYYY" or "DD/MM · HH:MM".
 */
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

/**
 * Transform a Supabase negociacao row (with joins) into the shape
 * dashboard-detentor.html and dashboard-marca.html expect.
 *
 * Expected Supabase row shape (from the joined query):
 *   { id, oportunidade_id, marca_id, detentor_id, cota, assunto,
 *     valor_proposto, valor_deal, status, status_label, status_hint,
 *     aceita_novas_propostas, created_at,
 *     marca:marca_id(nome, empresa),
 *     oportunidade:oportunidade_id(titulo, categoria),
 *     contrapartidas: [...],
 *     mensagens: [...] }
 */
function rowToNegociacao(row) {
  const marcaNome = (row.marca && row.marca.empresa) ? row.marca.empresa : '';
  const oppTitulo = (row.oportunidade && row.oportunidade.titulo) ? row.oportunidade.titulo : '';
  const oppCat    = (row.oportunidade && row.oportunidade.categoria) ? row.oportunidade.categoria : '';

  // Map contrapartidas
  const cps = (row.contrapartidas || []).map(cp => ({
    id:          cp.id,
    descricao:   cp.descricao || '',
    categoria:   cp.categoria || '',
    valor:       parseFloat(cp.valor) || 0,
    prazo:       cp.prazo || '',
    status:      cp.status || 'proposta',
    propostoPor: cp.proposto_por || 'marca'
  }));

  // Map mensagens → thread
  const thread = (row.mensagens || []).map(m => ({
    autor: m.autor_role || 'marca',
    nome:  m.autor_nome || '',
    texto: m.texto || '',
    data:  _fmtDate(m.created_at, true)
  }));

  // Status label mapping
  const statusLabels = {
    'pendente': 'Pendente',
    'analise':  'Em análise',
    'aceita':   'Aceita',
    'recusada': 'Recusada',
    'cancelada':'Cancelada'
  };

  return {
    id:            row.id,
    opp_id:        row.oportunidade_id,
    opp:           oppTitulo,
    categoria:     oppCat,
    marca:         marcaNome,
    marca_id:      row.marca_id,
    detentor_id:   row.detentor_id,
    cota:          row.cota || '',
    assunto:       row.assunto || '',
    enviadaEm:     _fmtDate(row.created_at, false),
    status:        row.status || 'pendente',
    statusLabel:   row.status_label || statusLabels[row.status] || 'Pendente',
    statusHint:    row.status_hint || '',
    aceitaNovasPropostas: row.aceita_novas_propostas !== false,
    thread:        thread,
    contrapartidas: cps,
    valorDeal: {
      proposto:    row.valor_deal ? parseFloat(row.valor_deal) : null,
      propostoPor: null,
      status:      row.valor_deal ? 'aceito' : 'sem_proposta'
    },
    // Keep raw Supabase ID for updates
    _supaId:       row.id
  };
}

/**
 * Fetch all negotiations for a detentor (rights holder).
 * Includes joined marca profile, oportunidade title, contrapartidas, and mensagens.
 * @param {string} token — user's access_token
 * @returns {Promise<Array|null>} — array of negotiation objects, or null on error
 */
async function fetchNegociacoesDetentor(token) {
  try {
    const path = '/rest/v1/negociacoes?select=' +
      'id,oportunidade_id,marca_id,detentor_id,cota,assunto,valor_proposto,valor_deal,' +
      'status,status_label,status_hint,aceita_novas_propostas,created_at,' +
      'marca:marca_id(nome,empresa),' +
      'oportunidade:oportunidade_id(titulo,categoria),' +
      'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por),' +
      'mensagens(id,autor_role,autor_nome,texto,created_at)' +
      '&order=created_at.desc' +
      '&mensagens.order=created_at.asc';
    const res = await sbFetch(path, token);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows.map(rowToNegociacao);
  } catch (err) {
    console.error('[fetchNegociacoesDetentor] Failed:', err);
    return null;
  }
}

/**
 * Fetch all negotiations for a marca (brand).
 * Same shape as detentor, but filtered by marca_id via RLS.
 * @param {string} token — user's access_token
 * @returns {Promise<Array|null>}
 */
async function fetchNegociacoesMarca(token) {
  try {
    const path = '/rest/v1/negociacoes?select=' +
      'id,oportunidade_id,marca_id,detentor_id,cota,assunto,valor_proposto,valor_deal,' +
      'status,status_label,status_hint,aceita_novas_propostas,created_at,' +
      'detentor:detentor_id(nome,empresa),' +
      'oportunidade:oportunidade_id(titulo,categoria),' +
      'contrapartidas(id,descricao,categoria,valor,prazo,status,proposto_por),' +
      'mensagens(id,autor_role,autor_nome,texto,created_at)' +
      '&order=created_at.desc' +
      '&mensagens.order=created_at.asc';
    const res = await sbFetch(path, token);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows.map(rowToNegociacao);
  } catch (err) {
    console.error('[fetchNegociacoesMarca] Failed:', err);
    return null;
  }
}

// ─── NEGOTIATION WRITE OPERATIONS ───────────────────────────

/**
 * Update a negotiation's status (and optionally other fields).
 * @param {string} negId — UUID of the negotiation
 * @param {object} fields — { status?, status_label?, status_hint?, valor_deal?, aceita_novas_propostas? }
 * @param {string} token
 * @returns {Promise<boolean>} — true on success
 */
async function updateNegociacao(negId, fields, token) {
  try {
    const res = await sbFetch(
      '/rest/v1/negociacoes?id=eq.' + negId,
      token,
      { method: 'PATCH', body: JSON.stringify(fields), headers: { 'Prefer': 'return=minimal' } }
    );
    return res.ok;
  } catch (err) {
    console.error('[updateNegociacao] Failed:', err);
    return false;
  }
}

/**
 * Send a message in a negotiation thread.
 * @param {object} msg — { negociacao_id, autor_id, autor_role, autor_nome, texto }
 * @param {string} token
 * @returns {Promise<object|null>} — created message or null
 */
async function sendMensagem(msg, token) {
  try {
    const res = await sbFetch(
      '/rest/v1/mensagens',
      token,
      {
        method: 'POST',
        body: JSON.stringify(msg),
        headers: { 'Prefer': 'return=representation' }
      }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) {
    console.error('[sendMensagem] Failed:', err);
    return null;
  }
}

/**
 * Create a new contrapartida.
 * @param {object} cp — { negociacao_id, descricao, categoria, valor, prazo, status, proposto_por }
 * @param {string} token
 * @returns {Promise<object|null>} — created row or null
 */
async function createContrapartida(cp, token) {
  try {
    const res = await sbFetch(
      '/rest/v1/contrapartidas',
      token,
      {
        method: 'POST',
        body: JSON.stringify(cp),
        headers: { 'Prefer': 'return=representation' }
      }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) {
    console.error('[createContrapartida] Failed:', err);
    return null;
  }
}

/**
 * Update a contrapartida (accept/reject).
 * @param {string} cpId — UUID
 * @param {object} fields — { status }
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function updateContrapartida(cpId, fields, token) {
  try {
    const res = await sbFetch(
      '/rest/v1/contrapartidas?id=eq.' + cpId,
      token,
      { method: 'PATCH', body: JSON.stringify(fields), headers: { 'Prefer': 'return=minimal' } }
    );
    return res.ok;
  } catch (err) {
    console.error('[updateContrapartida] Failed:', err);
    return false;
  }
}

/**
 * Create a new negotiation (when marca sends a proposal).
 * @param {object} neg — { oportunidade_id, marca_id, detentor_id, cota, assunto, valor_proposto, status }
 * @param {string} token
 * @returns {Promise<object|null>} — created row or null
 */
async function createNegociacao(neg, token) {
  try {
    const res = await sbFetch(
      '/rest/v1/negociacoes',
      token,
      {
        method: 'POST',
        body: JSON.stringify(neg),
        headers: { 'Prefer': 'return=representation' }
      }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) {
    console.error('[createNegociacao] Failed:', err);
    return null;
  }
}
