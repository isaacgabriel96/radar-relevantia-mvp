/**
 * admin-view-banner.js — Banner glass para o modo Admin View / Impersonation.
 *
 * COMO FUNCIONA:
 *   Carregado por todas as páginas em que o admin pode atuar como cliente
 *   (criar-oportunidade, dashboard-detentor, oportunidade-detalhe-detentor).
 *
 *   Ele só se ativa se `window._adminViewCtx` estiver presente — esse contexto
 *   é populado no IIFE inicial de cada página, que faz o handoff via nonce.
 *
 *   Visual e interação espelham o banner do modo demo (js/demo-mode.js):
 *   pílula glass flutuante, arrastável, com botão de colapsar e botão de sair.
 */
(function () {
  'use strict';

  function _getCtx() {
    return window._adminViewCtx || window._impersonateCtx || null;
  }

  function _injectStyles() {
    if (document.getElementById('admin-view-banner-styles')) return;
    var st = document.createElement('style');
    st.id = 'admin-view-banner-styles';
    st.textContent =
      '@keyframes adminViewBannerIn { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }' +
      '#adminViewBanner { display:none; position:fixed; top:14px; left:50%; margin-left:-220px; z-index:10000; ' +
        'animation: adminViewBannerIn .35s cubic-bezier(.2,.8,.2,1); ' +
        'background: rgba(26, 18, 0, 0.62); ' +
        '-webkit-backdrop-filter: blur(20px) saturate(150%); ' +
        'backdrop-filter: blur(20px) saturate(150%); ' +
        'border: 1px solid rgba(200, 168, 75, 0.22); ' +
        'border-radius: 100px; ' +
        'box-shadow: 0 12px 44px rgba(0,0,0,0.36), 0 1px 0 rgba(255,253,247,0.06) inset; ' +
        'padding: 6px 6px 6px 18px; ' +
        'font-family: "DM Sans", system-ui, sans-serif; ' +
        'font-size: 13px; color: #FFFDF7; max-width: calc(100vw - 24px); ' +
        'cursor: grab; user-select: none; ' +
        'transition: padding .25s ease, gap .25s ease, background .2s ease, border-color .2s ease; }' +
      '#adminViewBanner.dragging { cursor: grabbing; transition: none; box-shadow: 0 18px 60px rgba(0,0,0,0.34), 0 1px 0 rgba(255,253,247,0.10) inset; }' +
      '#adminViewBanner.show { display:flex; align-items:center; gap:14px; }' +
      '#adminViewBanner .av-pill { font-family:"Poppins",sans-serif; font-size:9.5px; font-weight:700; letter-spacing:0.16em; ' +
        'background: #1A1200; color:#C8A84B; padding:5px 11px; border-radius:100px; ' +
        'border: 1px solid rgba(200,168,75,0.38); ' +
        'cursor: pointer; transition: background .15s ease, border-color .15s ease; }' +
      '#adminViewBanner .av-pill:hover { background: #2a1e00; border-color: rgba(200,168,75,0.65); }' +
      '#adminViewBanner .av-text { font-weight:500; opacity:.86; white-space:nowrap; transition: opacity .2s ease, max-width .25s ease; overflow:hidden; max-width:340px; text-overflow:ellipsis; }' +
      '#adminViewBanner .av-text .av-text-name { color:#E8C96A; font-weight:600; }' +
      '#adminViewBanner .av-divider { width:1px; height:18px; background: rgba(255,253,247,0.18); transition: opacity .2s ease; }' +
      '#adminViewBanner .av-btn { display:inline-flex; align-items:center; gap:6px; ' +
        'border:none; cursor:pointer; font-family:"DM Sans",sans-serif; font-size:12px; font-weight:600; ' +
        'padding:7px 14px; border-radius:100px; transition: all .15s ease; }' +
      '#adminViewBanner .av-btn-collapse { background: rgba(255,253,247,0.08); color:#FFFDF7; border:1px solid rgba(255,253,247,0.16); padding:7px 9px; }' +
      '#adminViewBanner .av-btn-collapse:hover { background: rgba(255,253,247,0.16); }' +
      '#adminViewBanner .av-btn-exit { background: rgba(255,253,247,0.07); color: rgba(255,253,247,0.82); border: 1px solid rgba(255,253,247,0.14); }' +
      '#adminViewBanner .av-btn-exit:hover { background: rgba(220,60,60,0.20); color: #FFFDF7; border-color: rgba(220,80,80,0.38); }' +
      '#adminViewBanner .av-btn svg { width:13px; height:13px; flex-shrink:0; stroke: currentColor; }' +
      // Estado colapsado: só pílula + botão de expandir
      '#adminViewBanner.collapsed { padding:5px 14px 5px 5px; gap:8px; cursor: grab; }' +
      '#adminViewBanner.collapsed.dragging { cursor: grabbing; }' +
      '#adminViewBanner.collapsed .av-text, ' +
      '#adminViewBanner.collapsed .av-divider, ' +
      '#adminViewBanner.collapsed .av-btn-exit { display:none; }' +
      '#adminViewBanner.collapsed .av-btn-collapse svg { transform: rotate(180deg); }' +
      // Mobile
      '@media (max-width: 640px) { ' +
        '#adminViewBanner { top:8px; left:12px; right:12px; margin-left:0; padding:5px 5px 5px 14px; gap:10px; font-size:12px; } ' +
        '#adminViewBanner .av-text { display:none; } ' +
        '#adminViewBanner .av-divider { display:none; } ' +
        '#adminViewBanner .av-btn { padding:6px 11px; font-size:11px; } ' +
      '}';
    document.head.appendChild(st);
  }

  function _buildInner(ctx) {
    var name = ctx.target_nome || ctx.target_email || 'cliente';
    // Escape básico (target_nome vem do nosso próprio admin, mas defesa em profundidade)
    var safeName = String(name).replace(/[<>&"']/g, function (c) {
      return ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' })[c];
    });
    var collapseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    var exitIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    return ''
      + '<span class="av-pill" title="Modo admin — clique para expandir">ADMIN</span>'
      + '<span class="av-text">Atuando como <span class="av-text-name">' + safeName + '</span></span>'
      + '<span class="av-divider"></span>'
      + '<button class="av-btn av-btn-collapse" title="Recolher / expandir">' + collapseIcon + '</button>'
      + '<button class="av-btn av-btn-exit" title="Sair do modo admin">' + exitIcon + '<span>Sair</span></button>';
  }

  function _applyPos(banner, left, top) {
    var maxLeft = Math.max(0, window.innerWidth  - banner.offsetWidth  - 6);
    var maxTop  = Math.max(0, window.innerHeight - banner.offsetHeight - 6);
    left = Math.min(Math.max(6, left), maxLeft);
    top  = Math.min(Math.max(6, top),  maxTop);
    banner.style.left = left + 'px';
    banner.style.top  = top  + 'px';
    banner.style.marginLeft = '0';
    banner.style.right = 'auto';
    banner.style.bottom = 'auto';
  }

  function _toggleCollapsed(banner) {
    var willCollapse = !banner.classList.contains('collapsed');
    banner.classList.toggle('collapsed', willCollapse);
    try { sessionStorage.setItem('rr_admin_banner_collapsed', willCollapse ? '1' : '0'); } catch (e) {}
    setTimeout(function () {
      var rect = banner.getBoundingClientRect();
      if (banner.style.left) _applyPos(banner, rect.left, rect.top);
    }, 260);
  }

  function _enableDrag(banner) {
    var dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0, moved = false;
    function getXY(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function onDown(e) {
      if (e.target.closest('button')) return;
      var p = getXY(e);
      startX = p.x; startY = p.y;
      var rect = banner.getBoundingClientRect();
      origLeft = rect.left; origTop = rect.top;
      dragging = true; moved = false;
      banner.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }
    function onMove(e) {
      if (!dragging) return;
      var p = getXY(e);
      var dx = p.x - startX, dy = p.y - startY;
      if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) moved = true;
      if (moved) { e.preventDefault(); _applyPos(banner, origLeft + dx, origTop + dy); }
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      banner.classList.remove('dragging');
      document.body.style.userSelect = '';
      if (moved) {
        try {
          var rect = banner.getBoundingClientRect();
          sessionStorage.setItem('rr_admin_banner_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        } catch (e) {}
      }
    }
    banner.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    banner.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);
    window.addEventListener('resize', function () {
      if (!banner.style.left) return;
      var rect = banner.getBoundingClientRect();
      _applyPos(banner, rect.left, rect.top);
    });
  }

  function _exit() {
    if (typeof window.exitAdminViewMode === 'function') return window.exitAdminViewMode();
    if (typeof window.exitImpersonateMode === 'function') return window.exitImpersonateMode();
    // Fallback genérico
    try {
      sessionStorage.removeItem('sb_impersonate_ctx');
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf('sb_impersonate_ctx') === 0) localStorage.removeItem(k);
      });
    } catch (e) {}
    try { window.close(); } catch (e) {}
    setTimeout(function () { window.location.href = 'admin.html'; }, 200);
  }

  function _ensureBanner() {
    var ctx = _getCtx();
    if (!ctx) return;
    _injectStyles();

    // Remove banners inline pré-existentes (legados) para evitar duplicação
    var legacy = document.getElementById('adminViewBanner');
    if (legacy) legacy.remove();
    var legacyImp = document.getElementById('impersonate-banner');
    if (legacyImp) legacyImp.remove();

    var banner = document.createElement('div');
    banner.id = 'adminViewBanner';
    banner.innerHTML = _buildInner(ctx);
    document.body.appendChild(banner);
    banner.classList.add('show');

    var collapseBtn = banner.querySelector('.av-btn-collapse');
    if (collapseBtn) collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation(); _toggleCollapsed(banner);
    });
    var pill = banner.querySelector('.av-pill');
    if (pill) pill.addEventListener('click', function (e) {
      if (banner.classList.contains('collapsed')) { e.stopPropagation(); _toggleCollapsed(banner); }
    });
    var exitBtn = banner.querySelector('.av-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', function (e) { e.stopPropagation(); _exit(); });

    // Restaura estado salvo
    try {
      if (sessionStorage.getItem('rr_admin_banner_collapsed') === '1') banner.classList.add('collapsed');
      var posRaw = sessionStorage.getItem('rr_admin_banner_pos');
      if (posRaw) {
        var pos = JSON.parse(posRaw);
        if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
          _applyPos(banner, pos.left, pos.top);
        }
      }
    } catch (e) {}

    _enableDrag(banner);

    // Remove o padding-top que as páginas adicionavam ao body para o banner-faixa
    // antigo — agora o banner é flutuante e não desloca o conteúdo.
    document.body.style.paddingTop = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _ensureBanner);
  } else {
    _ensureBanner();
  }
})();
