/**
 * i18n.js — Radar Relevantia internationalization engine
 *
 * Usage in every page:
 *   <script src="/js/core.js"></script>
 *   <script src="/js/i18n.js"></script>
 *
 * Then in init():
 *   await window.initLang();
 *   applyTranslations();
 *
 * Two patterns for translating strings:
 *
 *   A) Static HTML text — add data-i18n attribute:
 *      <span data-i18n="nav.dashboard">Dashboard</span>
 *      <input data-i18n-placeholder="auth.email_placeholder" placeholder="seu@email.com">
 *      The inline text serves as a visual fallback during dev.
 *
 *   B) Dynamic JS strings — call t():
 *      showToast(t('toast.filters_cleared'), 'success');
 *      label.textContent = t('loading.entering');
 */

/** Currently active language code. */
window.RR_LANG = 'pt-BR';

/** Flat key→string map loaded from the active language JSON. */
window.RR_STRINGS = {};

/**
 * Return the translated string for a given key.
 * Falls back to the key itself if not found (never breaks the UI).
 *
 * @param {string} key          — dot-namespaced key, e.g. 'nav.dashboard'
 * @param {object} [replacements] — optional map of {placeholder: value}
 *   e.g. t('chat.translate', { lang: 'English' }) → "Translate to English"
 * @returns {string}
 */
window.t = function(key, replacements) {
  const str = window.RR_STRINGS[key] || key;
  if (!replacements) return str;
  return Object.entries(replacements).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    str
  );
};

/**
 * Load a language JSON file into RR_STRINGS.
 * Falls back to pt-BR if the requested language file is unavailable.
 * @param {string} lang — e.g. 'en', 'pt-BR'
 */
// Fallback inline — usado quando fetch falha (ex: file:// protocol)
const _PT_BR_FALLBACK = {};

async function loadTranslations(lang) {
  // Em file:// o fetch de arquivos locais é bloqueado por CORS — vai direto ao fallback
  if (window.location.protocol === 'file:') {
    window.RR_STRINGS = _PT_BR_FALLBACK;
    window.RR_LANG = 'pt-BR';
    return;
  }
  try {
    const res = await fetch(`/i18n/${lang}.json`);
    if (!res.ok) throw new Error(`i18n: ${lang}.json not found`);
    window.RR_STRINGS = await res.json();
    window.RR_LANG = lang;
  } catch (err) {
    if (lang !== 'pt-BR') {
      try {
        const fallback = await fetch('/i18n/pt-BR.json');
        window.RR_STRINGS = await fallback.json();
        window.RR_LANG = 'pt-BR';
        return;
      } catch { /* fall through to inline fallback */ }
    }
    // Fallback inline silencioso
    window.RR_STRINGS = _PT_BR_FALLBACK;
    window.RR_LANG = 'pt-BR';
  }
}

/**
 * Detect and load the user's preferred language.
 * Priority: URL ?lang= param → localStorage → browser language → default pt-BR.
 *
 * Call this as the first await in every page's init().
 */
window.initLang = async function() {
  const urlLang     = new URLSearchParams(window.location.search).get('lang');
  const storedLang  = localStorage.getItem('rr_lang');
  const browserLang = (navigator.language || navigator.userLanguage || 'pt-BR')
                        .startsWith('en') ? 'en' : 'pt-BR';
  const lang = urlLang || storedLang || browserLang;

  // Persist URL-param choice to localStorage
  if (urlLang) localStorage.setItem('rr_lang', urlLang);

  await loadTranslations(lang);
  document.documentElement.lang = window.RR_LANG;
};

/**
 * Apply translations to the current DOM.
 * Sweeps all elements with data-i18n or data-i18n-placeholder attributes.
 *
 * Call once after initLang() and whenever lang changes (setUserLang does this).
 */
window.applyTranslations = function() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = window.t(key);
    // Only update if translation was actually found (key !== translated)
    if (translated !== key) el.textContent = translated;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translated = window.t(key);
    if (translated !== key) el.placeholder = translated;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translated = window.t(key);
    if (translated !== key) el.title = translated;
  });
};

/**
 * Change the active language, persist the choice, and re-render the page
 * without a full reload. If the user is authenticated, also saves to Supabase.
 *
 * @param {string} lang — 'pt-BR' | 'en'
 */
window.setUserLang = async function(lang) {
  localStorage.setItem('rr_lang', lang);
  await loadTranslations(lang);
  applyTranslations();
  document.documentElement.lang = lang;

  // Update the language toggle label
  const toggleEl = document.getElementById('langToggleLabel');
  if (toggleEl) {
    toggleEl.textContent = lang === 'pt-BR'
      ? window.t('lang.switch_to_en')
      : window.t('lang.switch_to_pt');
  }

  // Persist to Supabase if there is an active session
  const session = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (session?.access_token && session?.user?.id) {
    const role = (session.user?.user_metadata?.tipo === 'marca') ? 'brand' : 'rightsholder';
    const table = role === 'brand' ? 'marcas_waitlist' : 'detentores_waitlist';
    const userId = session.user.id;
    try {
      await sbFetch(
        `/rest/v1/${table}?user_id=eq.${userId}`,
        session.access_token,
        { method: 'PATCH', body: JSON.stringify({ preferred_lang: lang }) }
      );
    } catch {
      // Non-critical — language is already saved in localStorage
    }
  }
};

/**
 * After login, sync the user's saved preferred_lang from their Supabase profile.
 * Call this once after a successful login, before redirecting.
 *
 * @param {object} session — Supabase session object with access_token and user
 */
window.syncLangFromProfile = async function(session) {
  const role = (session.user?.user_metadata?.tipo === 'marca') ? 'brand' : 'rightsholder';
  const table = role === 'brand' ? 'marcas_waitlist' : 'detentores_waitlist';
  const userId = session.user.id;
  try {
    const res = await sbFetch(
      `/rest/v1/${table}?select=preferred_lang&user_id=eq.${userId}`,
      session.access_token
    );
    const rows = await res.json();
    const savedLang = rows?.[0]?.preferred_lang;
    if (savedLang && savedLang !== localStorage.getItem('rr_lang')) {
      localStorage.setItem('rr_lang', savedLang);
    }
  } catch {
    // Non-critical — will use localStorage fallback
  }
};
