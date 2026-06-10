/* ─────────────────────────────────────────────────────────────
   Radar Inbox — página "Mensagens" (antiga "Fale com o Radar")
   Caixa de entrada unificada (estilo Airbnb): conversas de SUPORTE
   (Relevantia) + conversas de NEGOCIAÇÃO, com filtros, num só lugar.
   - Monta dentro de #vozInboxRoot (seção sec-voz).
   - Painel de contexto (estilo "Reserva") ao abrir uma negociação.
   - Popup de conversa: RadarInbox.openNeg(localId) abre o chat de uma
     negociação por cima (usado pelo atalho dentro do modal de negociação).
   Reaproveita globais já carregados:
     getValidToken, getAuthUserId, getCurrentRole, SUPABASE_URL,
     SUPABASE_KEY, sb, escapeHtml, sendMensagem,
     PROPOSTAS / NEGOCIACOES, openPropostaModal / openNegModal,
     loadPropostas / loadNegociacoes.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s == null ? '' : String(s)) : (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  var ROLE = (typeof getCurrentRole === 'function' && getCurrentRole() === 'rightsholder') ? 'detentor' : 'marca';
  var COUNTER = ROLE === 'marca' ? 'detentor' : 'marca';

  function negList() { try { return (ROLE === 'marca' ? (window.PROPOSTAS || []) : (window.NEGOCIACOES || [])); } catch (e) { return []; } }
  function ensureNegLoaded() {
    try {
      if (negList().length) return;
      if (ROLE === 'marca' && typeof loadPropostas === 'function') loadPropostas().then(function () { render(); });
      else if (ROLE === 'detentor' && typeof loadNegociacoes === 'function') loadNegociacoes().then(function () { render(); });
    } catch (e) {}
  }
  function openNegFull(localId) {
    try {
      if (ROLE === 'marca' && typeof openPropostaModal === 'function') openPropostaModal(localId);
      else if (ROLE === 'detentor' && typeof openNegModal === 'function') openNegModal(localId);
    } catch (e) {}
  }

  var CAT = {
    'bug':          { label: 'Bug / Erro',   color: '#EF4444' },
    'melhoria':     { label: 'Melhoria',     color: '#3B82F6' },
    'nova-feature': { label: 'Nova feature', color: '#B8860B' },
    'duvida':       { label: 'Dúvida',       color: '#8B5CF6' },
    'outro':        { label: 'Outro',        color: '#6B7280' }
  };
  var SUP_STATUS = { recebido: 'Recebido', analise: 'Em análise', respondido: 'Respondido', planejado: 'Planejado', resolvido: 'Resolvido', entregue: 'Entregue' };
  var SHORTCUTS = [
    { label: 'Tô com um problema técnico',          cat: 'bug',      tag: '' },
    { label: 'Tenho uma dúvida',                    cat: 'duvida',   tag: '' },
    { label: 'Falar sobre uma proposta/negociação', cat: 'duvida',   tag: '[Proposta] ' },
    { label: 'Quero dar uma sugestão',              cat: 'melhoria', tag: '' }
  ];
  var FILTERS = [
    { key: 'todas',        label: 'Todas' },
    { key: 'nao_lidas',    label: 'Não lidas' },
    { key: 'solicitacoes', label: 'Solicitações' },
    { key: 'suporte',      label: 'Suporte' },
    { key: 'negociacoes',  label: 'Negociações' }
  ];

  var S = {
    sup: [], supThread: [], open: null, // {kind:'sup'|'neg'|'new', id}
    filter: 'todas', loaded: false, mounted: false,
    newCat: 'duvida', newTag: '', newShortcut: null, draft: '',
    supCh: null, negMsgCh: null, refreshTimer: null
  };
  var P = { open: false, neg: null, ch: null }; // popup de conversa

  function H(t, extra) { return Object.assign({ apikey: SUPABASE_KEY, Authorization: 'Bearer ' + t }, extra || {}); }
  function nome() { var el = document.getElementById('sidebarName'); return el && el.textContent ? el.textContent.trim() : 'Usuário'; }

  // ── Anexos (só no suporte; gated por perfis.pode_anexar) ─────
  var _ibAttach = null, _ibPodeAnexar = true;
  function _ibFileInput() {
    var f = document.getElementById('ibFileInput');
    if (!f) {
      f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.id = 'ibFileInput'; f.style.display = 'none';
      f.addEventListener('change', function () {
        var file = this.files[0]; this.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande (máx 5 MB).'); return; }
        var r = new FileReader(); r.onload = function (e) { _ibAttach = e.target.result; _ibMarkAttach(true); }; r.readAsDataURL(file);
      });
      document.body.appendChild(f);
    }
    return f;
  }
  function _ibMarkAttach(on) { document.querySelectorAll('.ib-attach-btn').forEach(function (b) { b.classList.toggle('ib-attach-on', on); b.setAttribute('title', on ? 'Foto anexada (clique pra trocar)' : 'Anexar foto'); }); }
  function attachBtn() { return _ibPodeAnexar === false ? '' : '<button type="button" class="ib-attach-btn" data-act="attach" title="Anexar foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="18" height="18"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'; }
  async function _ibUpload(uid, token) {
    try {
      var m = /^data:(.+?);base64,(.*)$/.exec(_ibAttach || ''); if (!m) return null;
      var mime = m[1], bin = atob(m[2]), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
      var path = uid + '/' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '.' + ext;
      var up = await fetch(SUPABASE_URL + '/storage/v1/object/radar-anexos/' + path, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': mime, 'x-upsert': 'true' }, body: bytes });
      if (!up.ok) return null;
      return SUPABASE_URL + '/storage/v1/object/public/radar-anexos/' + path;
    } catch (e) { return null; }
  }
  async function loadPodeAnexar() {
    var t = await getValidToken(); var uid = await getAuthUserId();
    if (!t || !uid) return;
    try { var r = await fetch(SUPABASE_URL + '/rest/v1/perfis?select=pode_anexar&id=eq.' + uid, { headers: H(t) }); if (r.ok) { var rows = await r.json(); if (rows[0] && typeof rows[0].pode_anexar === 'boolean') { _ibPodeAnexar = rows[0].pode_anexar; if (S.open) renderThread(); } } } catch (e) {}
  }
  function fmtNow() { var n = new Date(); function p(x) { return ('' + x).padStart(2, '0'); } return p(n.getDate()) + '/' + p(n.getMonth() + 1) + ' · ' + p(n.getHours()) + ':' + p(n.getMinutes()); }
  function fmtMsg(iso) { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function initials(name) { return (typeof makeInitials === 'function') ? makeInitials(name || '') : (name || '?').substring(0, 2).toUpperCase(); }
  // Avatar no padrão do projeto: logo_url direto (com onerror→iniciais) ou
  // data-bf-domain/name para o applyBrandfetchLogos() do core.js buscar a logo.
  var RADAR_MARK = '<span class="ib-av" style="background:#15110c;color:#C9A961"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><line x1="12" y1="12" x2="19.5" y2="6.5"/></svg></span>';
  function avatarHtml(c) {
    if (c.kind === 'sup') return RADAR_MARK;
    var n = c.raw || {};
    var init = initials(c.title);
    // Ignora lettermark/placeholder do Brandfetch (não é logo real, costuma expirar) —
    // prefere busca ao vivo por domínio/nome, com iniciais como fallback.
    var isPh = (typeof isBrandfetchPlaceholder === 'function') && isBrandfetchPlaceholder(n.marca_logo_url);
    var realLogo = (n.marca_logo_url && !isPh) ? n.marca_logo_url : '';
    var bf = realLogo ? '' : (n.marca_domain ? ' data-bf-domain="' + esc(n.marca_domain) + '"' : (c.title ? ' data-bf-name="' + esc(c.title) + '"' : ''));
    var inner = realLogo
      ? '<img src="' + esc(realLogo) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'"><span style="display:none">' + esc(init) + '</span>'
      : '<img alt="" style="display:none"><span>' + esc(init) + '</span>';
    return '<span class="ib-av ib-av-logo"' + bf + '>' + inner + '</span>';
  }

  // ── Conversas normalizadas ──────────────────────────────────
  function conversations() {
    var out = [];
    S.sup.forEach(function (t) {
      var c = CAT[t.categoria] || CAT['outro'];
      out.push({ kind: 'sup', id: t.id, raw: t, title: 'Radar · ' + c.label, sub: t.assunto || 'Conversa com o time', avatarColor: c.color, avatarText: 'R', statusLabel: SUP_STATUS[t.status] || t.status, unread: t.cliente_viu === false, ts: Date.parse(t.last_message_at) || 0, pending: false });
    });
    negList().forEach(function (n) {
      var thread = n.thread || [];
      var last = thread[thread.length - 1];
      var counterName = n.marca || (COUNTER === 'detentor' ? 'Organizador' : 'Marca');
      var lastTs = last && last.ts ? Date.parse(last.ts) : (Date.parse(n.enviadaEm) || 0);
      out.push({ kind: 'neg', id: n.id, raw: n, title: counterName, sub: n.opp || 'Negociação', avatarColor: '#B8860B', avatarText: (counterName || '?').substring(0, 1).toUpperCase(), statusLabel: n.statusLabel || n.status || '', unread: !!(last && last.autor === COUNTER), ts: lastTs, pending: (n.status === 'pendente') });
    });
    out.sort(function (a, b) { if (a.unread !== b.unread) return a.unread ? -1 : 1; return b.ts - a.ts; });
    return out;
  }
  function filtered() {
    var all = conversations();
    if (S.filter === 'nao_lidas')    return all.filter(function (c) { return c.unread; });
    if (S.filter === 'solicitacoes') return all.filter(function (c) { return c.kind === 'neg' && c.pending; });
    if (S.filter === 'suporte')      return all.filter(function (c) { return c.kind === 'sup'; });
    if (S.filter === 'negociacoes')  return all.filter(function (c) { return c.kind === 'neg'; });
    return all;
  }
  function unreadTotal() { return conversations().filter(function (c) { return c.unread; }).length; }

  // ── Dados de suporte ────────────────────────────────────────
  async function loadSupport() {
    var t = await getValidToken();
    if (!t) return;
    try { var res = await fetch(SUPABASE_URL + '/rest/v1/radar_tickets?select=*&order=last_message_at.desc', { headers: H(t) }); S.sup = res.ok ? await res.json() : []; S.loaded = true; } catch (e) { S.sup = []; }
    setSidebarBadge();
  }
  function setSidebarBadge() { var n = unreadTotal(); var b = document.getElementById('navBadgeVoz'); if (b) { b.textContent = n; b.style.display = n > 0 ? '' : 'none'; } }

  // ── Render ──────────────────────────────────────────────────
  function render() {
    var root = document.getElementById('vozInboxRoot');
    if (!root) return;
    if (!S.mounted) {
      root.innerHTML =
        '<div class="ib-wrap">' +
          '<div class="ib-listcol" id="ibListCol">' +
            '<div class="ib-filters" id="ibFilters"></div>' +
            '<button class="ib-newbtn" id="ibNewBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nova conversa com o Radar</button>' +
            '<div class="ib-list" id="ibList"></div>' +
          '</div>' +
          '<div class="ib-threadcol" id="ibThreadCol"><div id="ibThread" class="ib-thread-host"></div></div>' +
          '<div class="ib-contextcol" id="ibContext"></div>' +
        '</div>';
      S.mounted = true;
      root.querySelector('#ibFilters').addEventListener('click', onFilterClick);
      root.querySelector('#ibNewBtn').addEventListener('click', function () { S.open = { kind: 'new' }; S.draft = ''; S.newShortcut = null; S.newCat = 'duvida'; S.newTag = ''; setMobileThread(true); renderThread(); });
      root.querySelector('#ibList').addEventListener('click', onListClick);
      root.querySelector('#ibThread').addEventListener('click', onThreadClick);
      root.querySelector('#ibContext').addEventListener('click', function (e) { var b = e.target.closest('[data-act="openfull"]'); if (b && S.open && S.open.kind === 'neg') openNegFull(S.open.id); });
    }
    renderFilters();
    renderList();
    renderThread();
    setSidebarBadge();
  }

  function renderFilters() {
    var el = document.getElementById('ibFilters');
    if (!el) return;
    el.innerHTML = FILTERS.map(function (f) { return '<button class="ib-fpill' + (S.filter === f.key ? ' ib-fpill-on' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>'; }).join('');
  }

  function renderList() {
    var el = document.getElementById('ibList');
    if (!el) return;
    var items = filtered();
    if (!items.length) { el.innerHTML = '<div class="ib-empty">Nenhuma conversa por aqui.</div>'; return; }
    el.innerHTML = items.map(function (c) {
      var active = S.open && S.open.kind === c.kind && S.open.id === c.id;
      var dt = c.ts ? new Date(c.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
      return '<button class="ib-item' + (active ? ' ib-item-on' : '') + '" data-kind="' + c.kind + '" data-id="' + esc(c.id) + '">' +
        avatarHtml(c) +
        '<span class="ib-item-main">' +
          '<span class="ib-item-top"><span class="ib-item-title">' + esc(c.title) + '</span><span class="ib-item-date">' + dt + '</span></span>' +
          '<span class="ib-item-sub">' + esc(c.sub) + '</span>' +
          '<span class="ib-item-foot"><span class="ib-tag ib-tag-' + c.kind + '">' + (c.kind === 'sup' ? 'Suporte' : 'Negociação') + '</span>' + (c.statusLabel ? '<span class="ib-st">' + esc(c.statusLabel) + '</span>' : '') + (c.unread ? '<span class="ib-unread"></span>' : '') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
    if (typeof applyBrandfetchLogos === 'function') applyBrandfetchLogos(el);
  }

  function renderThread() {
    var host = document.getElementById('ibThread');
    if (host) {
      if (!S.open) host.innerHTML = '<div class="ib-placeholder"><div class="ib-ph-ic">💬</div><div>Selecione uma conversa<br>ou inicie uma nova.</div></div>';
      else if (S.open.kind === 'new') renderNew(host);
      else if (S.open.kind === 'sup') renderSupThread(host);
      else if (S.open.kind === 'neg') renderNegThread(host);
    }
    updateContext();
  }

  function updateContext() {
    var wrap = document.querySelector('.ib-wrap'); var ctx = document.getElementById('ibContext');
    if (!wrap || !ctx) return;
    if (S.open && S.open.kind === 'neg') {
      var n = negList().find(function (x) { return x.id === S.open.id; }) || {};
      ctx.innerHTML = '<div class="ib-ctx-card">' +
        '<div class="ib-ctx-head">' + avatarHtml({ kind: 'neg', title: n.marca, raw: n }) + '<div class="ib-ctx-name">' + esc(n.marca || '—') + '</div></div>' +
        '<div class="ib-ctx-label">Oportunidade</div>' +
        '<div class="ib-ctx-title">' + esc(n.opp || 'Negociação') + '</div>' +
        '<div class="ib-ctx-row"><span>Status</span><b>' + esc(n.statusLabel || n.status || '—') + '</b></div>' +
        (n.valor ? '<div class="ib-ctx-row"><span>Valor</span><b>' + esc(n.valor) + '</b></div>' : '') +
        '<button class="ib-ctx-btn" data-act="openfull">Abrir negociação completa</button>' +
      '</div>';
      wrap.classList.add('ib-has-context');
      if (typeof applyBrandfetchLogos === 'function') applyBrandfetchLogos(ctx);
    } else { ctx.innerHTML = ''; wrap.classList.remove('ib-has-context'); }
  }

  function threadHeader(title, sub, extraRight) {
    return '<div class="ib-thead">' +
      '<button class="ib-back" data-act="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<div class="ib-thead-main"><div class="ib-thead-title">' + esc(title) + '</div>' + (sub ? '<div class="ib-thead-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (extraRight || '') +
    '</div>';
  }
  function bubbles(list) {
    return list.map(function (m) {
      return '<div class="ib-row ' + (m._mine ? 'ib-row-me' : 'ib-row-them') + '">' +
        (m._who ? '<div class="ib-who">' + esc(m._who) + '</div>' : '') +
        '<div class="ib-bubble ' + (m._mine ? 'ib-b-me' : 'ib-b-them') + '">' + esc(m._text) + (m._img ? '<img class="ib-img" src="' + m._img + '" data-act="img">' : '') + '</div>' +
        '<div class="ib-time">' + esc(m._time) + '</div>' +
      '</div>';
    }).join('');
  }
  function composer(id, attach) {
    return '<div class="ib-composer">' +
      (attach ? attachBtn() : '') +
      '<textarea id="' + id + '" class="ib-ta" maxlength="800" placeholder="Escreva uma mensagem..."></textarea>' +
      '<button class="ib-send" data-act="send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
    '</div>';
  }

  function renderSupThread(host) {
    var t = S.sup.find(function (x) { return x.id === S.open.id; }) || {};
    var c = CAT[t.categoria] || CAT['outro'];
    var rows = S.supThread.map(function (m) { return { _who: m.autor_papel === 'cliente' ? 'Você' : (m.autor_nome ? m.autor_nome + ' · Radar' : 'Equipe Radar'), _text: m.texto, _img: m.anexo_url || null, _time: fmtMsg(m.created_at), _mine: m.autor_papel === 'cliente' }; });
    host.innerHTML = threadHeader('Radar · ' + c.label, t.assunto || '', '<span class="ib-thead-st" style="color:' + c.color + '">' + (SUP_STATUS[t.status] || t.status || '') + '</span>') +
      '<div class="ib-scroll" id="ibScroll">' + bubbles(rows) + '</div>' + composer('ibReply', true);
    scrollDown();
  }
  function renderNegThread(host) {
    var n = negList().find(function (x) { return x.id === S.open.id; }) || {};
    var rows = (n.thread || []).map(function (m) { return { _who: m.autor === ROLE ? 'Você' : (m.nome || ''), _text: m.texto, _time: m.data || '', _mine: m.autor === ROLE }; });
    var openBtn = '<button class="ib-openfull" data-act="openfull">Abrir negociação <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>';
    host.innerHTML = threadHeader(n.marca || 'Negociação', n.opp || '', openBtn) +
      '<div class="ib-scroll" id="ibScroll">' + bubbles(rows) + '</div>' + composer('ibReply');
    scrollDown();
  }
  function renderNew(host) {
    var pills = SHORTCUTS.map(function (s, i) { var c = CAT[s.cat], on = S.newShortcut === i; return '<button class="ib-sc' + (on ? ' ib-sc-on' : '') + '" data-act="sc" data-i="' + i + '" style="' + (on ? 'border-color:' + c.color + ';color:' + c.color : '') + '">' + esc(s.label) + '</button>'; }).join('');
    host.innerHTML = threadHeader('Nova conversa', 'com o time do Radar', '') +
      '<div class="ib-new">' +
        '<div class="ib-greet">Como o Radar pode ajudar? Escolha um assunto ou escreva.</div>' +
        '<div class="ib-scs">' + pills + '</div>' +
        '<textarea id="ibNewText" class="ib-ta ib-ta-tall" maxlength="800" placeholder="Faça uma pergunta ou descreva..."></textarea>' +
        '<div class="ib-new-foot"' + (attachBtn() ? ' style="justify-content:space-between"' : '') + '>' + attachBtn() + '<button class="ib-sendbtn" data-act="send-new">Enviar</button></div>' +
      '</div>';
    var ta = document.getElementById('ibNewText'); if (ta) { ta.value = S.draft || ''; ta.focus(); }
  }
  function scrollDown() { var s = document.getElementById('ibScroll'); if (s) s.scrollTop = s.scrollHeight; }
  function setMobileThread(on) { var w = document.querySelector('.ib-wrap'); if (w) w.classList.toggle('ib-show-thread', on); document.body.classList.toggle('ib-thread-fs', on); }

  // ── Abrir conversa (na página) ──────────────────────────────
  async function openConvo(kind, id) {
    S.open = { kind: kind, id: id };
    setMobileThread(true);
    if (kind === 'sup') {
      var t = await getValidToken();
      var tk = S.sup.find(function (x) { return x.id === id; });
      if (tk && tk.cliente_viu === false && t) { tk.cliente_viu = true; setSidebarBadge(); renderList(); fetch(SUPABASE_URL + '/rest/v1/radar_tickets?id=eq.' + id, { method: 'PATCH', headers: H(t, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify({ cliente_viu: true }) }).catch(function () {}); }
      S.supThread = []; renderThread();
      if (t) { try { var r = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens?select=*&ticket_id=eq.' + id + '&order=created_at.asc', { headers: H(t) }); S.supThread = r.ok ? await r.json() : []; } catch (e) {} }
      initSupRealtime(id); renderThread(); renderList();
    } else {
      var n = negList().find(function (x) { return x.id === id; });
      renderThread(); renderList();
      if (n && n._supaId) { await refetchNegThread(n); renderThread(); }
      initNegRealtime(n);
    }
  }
  async function refetchNegThread(n) {
    var t = await getValidToken();
    if (!t || !n._supaId) return;
    try { var r = await fetch(SUPABASE_URL + '/rest/v1/mensagens?select=autor_role,autor_nome,texto,created_at&negociacao_id=eq.' + n._supaId + '&order=created_at.asc', { headers: H(t) }); if (r.ok) { var rows = await r.json(); n.thread = rows.map(function (m) { return { autor: m.autor_role || 'marca', nome: m.autor_nome || '', texto: m.texto || '', data: fmtMsg(m.created_at), ts: m.created_at }; }); } } catch (e) {}
  }

  // ── Enviar ──────────────────────────────────────────────────
  async function pushNegMessage(n, txt) {
    var who = nome();
    n.thread = n.thread || [];
    n.thread.push({ autor: ROLE, nome: who, texto: txt, data: fmtNow(), ts: new Date().toISOString() });
    if (n._supaId && typeof sendMensagem === 'function') { var uid = await getAuthUserId(); sendMensagem({ negociacao_id: n._supaId, autor_id: uid || n[ROLE + '_id'], autor_role: ROLE, autor_nome: who, texto: txt }); }
  }
  async function sendSup() {
    var el = document.getElementById('ibReply'); var txt = el ? el.value.trim() : '';
    if ((!txt && !_ibAttach) || !S.open || S.open.kind !== 'sup') return;
    var t = await getValidToken(); var uid = await getAuthUserId();
    if (!t || !uid) { alert('Sessão expirada. Recarregue a página.'); return; }
    el.disabled = true;
    try {
      var anexo = _ibAttach ? await _ibUpload(uid, t) : null;
      var res = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens', { method: 'POST', headers: H(t, { 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify({ ticket_id: S.open.id, autor_id: uid, autor_papel: 'cliente', autor_nome: nome(), texto: txt, anexo_url: anexo }) });
      if (!res.ok) throw new Error(); var m = (await res.json())[0]; if (!S.supThread.find(function (x) { return x.id === m.id; })) S.supThread.push(m);
      el.value = ''; _ibAttach = null; _ibMarkAttach(false); renderThread();
    } catch (e) { alert('Não foi possível enviar.'); } finally { if (el) el.disabled = false; }
  }
  async function sendNeg() {
    var el = document.getElementById('ibReply'); var txt = el ? el.value.trim() : '';
    if (!txt || !S.open || S.open.kind !== 'neg') return;
    var n = negList().find(function (x) { return x.id === S.open.id; }); if (!n) return;
    el.value = ''; await pushNegMessage(n, txt); renderThread(); renderList();
  }
  async function sendNew() {
    var ta = document.getElementById('ibNewText'); var txt = ta ? ta.value.trim() : '';
    if (!txt && !_ibAttach) return;
    var t = await getValidToken(); var uid = await getAuthUserId();
    if (!t || !uid) { alert('Sessão expirada. Recarregue a página.'); return; }
    try {
      var anexo = _ibAttach ? await _ibUpload(uid, t) : null;
      var tRes = await fetch(SUPABASE_URL + '/rest/v1/radar_tickets', { method: 'POST', headers: H(t, { 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify({ autor_id: uid, autor_tipo: ROLE, categoria: S.newCat, prioridade: 'media', status: 'recebido', assunto: ((S.newTag || '') + (txt || 'Anexo')).substring(0, 80) }) });
      if (!tRes.ok) throw new Error(); var ticket = (await tRes.json())[0];
      var mRes = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens', { method: 'POST', headers: H(t, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify({ ticket_id: ticket.id, autor_id: uid, autor_papel: 'cliente', autor_nome: nome(), texto: txt, anexo_url: anexo }) });
      if (!mRes.ok) throw new Error();
      S.draft = ''; S.newShortcut = null; _ibAttach = null; _ibMarkAttach(false); await loadSupport(); openConvo('sup', ticket.id);
    } catch (e) { alert('Não foi possível enviar.'); }
  }

  // ── Eventos ─────────────────────────────────────────────────
  function onFilterClick(e) { var b = e.target.closest('[data-filter]'); if (!b) return; S.filter = b.dataset.filter; renderFilters(); renderList(); }
  function onListClick(e) { var b = e.target.closest('[data-kind]'); if (!b) return; openConvo(b.dataset.kind, b.dataset.id); }
  function onThreadClick(e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.dataset.act;
    if (act === 'back') { S.open = null; teardownThreadRT(); setMobileThread(false); renderThread(); renderList(); return; }
    if (act === 'send') { return S.open && S.open.kind === 'sup' ? sendSup() : sendNeg(); }
    if (act === 'send-new') return sendNew();
    if (act === 'attach') { _ibFileInput().click(); return; }
    if (act === 'sc') { var ta = document.getElementById('ibNewText'); if (ta) S.draft = ta.value; var i = +el.dataset.i; S.newShortcut = i; S.newCat = SHORTCUTS[i].cat; S.newTag = SHORTCUTS[i].tag || ''; return renderThread(); }
    if (act === 'openfull') { if (S.open && S.open.kind === 'neg') openNegFull(S.open.id); return; }
    if (act === 'img') { window.open(el.src); return; }
  }

  // ── Realtime (página) ───────────────────────────────────────
  function teardownThreadRT() { if (S.negMsgCh && sb) { sb.removeChannel(S.negMsgCh); S.negMsgCh = null; } if (S.supCh && sb) { sb.removeChannel(S.supCh); S.supCh = null; } }
  function initSupRealtime(ticketId) {
    if (typeof sb === 'undefined' || !sb) return; if (S.supCh) { sb.removeChannel(S.supCh); S.supCh = null; }
    S.supCh = sb.channel('ib-sup-' + ticketId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radar_mensagens', filter: 'ticket_id=eq.' + ticketId }, function (p) { var m = p.new; if (S.supThread.find(function (x) { return x.id === m.id; })) return; S.supThread.push(m); if (S.open && S.open.kind === 'sup' && S.open.id === ticketId) renderThread(); }).subscribe();
  }
  function initNegRealtime(n) {
    if (typeof sb === 'undefined' || !sb || !n || !n._supaId) return; if (S.negMsgCh) { sb.removeChannel(S.negMsgCh); S.negMsgCh = null; }
    S.negMsgCh = sb.channel('ib-neg-' + n._supaId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'negociacao_id=eq.' + n._supaId }, function (p) { var r = p.new; if (r.autor_role === ROLE) return; n.thread = n.thread || []; n.thread.push({ autor: r.autor_role, nome: r.autor_nome, texto: r.texto, data: fmtMsg(r.created_at), ts: r.created_at }); if (S.open && S.open.kind === 'neg' && S.open.id === n.id) renderThread(); renderList(); }).subscribe();
  }
  async function initSupListRealtime() {
    if (typeof sb === 'undefined' || !sb) return; var uid = await getAuthUserId(); if (!uid) return;
    sb.channel('ib-suplist-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'radar_tickets', filter: 'autor_id=eq.' + uid }, function () { loadSupport().then(function () { renderList(); }); }).subscribe();
  }

  // ── Popup de conversa (negociação, por cima do modal) ───────
  function buildPopup() {
    if (document.getElementById('ibPop')) return;
    var ov = document.createElement('div'); ov.id = 'ibPop'; ov.className = 'ibpop-ov';
    ov.innerHTML = '<div class="ibpop" role="dialog" aria-modal="true">' +
      '<div class="ibpop-head"><span id="ibpAvWrap" class="ibpop-avwrap"></span><div class="ibpop-h-main"><div class="ibpop-h-title" id="ibpTitle"></div><div class="ibpop-h-sub" id="ibpSub"></div></div>' +
        '<button class="ibpop-close" id="ibpClose" aria-label="Fechar">&times;</button></div>' +
      '<div class="ib-scroll ibpop-scroll" id="ibpScroll"></div>' +
      '<div class="ib-composer"><textarea id="ibpReply" class="ib-ta" maxlength="800" placeholder="Escreva uma mensagem..."></textarea>' +
        '<button class="ib-send" id="ibpSend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closePopup(); });
    ov.querySelector('#ibpClose').addEventListener('click', closePopup);
    ov.querySelector('#ibpSend').addEventListener('click', popupSend);
    ov.querySelector('#ibpReply').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); popupSend(); } });
    ov.querySelector('#ibpScroll').addEventListener('click', function (e) { var i = e.target.closest('[data-act="img"]'); if (i) window.open(i.src); });
  }
  function renderPopupThread() {
    var el = document.getElementById('ibpScroll'); if (!el || !P.neg) return;
    var rows = (P.neg.thread || []).map(function (m) { return { _who: m.autor === ROLE ? 'Você' : (m.nome || ''), _text: m.texto, _time: m.data || '', _mine: m.autor === ROLE }; });
    el.innerHTML = bubbles(rows); el.scrollTop = el.scrollHeight;
  }
  async function openNegPopup(localId) {
    injectCSS(); buildPopup();
    var n = negList().find(function (x) { return x.id === localId; }); if (!n) return;
    P.neg = n; P.open = true;
    document.getElementById('ibpTitle').textContent = n.marca || 'Negociação';
    document.getElementById('ibpSub').textContent = n.opp || '';
    var aw = document.getElementById('ibpAvWrap'); if (aw) { aw.innerHTML = avatarHtml({ kind: 'neg', title: n.marca, raw: n }); if (typeof applyBrandfetchLogos === 'function') applyBrandfetchLogos(aw); }
    document.getElementById('ibPop').classList.add('ibpop-show');
    renderPopupThread();
    if (n._supaId) { await refetchNegThread(n); renderPopupThread(); }
    initPopupRT(n);
  }
  async function popupSend() {
    var el = document.getElementById('ibpReply'); var txt = el ? el.value.trim() : '';
    if (!txt || !P.neg) return; el.value = '';
    await pushNegMessage(P.neg, txt);
    renderPopupThread();
    if (S.open && S.open.kind === 'neg' && S.open.id === P.neg.id) renderThread();
    renderList();
  }
  function closePopup() { P.open = false; var o = document.getElementById('ibPop'); if (o) o.classList.remove('ibpop-show'); if (P.ch && sb) { sb.removeChannel(P.ch); P.ch = null; } }
  function initPopupRT(n) {
    if (typeof sb === 'undefined' || !sb || !n._supaId) return; if (P.ch) { sb.removeChannel(P.ch); P.ch = null; }
    P.ch = sb.channel('ibpop-' + n._supaId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'negociacao_id=eq.' + n._supaId }, function (p) { var r = p.new; if (r.autor_role === ROLE) return; n.thread = n.thread || []; n.thread.push({ autor: r.autor_role, nome: r.autor_nome, texto: r.texto, data: fmtMsg(r.created_at), ts: r.created_at }); if (P.open && P.neg && P.neg.id === n.id) renderPopupThread(); renderList(); }).subscribe();
  }

  function refresh() { ensureNegLoaded(); loadSupport().then(function () { render(); }); }

  // ── CSS ─────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('ibStyle')) return;
    var css = '' +
      '.ib-wrap{display:grid;grid-template-columns:330px 1fr;gap:16px;align-items:stretch;height:calc(100vh - 230px);min-height:460px}' +
      '.ib-wrap.ib-has-context{grid-template-columns:300px 1fr 270px}' +
      '.ib-listcol{display:flex;flex-direction:column;background:var(--white,#fff);border:1px solid var(--gray-200,#ece7dd);border-radius:var(--radius-lg,16px);overflow:hidden}' +
      '.ib-filters{display:flex;gap:6px;flex-wrap:wrap;padding:12px;border-bottom:1px solid var(--gray-200,#ece7dd)}' +
      '.ib-fpill{padding:5px 11px;border-radius:100px;border:1.5px solid var(--gray-200,#ece7dd);background:var(--white,#fff);font-family:inherit;font-size:12px;color:var(--gray-500,#7a6a58);cursor:pointer;white-space:nowrap}' +
      '.ib-fpill-on{background:var(--black,#15110c);color:#fff;border-color:var(--black,#15110c);font-weight:600}' +
      '.ib-newbtn{margin:12px;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;border:none;background:var(--gold,#B8860B);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}' +
      '.ib-newbtn svg{width:15px;height:15px}' +
      '.ib-list{flex:1;overflow-y:auto;padding:0 8px 10px}' +
      '.ib-empty{padding:40px 16px;text-align:center;color:var(--gray-400,#9b8f7e);font-size:13px}' +
      '.ib-item{width:100%;text-align:left;display:flex;gap:10px;padding:11px;border:none;border-radius:12px;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:2px}' +
      '.ib-item:hover,.ib-item-on{background:var(--gray-100,#faf8f4)}' +
      '.ib-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}' +
      '.ib-av-logo{background:var(--white,#fff);border:1px solid var(--gray-200,#ece7dd);color:var(--gray-500,#7a6a58);overflow:hidden}' +
      '.ib-av-logo img{width:100%;height:100%;object-fit:contain;border-radius:50%}' +
      '.ib-ctx-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.ib-ctx-head .ib-av{width:42px;height:42px}' +
      '.ib-ctx-name{font-weight:700;font-size:14px;color:var(--text,#221c14);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ibpop-avwrap{flex-shrink:0;display:flex}' +
      '.ib-item-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.ib-item-top{display:flex;align-items:center;gap:8px}' +
      '.ib-item-title{font-weight:700;font-size:13px;color:var(--text,#221c14);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ib-item-date{font-size:11px;color:var(--gray-400,#9b8f7e);flex-shrink:0}' +
      '.ib-item-sub{font-size:12px;color:var(--gray-500,#7a6a58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ib-item-foot{display:flex;align-items:center;gap:6px;margin-top:2px}' +
      '.ib-tag{font-size:10px;font-weight:700;padding:1px 7px;border-radius:100px}' +
      '.ib-tag-sup{background:rgba(184,134,11,.12);color:#92670a}.ib-tag-neg{background:rgba(59,130,246,.12);color:#2563eb}' +
      '.ib-st{font-size:10px;color:var(--gray-400,#9b8f7e)}' +
      '.ib-unread{width:8px;height:8px;border-radius:50%;background:#EF4444;margin-left:auto}' +
      '.ib-threadcol{display:flex;flex-direction:column;background:var(--white,#fff);border:1px solid var(--gray-200,#ece7dd);border-radius:var(--radius-lg,16px);overflow:hidden}' +
      '.ib-thread-host{flex:1;display:flex;flex-direction:column;min-height:0}' +
      '.ib-placeholder{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--gray-400,#9b8f7e);text-align:center;font-size:14px}.ib-ph-ic{font-size:38px}' +
      '.ib-thead{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--gray-200,#ece7dd);flex-shrink:0}' +
      '.ib-back{display:none;background:var(--gray-100,#faf8f4);border:none;width:30px;height:30px;border-radius:8px;cursor:pointer;align-items:center;justify-content:center;flex-shrink:0}.ib-back svg{width:16px;height:16px}' +
      '.ib-thead-main{flex:1;min-width:0}.ib-thead-title{font-weight:700;font-size:14px;color:var(--text,#221c14);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ib-thead-sub{font-size:12px;color:var(--gray-500,#7a6a58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ib-thead-st{font-size:12px;font-weight:700;flex-shrink:0}' +
      '.ib-openfull{display:inline-flex;align-items:center;gap:4px;padding:7px 12px;border-radius:100px;border:1.5px solid var(--gray-200,#ece7dd);background:var(--white,#fff);font-family:inherit;font-size:12px;font-weight:600;color:var(--text,#221c14);cursor:pointer;flex-shrink:0}.ib-openfull svg{width:13px;height:13px}' +
      '.ib-scroll{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--gray-100,#faf8f4)}' +
      '.ib-row{display:flex;flex-direction:column;gap:3px}.ib-row-me{align-items:flex-end}.ib-row-them{align-items:flex-start}' +
      '.ib-who{font-size:11px;color:var(--gray-400,#9b8f7e);padding:0 4px}' +
      '.ib-bubble{max-width:74%;padding:10px 14px;border-radius:15px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}' +
      '.ib-b-me{background:var(--black,#15110c);color:#fff;border-bottom-right-radius:5px}' +
      '.ib-b-them{background:var(--white,#fff);border:1px solid var(--gray-200,#ece7dd);color:var(--text,#221c14);border-bottom-left-radius:5px}' +
      '.ib-img{display:block;margin-top:8px;max-width:180px;border-radius:8px;cursor:pointer}' +
      '.ib-time{font-size:10px;color:var(--gray-400,#bbb);padding:0 4px}' +
      '.ib-composer{display:flex;gap:8px;align-items:flex-end;padding:12px;border-top:1px solid var(--gray-200,#ece7dd);flex-shrink:0;background:var(--white,#fff)}' +
      '.ib-ta{flex:1;min-height:44px;max-height:120px;padding:10px 14px;border:1.5px solid var(--gray-200,#ece7dd);border-radius:12px;font-family:inherit;font-size:13px;color:var(--text,#221c14);resize:vertical;outline:none;box-sizing:border-box;line-height:1.5;background:var(--white,#fff)}.ib-ta:focus{border-color:var(--gold,#B8860B)}' +
      '.ib-send{width:44px;height:44px;border-radius:50%;border:none;background:var(--gold,#B8860B);color:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}.ib-send svg{width:17px;height:17px}' +
      '.ib-attach-btn{width:40px;height:44px;border:none;background:none;color:var(--gray-400,#9b8f7e);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:10px}.ib-attach-btn:hover{background:var(--gray-100,#faf8f4);color:var(--gray-500,#7a6a58)}.ib-attach-on{color:var(--gold,#B8860B)}' +
      '.ib-new{flex:1;display:flex;flex-direction:column;gap:10px;padding:16px;overflow-y:auto}' +
      '.ib-greet{font-size:13px;color:var(--gray-500,#7a6a58)}' +
      '.ib-scs{display:flex;flex-direction:column;gap:8px}' +
      '.ib-sc{text-align:left;padding:11px 14px;border-radius:12px;border:1.5px solid var(--gray-200,#ece7dd);background:var(--white,#fff);font-family:inherit;font-size:13px;color:var(--text,#221c14);cursor:pointer}.ib-sc-on{font-weight:700}' +
      '.ib-ta-tall{min-height:120px;flex:1}' +
      '.ib-new-foot{display:flex;justify-content:flex-end}' +
      '.ib-sendbtn{padding:10px 22px;border-radius:100px;border:none;background:var(--gold,#B8860B);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}' +
      '.ib-contextcol{display:none}' +
      '.ib-wrap.ib-has-context .ib-contextcol{display:block;background:var(--white,#fff);border:1px solid var(--gray-200,#ece7dd);border-radius:var(--radius-lg,16px);padding:18px;overflow-y:auto}' +
      '.ib-ctx-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gray-400,#9b8f7e);margin-bottom:6px}' +
      '.ib-ctx-title{font-weight:700;font-size:15px;color:var(--text,#221c14);margin-bottom:14px;line-height:1.3}' +
      '.ib-ctx-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:9px 0;border-top:1px solid var(--gray-100,#faf8f4)}' +
      '.ib-ctx-row span{color:var(--gray-500,#7a6a58)}.ib-ctx-row b{color:var(--text,#221c14);text-align:right}' +
      '.ib-ctx-btn{width:100%;margin-top:16px;padding:11px;border-radius:12px;border:none;background:var(--black,#15110c);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}' +
      '.ibpop-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10050;display:none;align-items:center;justify-content:center;padding:20px}' +
      '.ibpop-ov.ibpop-show{display:flex}' +
      '.ibpop{width:440px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 60px);background:var(--white,#fff);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:var(--font-body,inherit)}' +
      '.ibpop-head{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--gray-200,#ece7dd);flex-shrink:0}' +
      '.ibpop-h-main{flex:1;min-width:0}.ibpop-h-title{font-weight:700;font-size:15px;color:var(--text,#221c14);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ibpop-h-sub{font-size:12px;color:var(--gray-500,#7a6a58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ibpop-openfull{padding:7px 12px;border-radius:100px;border:1.5px solid var(--gray-200,#ece7dd);background:var(--white,#fff);font-family:inherit;font-size:12px;font-weight:600;color:var(--text,#221c14);cursor:pointer;flex-shrink:0}' +
      '.ibpop-close{background:none;border:none;font-size:22px;line-height:1;color:var(--gray-400,#9b8f7e);cursor:pointer;width:28px;height:28px;flex-shrink:0}' +
      '@media(max-width:560px){.ibpop-ov{padding:10px}.ibpop{width:100%;max-width:calc(100vw - 20px);height:calc(100vh - 28px);max-height:none;border-radius:14px}.ibpop-openfull{padding:6px 10px;font-size:11px}}' +
      '@media(max-width:1100px){.ib-wrap.ib-has-context{grid-template-columns:320px 1fr}.ib-wrap.ib-has-context .ib-contextcol{display:none}}' +
      '@media(max-width:820px){.ib-wrap,.ib-wrap.ib-has-context{grid-template-columns:1fr;height:auto;min-height:0}.ib-threadcol{display:none}.ib-back{display:flex}.ib-wrap.ib-show-thread .ib-listcol{display:none}.ib-wrap.ib-show-thread .ib-threadcol{display:flex;position:fixed;inset:0;z-index:9990;border-radius:0;min-height:0;height:100vh;height:100dvh}body.ib-thread-fs #rcFab{display:none!important}}';
    var st = document.createElement('style'); st.id = 'ibStyle'; st.textContent = css; document.head.appendChild(st);
  }

  // Abre uma conversa DENTRO do inbox (sem popup) — usado quando o usuário já
  // está na página de Mensagens e clica no atalho do modal de negociação.
  function openInbox(kind, id) { if (!S.mounted) render(); openConvo(kind, id); }

  // expõe API cedo (o atalho do modal pode chamar antes do inbox montar)
  window.RadarInbox = { refresh: refresh, openNeg: openNegPopup, openInbox: openInbox };

  ready(function () {
    if (typeof SUPABASE_URL === 'undefined') return;
    injectCSS();
    if (document.getElementById('vozInboxRoot')) {
      render(); ensureNegLoaded(); loadSupport().then(function () { render(); }); loadPodeAnexar(); initSupListRealtime();
      S.refreshTimer = setInterval(function () { var sec = document.getElementById('sec-voz'); if (sec && sec.classList.contains('active')) { renderList(); setSidebarBadge(); } }, 12000);
    }
  });
})();
