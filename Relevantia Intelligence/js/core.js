// ============================================================
// Relevantia Intelligence — core.js
// Auth helpers, API wrapper, utilities
// ============================================================

const SUPABASE_URL = 'https://bzckerazidgrkbpgqqee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Y2tlcmF6aWRncmticGdxcWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjczODksImV4cCI6MjA4ODIwMzM4OX0.HIVnwcGvKiYNGfVFEnP0Ik9kfOeXPB4c4BFqDpqFCS4';
// SERVICE_KEY REMOVIDA — operações admin devem usar Edge Functions server-side

const SESSION_KEYS = {
  client: 'ri_client_session',
  admin:  'ri_admin_session'
};

// ── Session Management ────────────────────────────────────────

function getSession(role) {
  const key = SESSION_KEYS[role];
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      localStorage.removeItem(key);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(role, data) {
  const key = SESSION_KEYS[role];
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(data));
}

function clearSession(role) {
  const key = SESSION_KEYS[role];
  if (key) localStorage.removeItem(key);
}

function getCurrentRole() {
  if (getSession('admin'))  return 'admin';
  if (getSession('client')) return 'client';
  return null;
}

function getCurrentUser() {
  return getSession('admin') || getSession('client') || null;
}

// ── Auth Guard ────────────────────────────────────────────────

function requireAuth(role, redirectTo = 'index.html') {
  const session = getSession(role);
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

// ── API Helper ────────────────────────────────────────────────

async function sbFetch(path, token, opts = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  const res = await fetch(SUPABASE_URL + path, { ...opts, headers });
  return res;
}

// sbFetchService REMOVIDA — use Edge Functions para operações que requerem service_role
// async function sbFetchService() { ... }

// ── Auth API ──────────────────────────────────────────────────

async function loginWithEmail(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  return res;
}

// ── Toast Notifications ───────────────────────────────────────

function showToast(msg, type = '') {
  const existing = document.querySelector('.ri-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'ri-toast';
  toast.textContent = msg;

  const colors = {
    success: '#10B981',
    error:   '#EF4444',
    '':      '#1A1A1A'
  };

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '24px',
    right:        '24px',
    background:   colors[type] || colors[''],
    color:        '#fff',
    padding:      '12px 20px',
    borderRadius: '8px',
    fontSize:     '14px',
    fontFamily:   "'DM Sans', sans-serif",
    fontWeight:   '500',
    zIndex:       '9999',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.12)',
    opacity:      '0',
    transform:    'translateY(8px)',
    transition:   'opacity 0.2s ease, transform 0.2s ease'
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// ── Formatting Utils ──────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(status) {
  const map = {
    pendente:      'Pendente',
    em_andamento:  'Em andamento',
    concluido:     'Concluído',
    ativo:         'Ativo',
    pausado:       'Pausado',
    encerrado:     'Encerrado'
  };
  return map[status] || status;
}

function statusColor(status) {
  const map = {
    pendente:     { bg: '#F3F4F6', color: '#6B7280' },
    em_andamento: { bg: '#EFF6FF', color: '#3B82F6' },
    concluido:    { bg: '#ECFDF5', color: '#10B981' },
    ativo:        { bg: '#ECFDF5', color: '#10B981' },
    pausado:      { bg: '#FFF7ED', color: '#F59E0B' },
    encerrado:    { bg: '#FEF2F2', color: '#EF4444' }
  };
  return map[status] || { bg: '#F3F4F6', color: '#6B7280' };
}
