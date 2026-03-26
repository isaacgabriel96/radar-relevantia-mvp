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
