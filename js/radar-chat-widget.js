/* ─────────────────────────────────────────────────────────────
   Radar Chat Widget — "Fale com o Radar" flutuante (cliente ↔ Relevantia)
   Popup ancorado no canto inferior direito (estilo Intercom/Santander).
   Autossuficiente: cache + realtime + render próprios.
   Depende apenas de globais já carregados por core.js/sanitize.js:
     getValidToken, getAuthUserId, getCurrentRole, SUPABASE_URL,
     SUPABASE_KEY, sb (supabase-js v2), escapeHtml.
   NÃO altera o banco — usa radar_tickets / radar_mensagens / Storage.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s == null ? '' : String(s));
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var PORTAL = (typeof getCurrentRole === 'function' && getCurrentRole() === 'rightsholder') ? 'detentor' : 'marca';

  var CAT = {
    'bug':          { label: 'Bug / Erro',   color: '#EF4444' },
    'melhoria':     { label: 'Melhoria',     color: '#3B82F6' },
    'nova-feature': { label: 'Nova feature', color: '#B8860B' },
    'duvida':       { label: 'Dúvida',       color: '#8B5CF6' },
    'outro':        { label: 'Outro',        color: '#6B7280' }
  };
  var STATUS = {
    'recebido':   { label: 'Recebido',    color: '#6B7280' },
    'analise':    { label: 'Em análise',  color: '#B8860B' },
    'respondido': { label: 'Respondido',  color: '#3B82F6' },
    'planejado':  { label: 'Planejado',   color: '#3B82F6' },
    'resolvido':  { label: 'Resolvido',   color: '#16A34A' },
    'entregue':   { label: 'Entregue',    color: '#16A34A' }
  };

  // Atalhos da tela de boas-vindas (estilo Santander) → já abrem na categoria certa
  var SHORTCUTS = [
    { label: 'Tô com um problema técnico',          cat: 'bug',      tag: '' },
    { label: 'Tenho uma dúvida',                    cat: 'duvida',   tag: '' },
    { label: 'Falar sobre uma proposta/negociação', cat: 'duvida',   tag: '[Proposta] ' },
    { label: 'Quero dar uma sugestão',              cat: 'melhoria', tag: '' }
  ];
  var RADAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  var S = {
    tickets: [], openId: null, msgs: [],
    view: 'list', open: false, cat: 'duvida', tag: '', img: null,
    draft: '', shortcutIdx: null,
    ticketsCh: null, threadCh: null, rtOn: false, loaded: false
  };

  function H(token, extra) {
    return Object.assign({ apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token }, extra || {});
  }

  // ── Dados ───────────────────────────────────────────────────
  async function loadTickets() {
    var token = await getValidToken();
    if (!token) return;
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/radar_tickets?select=*&order=last_message_at.desc', { headers: H(token) });
      S.tickets = res.ok ? await res.json() : [];
      S.loaded = true;
    } catch (e) { S.tickets = []; }
    setBadge();
    if (S.open && S.view === 'list') render();
  }

  function unread() { return S.tickets.filter(function (t) { return t.cliente_viu === false; }).length; }

  async function openTicket(id) {
    S.openId = id; S.view = 'thread';
    var token = await getValidToken();
    if (!token) return;
    var t = S.tickets.find(function (x) { return x.id === id; });
    if (t && t.cliente_viu === false) {
      t.cliente_viu = true; setBadge();
      fetch(SUPABASE_URL + '/rest/v1/radar_tickets?id=eq.' + id, {
        method: 'PATCH', headers: H(token, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ cliente_viu: true })
      }).catch(function () {});
    }
    render();
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens?select=*&ticket_id=eq.' + id + '&order=created_at.asc', { headers: H(token) });
      S.msgs = res.ok ? await res.json() : [];
    } catch (e) { S.msgs = []; }
    render();
    initThreadRT(id);
  }

  async function sendNew() {
    var ta = document.getElementById('rcNewText');
    var texto = ta ? ta.value.trim() : '';
    if (!texto) return;
    if (texto.length > 800) texto = texto.substring(0, 800);
    var token = await getValidToken();
    var uid = await getAuthUserId();
    if (!token || !uid) { alert('Sessão expirada. Recarregue a página.'); return; }
    var btn = document.getElementById('rcNewSend'); if (btn) btn.disabled = true;
    try {
      var anexo = null;
      if (S.img) anexo = await uploadAnexo(uid, token);
      var nome = nomeCliente();
      var tRes = await fetch(SUPABASE_URL + '/rest/v1/radar_tickets', {
        method: 'POST', headers: H(token, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify({ autor_id: uid, autor_tipo: PORTAL, categoria: S.cat, prioridade: 'media', status: 'recebido', assunto: ((S.tag || '') + texto).substring(0, 80) })
      });
      if (!tRes.ok) throw new Error();
      var ticket = (await tRes.json())[0];
      var mRes = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens', {
        method: 'POST', headers: H(token, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ ticket_id: ticket.id, autor_id: uid, autor_papel: 'cliente', autor_nome: nome, texto: texto, anexo_url: anexo })
      });
      if (!mRes.ok) throw new Error();
      S.img = null; S.draft = ''; S.shortcutIdx = null; S.tag = '';
      await loadTickets();
      openTicket(ticket.id);
    } catch (e) { alert('Não foi possível enviar. Tente novamente.'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function sendReply() {
    var el = document.getElementById('rcReply');
    var texto = el ? el.value.trim() : '';
    if (!texto || !S.openId) return;
    var token = await getValidToken();
    var uid = await getAuthUserId();
    if (!token || !uid) { alert('Sessão expirada. Recarregue a página.'); return; }
    if (el) el.disabled = true;
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/radar_mensagens', {
        method: 'POST', headers: H(token, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify({ ticket_id: S.openId, autor_id: uid, autor_papel: 'cliente', autor_nome: nomeCliente(), texto: texto })
      });
      if (!res.ok) throw new Error();
      var m = (await res.json())[0];
      if (!S.msgs.find(function (x) { return x.id === m.id; })) S.msgs.push(m);
      if (el) el.value = '';
      render();
    } catch (e) { alert('Não foi possível enviar.'); }
    finally { if (el) el.disabled = false; }
  }

  async function uploadAnexo(uid, token) {
    try {
      var m = /^data:(.+?);base64,(.*)$/.exec(S.img || '');
      if (!m) return null;
      var mime = m[1], bin = atob(m[2]), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
      var path = uid + '/' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '.' + ext;
      var up = await fetch(SUPABASE_URL + '/storage/v1/object/radar-anexos/' + path, {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': mime }, body: bytes
      });
      if (!up.ok) return null;
      return SUPABASE_URL + '/storage/v1/object/public/radar-anexos/' + path;
    } catch (e) { return null; }
  }

  function nomeCliente() {
    var el = document.getElementById('sidebarName');
    return el && el.textContent ? el.textContent.trim() : 'Usuário';
  }

  // ── Realtime ────────────────────────────────────────────────
  async function initRT() {
    if (S.rtOn || typeof sb === 'undefined' || !sb) return;
    var uid = await getAuthUserId();
    if (!uid) return;
    S.rtOn = true;
    S.ticketsCh = sb.channel('rc-tickets-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radar_tickets', filter: 'autor_id=eq.' + uid }, function () { loadTickets(); })
      .subscribe();
  }
  function initThreadRT(id) {
    if (typeof sb === 'undefined' || !sb) return;
    if (S.threadCh) { sb.removeChannel(S.threadCh); S.threadCh = null; }
    S.threadCh = sb.channel('rc-thread-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radar_mensagens', filter: 'ticket_id=eq.' + id }, function (payload) {
        var m = payload.new;
        if (S.msgs.find(function (x) { return x.id === m.id; })) return;
        S.msgs.push(m);
        if (S.openId === id && S.view === 'thread') render();
      })
      .subscribe();
  }

  // ── UI ──────────────────────────────────────────────────────
  function setBadge() {
    var n = unread();
    var b = document.getElementById('rcFabBadge');
    if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n > 0 ? 'flex' : 'none'; }
  }

  function togglePanel(force) {
    S.open = (typeof force === 'boolean') ? force : !S.open;
    var panel = document.getElementById('rcPanel');
    var fab = document.getElementById('rcFab');
    if (panel) panel.classList.toggle('rc-open', S.open);
    if (fab) fab.classList.toggle('rc-fab-active', S.open);
    if (S.open) {
      if (!S.loaded) {
        loadTickets().then(function () { if (S.open && !S.openId) { S.view = S.tickets.length ? 'list' : 'new'; render(); } });
      }
      if (!S.openId) S.view = S.loaded ? (S.tickets.length ? 'list' : 'new') : 'list';
      render();
    }
  }

  function render() {
    var body = document.getElementById('rcBody');
    if (!body) return;
    if (S.view === 'new') return renderNew(body);
    if (S.view === 'thread' && S.openId) return renderThread(body);
    return renderList(body);
  }

  function renderList(body) {
    setTitle('Fale com o Radar', false);
    var rows = S.tickets.map(function (t) {
      var c = CAT[t.categoria] || CAT['outro'];
      var st = STATUS[t.status] || STATUS['recebido'];
      var dt = new Date(t.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      var un = t.cliente_viu === false;
      return '<button class="rc-item" data-act="open" data-id="' + t.id + '">' +
        '<span class="rc-dot" style="background:' + c.color + '"></span>' +
        '<span class="rc-item-main">' +
          '<span class="rc-item-top"><span class="rc-cat" style="color:' + c.color + '">' + c.label + '</span>' +
            (un ? '<span class="rc-new-pill">nova resposta</span>' : '') +
            '<span class="rc-date">' + dt + '</span></span>' +
          '<span class="rc-assunto">' + esc(t.assunto || '(sem assunto)') + '</span>' +
          '<span class="rc-status" style="color:' + st.color + '">● ' + st.label + '</span>' +
        '</span></button>';
    }).join('');
    body.innerHTML =
      '<div class="rc-list-head"><button class="rc-newbtn" data-act="newview">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nova conversa</button></div>' +
      (S.tickets.length ? '<div class="rc-list">' + rows + '</div>'
        : '<div class="rc-empty"><div class="rc-empty-ic">💬</div><div class="rc-empty-t">Nenhuma conversa ainda</div><div class="rc-empty-s">Fale com o time do Radar — tire dúvidas, peça ajuda ou mande um feedback.</div></div>');
  }

  function renderNew(body) {
    setTitle('Nova conversa', true);
    var pills = SHORTCUTS.map(function (s, i) {
      var c = CAT[s.cat], on = S.shortcutIdx === i;
      return '<button class="rc-sc' + (on ? ' rc-sc-on' : '') + '" data-act="shortcut" data-i="' + i + '" style="' + (on ? 'border-color:' + c.color + ';color:' + c.color : '') + '">' + esc(s.label) + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="rc-new">' +
        '<div class="rc-greet"><div class="rc-greet-ic">' + RADAR_ICON + '</div><div><div class="rc-greet-t">Como o Radar pode ajudar?</div><div class="rc-greet-s">Escolha um assunto ou escreva sua mensagem.</div></div></div>' +
        '<div class="rc-scs">' + pills + '</div>' +
        '<textarea id="rcNewText" class="rc-ta" maxlength="800" placeholder="Faça uma pergunta ou descreva..."></textarea>' +
        '<div class="rc-new-foot">' +
          '<button class="rc-attach" data-act="attach" title="Anexar foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span id="rcNewImgName">Anexar foto</span></button>' +
          '<button class="rc-send" id="rcNewSend" data-act="send-new">Enviar</button>' +
        '</div>' +
      '</div>';
    var ta = document.getElementById('rcNewText');
    if (ta) { ta.value = S.draft || ''; ta.focus(); }
  }

  function renderThread(body) {
    var t = S.tickets.find(function (x) { return x.id === S.openId; }) || {};
    var c = CAT[t.categoria] || CAT['outro'];
    var st = STATUS[t.status] || STATUS['recebido'];
    setTitle((c.label) + ' · ' + st.label, true);
    var bubbles = S.msgs.map(function (m) {
      var mine = m.autor_papel === 'cliente';
      var dt = new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      var who = mine ? '' : (m.autor_nome ? m.autor_nome + ' · Radar' : 'Equipe Radar');
      return '<div class="rc-row ' + (mine ? 'rc-row-me' : 'rc-row-them') + '">' +
        (who ? '<div class="rc-who">' + esc(who) + '</div>' : '') +
        '<div class="rc-bubble ' + (mine ? 'rc-b-me' : 'rc-b-them') + '">' + esc(m.texto) +
          (m.anexo_url ? '<img class="rc-img" src="' + m.anexo_url + '" data-act="img">' : '') +
        '</div>' +
        '<div class="rc-time">' + dt + '</div>' +
      '</div>';
    }).join('');
    body.innerHTML =
      '<div id="rcScroll" class="rc-thread">' + bubbles + '</div>' +
      '<div class="rc-composer">' +
        '<textarea id="rcReply" class="rc-ta rc-ta-sm" maxlength="800" placeholder="Escreva uma resposta..."></textarea>' +
        '<button class="rc-send rc-send-ic" data-act="send-reply"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
      '</div>';
    var sc = document.getElementById('rcScroll');
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  function setTitle(txt, back) {
    var tt = document.getElementById('rcTitle');
    var bk = document.getElementById('rcBack');
    if (tt) tt.textContent = txt;
    if (bk) bk.style.display = back ? 'flex' : 'none';
  }

  function onImage(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Máximo 5 MB.'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      S.img = e.target.result;
      var n = document.getElementById('rcNewImgName');
      if (n) n.textContent = file.name.length > 18 ? file.name.substring(0, 16) + '…' : file.name;
    };
    reader.readAsDataURL(file);
  }

  function buildDom() {
    if (document.getElementById('rcFab')) return;

    var css = '' +
      '#rcFab{position:fixed;right:24px;bottom:24px;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;z-index:9998;background:var(--gold,#B8860B);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;transition:transform .18s,box-shadow .18s}' +
      '#rcFab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.28)}' +
      '#rcFab svg{width:26px;height:26px}' +
      '#rcFab .rc-ic-close{display:none}' +
      '#rcFab.rc-fab-active .rc-ic-open{display:none}' +
      '#rcFab.rc-fab-active .rc-ic-close{display:block}' +
      '#rcFabBadge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#EF4444;color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;border:2px solid #fff}' +
      '#rcPanel{position:fixed;right:24px;bottom:94px;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 130px);background:var(--white,#fff);border:1px solid var(--gray-200,#eee);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);z-index:9999;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s,transform .18s;font-family:var(--font-body,inherit)}' +
      '#rcPanel.rc-open{opacity:1;transform:none;pointer-events:auto}' +
      '.rc-head{display:flex;align-items:center;gap:10px;padding:16px 18px;background:var(--black,#15110c);color:#fff;flex-shrink:0}' +
      '.rc-head .rc-back{background:rgba(255,255,255,.12);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:none;align-items:center;justify-content:center;flex-shrink:0}' +
      '.rc-head .rc-back svg{width:15px;height:15px}' +
      '.rc-head .rc-title{font-weight:700;font-size:14px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.rc-head .rc-close{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:20px;line-height:1;width:26px;height:26px;border-radius:8px}' +
      '.rc-head .rc-close:hover{background:rgba(255,255,255,.12);color:#fff}' +
      '#rcBody{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--gray-100,#faf8f4)}' +
      '.rc-list-head{padding:12px;flex-shrink:0}' +
      '.rc-newbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;border:none;background:var(--gold,#B8860B);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}' +
      '.rc-newbtn svg{width:15px;height:15px}' +
      '.rc-list{flex:1;overflow-y:auto;padding:0 8px 12px}' +
      '.rc-item{width:100%;text-align:left;display:flex;gap:10px;padding:12px;background:var(--white,#fff);border:1px solid var(--gray-200,#eee);border-radius:12px;margin-bottom:8px;cursor:pointer;font-family:inherit}' +
      '.rc-item:hover{border-color:var(--gray-300,#ddd)}' +
      '.rc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}' +
      '.rc-item-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}' +
      '.rc-item-top{display:flex;align-items:center;gap:7px}' +
      '.rc-cat{font-size:12px;font-weight:700}' +
      '.rc-new-pill{font-size:10px;font-weight:700;color:#fff;background:#EF4444;border-radius:10px;padding:1px 7px}' +
      '.rc-date{margin-left:auto;font-size:11px;color:var(--gray-400,#999)}' +
      '.rc-assunto{font-size:13px;color:var(--text,#222);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.rc-status{font-size:11px;font-weight:600}' +
      '.rc-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;gap:6px}' +
      '.rc-empty-ic{font-size:34px}.rc-empty-t{font-weight:700;font-size:14px;color:var(--text,#222)}.rc-empty-s{font-size:12px;color:var(--gray-400,#999);max-width:230px;line-height:1.5}' +
      '.rc-new{flex:1;display:flex;flex-direction:column;padding:16px;gap:10px;overflow-y:auto}' +
      '.rc-label{font-size:12px;color:var(--gray-500,#777);font-weight:600}' +
      '.rc-chips{display:flex;flex-wrap:wrap;gap:6px}' +
      '.rc-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:100px;border:1.5px solid var(--gray-200,#eee);background:var(--white,#fff);font-family:inherit;font-size:12px;color:var(--gray-500,#777);cursor:pointer}' +
      '.rc-chip-on{font-weight:700}' +
      '.rc-greet{display:flex;align-items:flex-start;gap:10px;margin-bottom:2px}' +
      '.rc-greet-ic{width:34px;height:34px;border-radius:50%;background:var(--gold,#B8860B);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.rc-greet-ic svg{width:18px;height:18px}' +
      '.rc-greet-t{font-weight:700;font-size:14px;color:var(--text,#222)}' +
      '.rc-greet-s{font-size:12px;color:var(--gray-500,#777);line-height:1.4}' +
      '.rc-scs{display:flex;flex-direction:column;gap:8px;margin:2px 0 4px}' +
      '.rc-sc{text-align:left;padding:11px 14px;border-radius:12px;border:1.5px solid var(--gray-200,#eee);background:var(--white,#fff);font-family:inherit;font-size:13px;color:var(--text,#222);cursor:pointer;transition:border-color .15s}' +
      '.rc-sc:hover{border-color:var(--gray-300,#ddd)}' +
      '.rc-sc-on{font-weight:700}' +
      '.rc-ta{width:100%;border:1.5px solid var(--gray-200,#eee);border-radius:12px;padding:12px;font-family:inherit;font-size:13px;color:var(--text,#222);resize:none;outline:none;box-sizing:border-box;line-height:1.5;background:var(--white,#fff)}' +
      '.rc-ta:focus{border-color:var(--gold,#B8860B)}' +
      '.rc-new .rc-ta{flex:1;min-height:120px}' +
      '.rc-new-foot{display:flex;align-items:center;gap:10px}' +
      '.rc-attach{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:100px;border:1.5px solid var(--gray-200,#eee);background:var(--white,#fff);font-family:inherit;font-size:12px;color:var(--gray-500,#777);cursor:pointer}' +
      '.rc-attach svg{width:14px;height:14px}' +
      '.rc-send{margin-left:auto;padding:10px 20px;border-radius:100px;border:none;background:var(--gold,#B8860B);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}' +
      '.rc-send:disabled{opacity:.5}' +
      '.rc-thread{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}' +
      '.rc-row{display:flex;flex-direction:column;gap:3px}' +
      '.rc-row-me{align-items:flex-end}.rc-row-them{align-items:flex-start}' +
      '.rc-who{font-size:11px;color:var(--gray-400,#999);padding:0 4px}' +
      '.rc-bubble{max-width:82%;padding:10px 14px;border-radius:15px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}' +
      '.rc-b-me{background:var(--black,#15110c);color:#fff;border-bottom-right-radius:5px}' +
      '.rc-b-them{background:var(--white,#fff);border:1px solid var(--gray-200,#eee);color:var(--text,#222);border-bottom-left-radius:5px}' +
      '.rc-img{display:block;margin-top:8px;max-width:180px;border-radius:8px;cursor:pointer}' +
      '.rc-time{font-size:10px;color:var(--gray-400,#bbb);padding:0 4px}' +
      '.rc-composer{display:flex;gap:8px;align-items:flex-end;padding:12px;border-top:1px solid var(--gray-200,#eee);background:var(--white,#fff);flex-shrink:0}' +
      '.rc-ta-sm{min-height:42px;max-height:120px;resize:vertical}' +
      '.rc-send-ic{margin-left:0;padding:0;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.rc-send-ic svg{width:17px;height:17px}' +
      'body.admin-view-mode #rcFab,body.admin-view-mode #rcPanel{display:none!important}' +
      '@media(max-width:560px){#rcPanel{right:12px;left:12px;width:auto;bottom:86px;max-height:calc(100vh - 110px)}#rcFab{right:16px;bottom:80px}}';

    var style = document.createElement('style');
    style.id = 'rcStyle';
    style.textContent = css;
    document.head.appendChild(style);

    var fab = document.createElement('button');
    fab.id = 'rcFab';
    fab.setAttribute('aria-label', 'Fale com o Radar');
    fab.innerHTML =
      '<svg class="rc-ic-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<svg class="rc-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '<span id="rcFabBadge"></span>';
    fab.addEventListener('click', function () { togglePanel(); });

    var panel = document.createElement('div');
    panel.id = 'rcPanel';
    panel.innerHTML =
      '<div class="rc-head">' +
        '<button class="rc-back" id="rcBack" data-act="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>' +
        '<span class="rc-title" id="rcTitle">Fale com o Radar</span>' +
        '<button class="rc-close" data-act="close">&times;</button>' +
      '</div>' +
      '<div id="rcBody"></div>' +
      '<input type="file" id="rcFile" accept="image/*" style="display:none">';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    panel.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el) return;
      var act = el.dataset.act;
      if (act === 'close') return togglePanel(false);
      if (act === 'back') { S.openId = null; S.view = 'list'; if (S.threadCh && sb) { sb.removeChannel(S.threadCh); S.threadCh = null; } return render(); }
      if (act === 'newview') { S.view = 'new'; S.img = null; S.draft = ''; S.shortcutIdx = null; S.cat = 'duvida'; S.tag = ''; return render(); }
      if (act === 'open') return openTicket(el.dataset.id);
      if (act === 'shortcut') { var ta0 = document.getElementById('rcNewText'); if (ta0) S.draft = ta0.value; var i = +el.dataset.i; S.shortcutIdx = i; S.cat = SHORTCUTS[i].cat; S.tag = SHORTCUTS[i].tag || ''; return render(); }
      if (act === 'attach') { var f = document.getElementById('rcFile'); if (f) f.click(); return; }
      if (act === 'send-new') return sendNew();
      if (act === 'send-reply') return sendReply();
      if (act === 'img') { window.open(el.src); return; }
    });

    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return; // Shift/Ctrl/Cmd+Enter = quebra de linha
      var id = e.target && e.target.id;
      if (id === 'rcReply') { e.preventDefault(); sendReply(); }
      else if (id === 'rcNewText') { e.preventDefault(); sendNew(); }
    });

    var fileInput = panel.querySelector('#rcFile');
    if (fileInput) fileInput.addEventListener('change', function () { onImage(this); });
  }

  ready(function () {
    if (typeof SUPABASE_URL === 'undefined') return; // dashboard sem Supabase
    buildDom();
    loadTickets();
    initRT();
  });
})();
