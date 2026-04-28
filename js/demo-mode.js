/**
 * demo-mode.js — Ativa o modo demonstração nos dashboards e páginas relacionadas.
 *
 * COMO FUNCIONA:
 *   Carregado condicionalmente quando ?demo=true está na URL.
 *   Substitui funções de autenticação e fetch de dados por versões
 *   que retornam dados mock de demo-data.js.
 *
 * COMO ATUALIZAR A DEMO:
 *   Edite apenas js/demo-data.js — este arquivo não precisa de alterações
 *   a menos que você adicione uma nova categoria ou endpoint.
 *
 * ORDEM DE CARREGAMENTO (nos dashboards):
 *   1. core.js       — define isDemoMode, fetchNegociacoesMarca, etc.
 *   2. demo-data.js  — define window.DEMO e window.CATALOG
 *   3. demo-mode.js  — (este arquivo) sobrescreve as funções acima
 *   4. Inline script — código do dashboard (DOMContentLoaded)
 */

(function () {
  'use strict';

  // ── 1. isDemoMode: sinaliza modo demo para todo o código do dashboard ──
  window.isDemoMode = function () { return true; };

  // ── 2. Banner glass: injeta CSS + monta o banner com swap entre demos ──
  function _detectDemoSide() {
    // Retorna 'marca', 'detentor' ou 'neutral' (para páginas de detalhe / criar opp)
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('dashboard-marca') !== -1)              return 'marca';
    if (path.indexOf('dashboard-detentor') !== -1)           return 'detentor';
    if (path.indexOf('oportunidade-detalhe-detentor') !== -1) return 'detentor';
    if (path.indexOf('criar-oportunidade') !== -1)            return 'detentor';
    if (path.indexOf('oportunidade-detalhe') !== -1)          return 'marca';
    return 'neutral';
  }

  function _injectDemoBannerStyles() {
    if (document.getElementById('demo-banner-styles')) return;
    var st = document.createElement('style');
    st.id = 'demo-banner-styles';
    st.textContent =
      '@keyframes demoBannerIn { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }' +
      '#demoBanner { display:none; position:fixed; top:14px; left:50%; margin-left:-220px; z-index:10000; ' +
        'animation: demoBannerIn .35s cubic-bezier(.2,.8,.2,1); ' +
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
      '#demoBanner.dragging { cursor: grabbing; transition: none; box-shadow: 0 18px 60px rgba(0,0,0,0.34), 0 1px 0 rgba(255,253,247,0.10) inset; }' +
      '#demoBanner.show { display:flex; align-items:center; gap:14px; }' +
      '#demoBanner .demo-pill { font-family:"Poppins",sans-serif; font-size:9.5px; font-weight:700; letter-spacing:0.16em; ' +
        'background: #1A1200; color:#C8A84B; padding:5px 11px; border-radius:100px; ' +
        'border: 1px solid rgba(200,168,75,0.38); ' +
        'cursor: pointer; transition: background .15s ease, border-color .15s ease; }' +
      '#demoBanner .demo-pill:hover { background: #2a1e00; border-color: rgba(200,168,75,0.65); }' +
      '#demoBanner .demo-text { font-weight:500; opacity:.86; white-space:nowrap; transition: opacity .2s ease, max-width .25s ease; overflow:hidden; }' +
      '#demoBanner .demo-text .demo-text-side { color:#E8C96A; font-weight:600; }' +
      '#demoBanner .demo-divider { width:1px; height:18px; background: rgba(255,253,247,0.18); transition: opacity .2s ease; }' +
      '#demoBanner .demo-btn { display:inline-flex; align-items:center; gap:6px; ' +
        'border:none; cursor:pointer; font-family:"DM Sans",sans-serif; font-size:12px; font-weight:600; ' +
        'padding:7px 14px; border-radius:100px; transition: all .15s ease; ' +
        'transition-property: background, border-color, transform, filter, padding, opacity, max-width; }' +
      '#demoBanner .demo-btn-swap { background: rgba(255,253,247,0.10); color:#FFFDF7; border:1px solid rgba(255,253,247,0.20); }' +
      '#demoBanner .demo-btn-swap:hover { background: rgba(200,168,75,0.22); border-color: rgba(200,168,75,0.55); }' +
      '#demoBanner .demo-btn-collapse { background: rgba(255,253,247,0.08); color:#FFFDF7; border:1px solid rgba(255,253,247,0.16); padding:7px 9px; }' +
      '#demoBanner .demo-btn-collapse:hover { background: rgba(255,253,247,0.16); }' +
      '#demoBanner .demo-btn-exit { background: rgba(255,253,247,0.07); color: rgba(255,253,247,0.60); border: 1px solid rgba(255,253,247,0.14); }' +
      '#demoBanner .demo-btn-exit:hover { background: rgba(220,60,60,0.20); color: #FFFDF7; border-color: rgba(220,80,80,0.38); }' +
      '#demoBanner .demo-btn svg { width:13px; height:13px; flex-shrink:0; stroke: currentColor; }' +
      // ── Estado colapsado ──
      '#demoBanner.collapsed { padding:5px 14px 5px 5px; gap:8px; cursor: grab; }' +
      '#demoBanner.collapsed.dragging { cursor: grabbing; }' +
      '#demoBanner.collapsed .demo-text, ' +
      '#demoBanner.collapsed .demo-divider, ' +
      '#demoBanner.collapsed .demo-btn-swap, ' +
      '#demoBanner.collapsed .demo-btn-exit { display:none; }' +
      '#demoBanner.collapsed .demo-btn-collapse svg { transform: rotate(180deg); }' +
      // ── Mobile ──
      '@media (max-width: 640px) { ' +
        '#demoBanner { top:8px; left:12px; right:12px; margin-left:0; padding:5px 5px 5px 14px; gap:10px; font-size:12px; } ' +
        '#demoBanner .demo-text { display:none; } ' +
        '#demoBanner .demo-divider { display:none; } ' +
        '#demoBanner .demo-btn { padding:6px 11px; font-size:11px; } ' +
        '#demoBanner .demo-btn-label-long { display:none; } ' +
      '}';
    document.head.appendChild(st);
  }

  function _buildBannerInner(side) {
    var swapTarget, swapLabel, swapLabelShort;
    if (side === 'detentor' || side === 'neutral') {
      swapTarget = 'dashboard-marca.html?demo=true';
      swapLabel = 'Ver como Marca';
      swapLabelShort = 'Marca';
    } else {
      swapTarget = 'dashboard-detentor.html?demo=true';
      swapLabel = 'Ver como Detentor';
      swapLabelShort = 'Detentor';
    }
    var sideLabel = side === 'marca' ? 'visão da marca'
                  : side === 'detentor' ? 'visão do detentor'
                  : 'modo demonstração';
    var swapIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4m0 0l4-4m-4 4h14"/><path d="M17 8l4 4m0 0l-4 4m4-4H7"/></svg>';
    var exitIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    var collapseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    return ''
      + '<span class="demo-pill" title="Modo demonstração — clique para expandir">DEMO</span>'
      + '<span class="demo-text">Você está na <span class="demo-text-side">' + sideLabel + '</span></span>'
      + '<span class="demo-divider"></span>'
      + '<button class="demo-btn demo-btn-swap" data-target="' + swapTarget + '" title="' + swapLabel + '">'
      +   swapIcon
      +   '<span class="demo-btn-label-long">' + swapLabel + '</span>'
      +   '<span class="demo-btn-label-short" style="display:none">' + swapLabelShort + '</span>'
      + '</button>'
      + '<button class="demo-btn demo-btn-collapse" title="Recolher / expandir">'
      +   collapseIcon
      + '</button>'
      + '<button class="demo-btn demo-btn-exit" title="Sair do demo">'
      +   exitIcon
      +   '<span>Sair</span>'
      + '</button>';
  }

  // Swap entre demos preservando ?demo=true
  window.demoSwap = function (target) {
    if (!target) return;
    window.location.href = target;
  };

  function _ensureDemoBanner() {
    _injectDemoBannerStyles();
    var banner = document.getElementById('demoBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'demoBanner';
      document.body.appendChild(banner);
    } else {
      // Limpa estilos inline antigos (caso o banner tenha sido pré-criado nas páginas)
      banner.removeAttribute('style');
    }
    var side = _detectDemoSide();
    banner.innerHTML = _buildBannerInner(side);
    banner.classList.add('show');

    // Listeners — botões (param o drag em mousedown)
    var swapBtn = banner.querySelector('.demo-btn-swap');
    if (swapBtn) {
      swapBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.demoSwap(swapBtn.getAttribute('data-target'));
      });
    }
    var exitBtn = banner.querySelector('.demo-btn-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof exitDemoMode === 'function') exitDemoMode();
        else window.location.href = 'demo.html';
      });
    }
    var collapseBtn = banner.querySelector('.demo-btn-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _toggleCollapsed(banner);
      });
    }
    // Pill DEMO no estado colapsado também expande
    var pill = banner.querySelector('.demo-pill');
    if (pill) {
      pill.addEventListener('click', function (e) {
        if (banner.classList.contains('collapsed')) {
          e.stopPropagation();
          _toggleCollapsed(banner);
        }
      });
    }

    // Mobile: mostra label curto
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      var lShort = banner.querySelector('.demo-btn-label-short');
      var lLong  = banner.querySelector('.demo-btn-label-long');
      if (lShort) lShort.style.display = '';
      if (lLong)  lLong.style.display  = 'none';
    }

    // ── Restaura estado salvo (collapsed + posição) ──
    try {
      if (sessionStorage.getItem('rr_demo_banner_collapsed') === '1') {
        banner.classList.add('collapsed');
      }
      var posRaw = sessionStorage.getItem('rr_demo_banner_pos');
      if (posRaw) {
        var pos = JSON.parse(posRaw);
        if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
          _applyPos(banner, pos.left, pos.top);
        }
      }
    } catch (e) {}

    // ── Habilita drag ──
    _enableBannerDrag(banner);
  }

  // Aplica posição absoluta (remove o left:50%/margin-left:-220px default)
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
    try { sessionStorage.setItem('rr_demo_banner_collapsed', willCollapse ? '1' : '0'); } catch (e) {}
    // Reajusta posição se ficou fora da viewport após mudar de tamanho
    setTimeout(function () {
      var rect = banner.getBoundingClientRect();
      if (banner.style.left) _applyPos(banner, rect.left, rect.top);
    }, 260);
  }

  function _enableBannerDrag(banner) {
    var dragging = false;
    var startX = 0, startY = 0;
    var origLeft = 0, origTop = 0;
    var moved = false;

    function getEventXY(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onDown(e) {
      // Não inicia drag em botões
      if (e.target.closest('button')) return;
      var p = getEventXY(e);
      startX = p.x; startY = p.y;
      var rect = banner.getBoundingClientRect();
      origLeft = rect.left;
      origTop  = rect.top;
      dragging = true;
      moved = false;
      banner.classList.add('dragging');
      // Para texto não selecionar enquanto arrasta
      document.body.style.userSelect = 'none';
    }

    function onMove(e) {
      if (!dragging) return;
      var p = getEventXY(e);
      var dx = p.x - startX;
      var dy = p.y - startY;
      if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) moved = true;
      if (moved) {
        e.preventDefault();
        _applyPos(banner, origLeft + dx, origTop + dy);
      }
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      banner.classList.remove('dragging');
      document.body.style.userSelect = '';
      if (moved) {
        try {
          var rect = banner.getBoundingClientRect();
          sessionStorage.setItem('rr_demo_banner_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        } catch (e) {}
      }
    }

    banner.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    banner.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);

    // Reposiciona na borda se a janela mudar de tamanho
    window.addEventListener('resize', function () {
      if (!banner.style.left) return; // ainda no default centralizado
      var rect = banner.getBoundingClientRect();
      _applyPos(banner, rect.left, rect.top);
    });
  }

  window.showDemoBannerIfActive = function () { _ensureDemoBanner(); };
  // Auto-injeta no DOMContentLoaded para páginas que não chamam explicitamente
  document.addEventListener('DOMContentLoaded', _ensureDemoBanner);

  // ── 3. Sessões fake: pré-popula localStorage para que páginas que leem
  //    `sb_detentor_session` / `sb_marca_session` (ex.: oportunidade-detalhe-detentor.html)
  //    encontrem dados válidos e não redirecionem para login.
  (function _seedSessions() {
    try {
      var d = (window.DEMO && window.DEMO.detentor) ? window.DEMO.detentor : null;
      var m = (window.DEMO && window.DEMO.marca) ? window.DEMO.marca : null;
      if (d && !localStorage.getItem('sb_detentor_session')) {
        var dEmp = (d.empresa && d.empresa.nome) || 'Instituto Esportivo SP';
        localStorage.setItem('sb_detentor_session', JSON.stringify({
          access_token: 'demo-token-2026',
          user: {
            id: 'demo-user-id-001',
            email: (d.user && d.user.email) || 'isaac@institutoesportivo.com.br',
            user_metadata: {
              nome: (d.user && d.user.nome) || 'Isaac Gabriel',
              empresa: dEmp
            }
          }
        }));
      }
      if (m && !localStorage.getItem('sb_marca_session')) {
        localStorage.setItem('sb_marca_session', JSON.stringify({
          access_token: 'demo-token-2026',
          user: {
            id: 'demo-user-id-002',
            email: (m.user && m.user.email) || 'contato@nikebrasil.com',
            user_metadata: {
              nome: (m.user && m.user.responsavel) || 'Carlos Mendes',
              empresa: (m.user && m.user.nome) || 'Nike Brasil'
            }
          }
        }));
      }
    } catch (e) { console.warn('[DemoMode] seedSessions failed', e); }
  })();

  // ── 4. Sair do demo: volta para a landing (não para admin.html como em prod) ──
  window.exitDemoMode = function () { window.location.href = 'demo.html'; };

  // ── 4b. Auth stubs: retornam valores fake para evitar redirect ──
  window.getValidToken   = async function () { return 'demo-token-2026'; };
  window.getAuthUserId   = async function () { return 'demo-user-id-001'; };
  window.restoreSessionToSDK = async function () { return null; };

  // ── 5. Proposals/Negotiations: retorna dados do DEMO object ──
  window.fetchNegociacoesMarca   = async function () {
    return (window.DEMO && window.DEMO.marca && window.DEMO.marca.propostas)
      ? window.DEMO.marca.propostas : [];
  };
  window.fetchNegociacoesDetentor = async function () {
    return (window.DEMO && window.DEMO.detentor && window.DEMO.detentor.negociacoes)
      ? window.DEMO.detentor.negociacoes : [];
  };

  // ── 6. SharedNeg: usado em loadNegociacoes() do detentor ──
  if (window.SharedNeg) {
    var _demoNegs = (window.DEMO && window.DEMO.detentor) ? window.DEMO.detentor.negociacoes : [];
    window.SharedNeg.all = function () { return _demoNegs; };
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.SharedNeg && window.DEMO && window.DEMO.detentor) {
        var _demoNegs2 = window.DEMO.detentor.negociacoes;
        window.SharedNeg.all = function () { return _demoNegs2; };
      }
    });
  }

  // ── 7. Favoritos demo: pré-popula IDs para o KPI "Oportunidades salvas" ──
  if (!localStorage.getItem('rr_favoritos_v1')) {
    localStorage.setItem('rr_favoritos_v1', JSON.stringify([206, 208, 211, 214, 217, 219, 203, 201]));
  }

  // ── 8. User info demo nos dashboards ──
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      var isDetentor = !!document.getElementById('dashboard-timeline-detentor');
      var u;
      if (isDetentor) {
        u = window.DEMO && window.DEMO.detentor && window.DEMO.detentor.user;
        if (u && typeof window.setUserInfo === 'function') {
          window.setUserInfo(u.nome, u.email);
        }
        var e = window.DEMO && window.DEMO.detentor && window.DEMO.detentor.empresa;
        if (e && typeof window.populateDetenorFields === 'function') {
          window.populateDetenorFields(Object.assign({}, u, e));
        }
      } else {
        u = window.DEMO && window.DEMO.marca && window.DEMO.marca.user;
        if (u && typeof window.setUserInfo === 'function') {
          window.setUserInfo(u.responsavel || u.nome, u.email);
        }
        if (u && typeof window.populateConfigFields === 'function') {
          window.populateConfigFields({
            empresa:   u.nome,
            cnpj:      u.cnpj,
            segmento:  u.segmento,
            website:   u.site || u.website,
            descricao: u.descricao,
            nome:      u.responsavel,
            email:     u.email,
            telefone:  u.telefone,
            cargo:     u.cargo
          });
        }
      }

      if (isDetentor && typeof window.renderSolicitacoes === 'function') {
        if (!window._SOLICITACOES || window._SOLICITACOES.length === 0) {
          window._SOLICITACOES = _buildDemoSolicitacoes();
          window.renderSolicitacoes(window._SOLICITACOES);
          _updateSolBadge(window._SOLICITACOES);
        }
      }
    }, 150);

    // Auto-propaga ?demo=true em todos os links internos
    _propagateDemoFlagToLinks();
  });

  // ── 9. Acesso-oportunidade stubs ──
  window.loadSolicitacoes = async function () {
    if (!window._SOLICITACOES || window._SOLICITACOES.length === 0) {
      window._SOLICITACOES = _buildDemoSolicitacoes();
    }
    if (typeof window.renderSolicitacoes === 'function') {
      window.renderSolicitacoes(window._SOLICITACOES);
    }
    _updateSolBadge(window._SOLICITACOES);
  };

  function _updateSolBadge(list) {
    var pendentes = list.filter(function (s) { return s.status === 'pendente'; }).length;
    var badge = document.getElementById('solBadgeCount');
    if (badge) { badge.textContent = pendentes; badge.style.display = pendentes > 0 ? '' : 'none'; }
  }

  function _buildDemoSolicitacoes() {
    return [
      { id: 's1', opp_id: 208, oppTitulo: 'Rock in Rio — Cota Patrocínio', marcaId: 'mx1', marcaNome: 'Heineken', marcaEmpresa: 'Heineken Brasil', marcaEmail: 'patrocinio@heineken.com.br', mensagem: 'A Heineken tem forte tradição em festivais de música. Gostaríamos de acessar as cotas disponíveis.', status: 'pendente',  criadaEm: '08/04/2026 14:30' },
      { id: 's2', opp_id: 208, oppTitulo: 'Rock in Rio — Cota Patrocínio', marcaId: 'mx2', marcaNome: 'Samsung',  marcaEmpresa: 'Samsung Brasil',  marcaEmail: 'mkt@samsung.com.br',         mensagem: 'Samsung quer apresentar as novidades do Galaxy na área VIP.', status: 'aprovado', criadaEm: '07/04/2026 11:00' },
      { id: 's3', opp_id: 209, oppTitulo: 'Fórmula E São Paulo 2026',        marcaId: 'mx3', marcaNome: 'BYD',      marcaEmpresa: 'BYD Brasil',       marcaEmail: 'patrocinio@byd.com.br',       mensagem: 'Como fabricante de veículos elétricos, a BYD está alinhada com o DNA da Fórmula E.', status: 'pendente',  criadaEm: '06/04/2026 09:15' },
      { id: 's4', opp_id: 209, oppTitulo: 'Fórmula E São Paulo 2026',        marcaId: 'mx4', marcaNome: 'Bosch',    marcaEmpresa: 'Bosch Brasil',     marcaEmail: 'mkt@bosch.com.br',           mensagem: 'Tecnologia automotiva Bosch para o futuro elétrico.', status: 'aprovado', criadaEm: '05/04/2026 16:45' },
      { id: 's5', opp_id: 219, oppTitulo: 'Globo Esporte — Inserção de VT',  marcaId: 'mx5', marcaNome: 'Chevrolet', marcaEmpresa: 'Chevrolet Brasil', marcaEmail: 'media@chevrolet.com.br',     mensagem: 'Queremos inserção VT no segmento esportivo da Globo.', status: 'pendente',  criadaEm: '04/04/2026 10:00' },
      { id: 's6', opp_id: 219, oppTitulo: 'Globo Esporte — Inserção de VT',  marcaId: 'mx6', marcaNome: 'Claro',    marcaEmpresa: 'Claro Brasil',     marcaEmail: 'mkt@claro.com.br',           mensagem: 'Patrocínio de segmento esportivo com foco em 5G.', status: 'recusado', criadaEm: '03/04/2026 09:30' },
      { id: 's7', opp_id: 220, oppTitulo: 'SporTV — Naming Rights de Bloco',  marcaId: 'mx7', marcaNome: 'Bradesco', marcaEmpresa: 'Banco Bradesco',  marcaEmail: 'patrocinio@bradesco.com.br', mensagem: 'O Bradesco é parceiro histórico do esporte brasileiro.', status: 'pendente',  criadaEm: '02/04/2026 14:00' },
      { id: 's8', opp_id: 220, oppTitulo: 'SporTV — Naming Rights de Bloco',  marcaId: 'mx8', marcaNome: 'Volkswagen', marcaEmpresa: 'Volkswagen Brasil', marcaEmail: 'media@vw.com.br',      mensagem: 'VW quer naming rights alinhado ao reposicionamento elétrico.', status: 'aprovado', criadaEm: '01/04/2026 11:30' }
    ];
  }

  // ── 10. Operações de escrita: no-ops em demo mode ──
  window.updateNegociacao   = async function () { return true; };
  window.sendMensagem       = async function (negId, texto, role, nome) {
    if (typeof showToast === 'function') showToast('Mensagem enviada (demo)!', 'success');
    return { id: 'msg-demo', texto: texto, autor_role: role, autor_nome: nome, created_at: new Date().toISOString() };
  };
  window.createContrapartida = async function (data) { return Object.assign({ id: 'cp-demo-' + Date.now() }, data); };
  window.updateContrapartida = async function () { return true; };
  window.uploadContrato      = async function () { return null; };
  window.loadOrgRole         = async function () { return; };

  // ── 11. Adapter: converte uma oportunidade de demo-data para o shape
  //    esperado por renderPage() em oportunidade-detalhe[-detentor].html ──
  function _categoriaToGradient(cat) {
    var map = {
      'Personalidade':    'linear-gradient(135deg,#667eea,#764ba2)',
      'Evento':           'linear-gradient(135deg,#f093fb,#f5576c)',
      'Artista Musical':  'linear-gradient(135deg,#4facfe,#00f2fe)',
      'Mídia':            'linear-gradient(135deg,#43e97b,#38f9d7)'
    };
    return map[cat] || 'linear-gradient(135deg,#1a1a2e,#16213e)';
  }
  function _categoriaToIcon(cat) {
    var map = {
      'Personalidade':    '👤',
      'Evento':           '🎪',
      'Artista Musical':  '🎵',
      'Mídia':            '📡'
    };
    return map[cat] || '📌';
  }

  function _demoOppToDetail(o) {
    if (!o) return null;
    var d = (window.DEMO && window.DEMO.detentor) || {};
    var emp = d.empresa || {};
    var orgName = o.detentorEmpresa || o.org || emp.nome || 'Instituto Esportivo SP';
    var orgInitials = o.orgInitials || orgName.split(' ').filter(function(w){return w.length>2;}).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() || 'IE';
    var cidade = (o.localizacao || o.cidade || o.city || '').split(',')[0].trim();
    var cat = o.categoria || o.category || '';
    var icon = _categoriaToIcon(cat);
    var basePrice = o.preco_minimo || o._price || 80000;

    // Facts gerais
    var generalFacts = [
      { icon: '📅', label: 'Data', value: o.data || o._alcance || 'A definir' },
      { icon: '📍', label: 'Local', value: o.localizacao || o.cidade || o.city || 'A definir' },
      { icon: icon, label: 'Categoria', value: cat },
      { icon: '🎯', label: 'Visibilidade', value: (o.visibilidade === 'publica' ? 'Pública' : (o.visibilidade === 'aprovacao' ? 'Por aprovação' : 'Confidencial')) }
    ];

    // Cotas — converte cotas_data (formato cadastro) para shape de renderPage
    var cotasArr = [];
    if (o.cotas_data && o.cotas_data.length > 0) {
      var emojis = ['🏆','🥈','🥉','⭐','✨','💎'];
      cotasArr = o.cotas_data.map(function (c, i) {
        return {
          emoji: emojis[i] || '⭐',
          name:  c.nome || ('Cota ' + (i + 1)),
          desc:  (c.descricao || (c.beneficios && c.beneficios.slice(0, 2).join(' · ')) || ''),
          price: c.valor ? ('R$ ' + Number(c.valor).toLocaleString('pt-BR')) : 'Sob consulta',
          beneficios: c.beneficios || [],
          vagas: c.vagas != null ? c.vagas : null,
          imagens: c.imagens || []
        };
      });
    } else {
      // Fallback genérico
      cotasArr = [
        { emoji: '🏆', name: 'Patrocinador Master',  desc: 'Máxima visibilidade.', price: 'A partir de R$ ' + (basePrice * 3 / 1000).toFixed(0) + 'k', beneficios: ['Naming rights','Exclusividade'], vagas: 1, imagens: [] },
        { emoji: '🥈', name: 'Patrocinador Premium', desc: 'Logo em materiais oficiais.', price: 'A partir de R$ ' + (basePrice * 1.5 / 1000).toFixed(0) + 'k', beneficios: ['Logo em peças','Ativação'], vagas: 3, imagens: [] }
      ];
    }

    // Canais — derivados de publico_canais (rich) ou fallback
    var canaisArr = [];
    var pc = o.publico_canais || {};
    var iconMap = { instagram: '📸', tiktok: '🎵', youtube: '▶️', facebook: '📘', linkedin: '💼', twitch: '🎮' };
    Object.keys(pc).forEach(function (net) {
      var d = pc[net] || {};
      var nm = (net.charAt(0).toUpperCase() + net.slice(1));
      var reach = d.seguidores
        ? (d.seguidores >= 1e6 ? (d.seguidores / 1e6).toFixed(1).replace('.0','') + 'M' : Math.round(d.seguidores / 1e3) + 'k') + ' seguidores'
        : 'Audiência qualificada';
      canaisArr.push({ icon: iconMap[net] || '📱', name: nm, reach: reach });
    });
    if (canaisArr.length === 0) {
      canaisArr = [
        { icon: '📸', name: 'Instagram', reach: '420k seguidores · 5.2% engajamento' },
        { icon: '🎵', name: 'TikTok',    reach: '180k seguidores · 8.1% engajamento' }
      ];
    }

    // Público facts (compatibilidade legada)
    var publicoFacts = [
      { icon: '👤', label: 'Gênero predominante', value: '54% feminino, 46% masculino' },
      { icon: '🎂', label: 'Faixa etária principal', value: '25-44 anos (68%)' },
      { icon: '💰', label: 'Classe social',        value: 'A/B (72% do público)' },
      { icon: '📱', label: 'Presença digital',     value: '94% ativo em redes sociais' }
    ];

    return {
      id: o.id,
      slug: o.slug || null,
      detentor_id: 'demo-user-id-001',
      perfilSlug: o.perfilSlug || 'instituto-esportivo',
      title: o.titulo || o.title || '',
      org: orgName,
      orgInitials: orgInitials,
      orgId: 'demo-org',
      category: cat,
      city: cidade,
      region: o.localizacao || cidade,
      date: o.data || o._alcance || '',
      price: basePrice,
      desc: o.descricao || o.desc || '',
      objetivos: o.descricao_completa || o.objetivos || '',
      buscaMarca: o.buscaMarca || '',
      entregas: o.entregas || '',
      gradient: o.bg_gradient || o._bgGradient || _categoriaToGradient(cat),
      thumbs: ['#c8d8e8', '#d4e8c8'],
      images: o.imagens || o.images || (o.imagem_capa ? [o.imagem_capa] : (o._imagemCapa ? [o._imagemCapa] : [])),
      imagem_capa: o.imagem_capa || o._imagemCapa || null,
      imagens_focal: o.imagens_focal || o._imagensFocal || {},
      facts: generalFacts,
      tags: o.tags || o._tags || [cat, 'Patrocínio'],
      publico: o.publico_descricao || 'Público qualificado, altamente engajado, com forte presença digital e poder de influência.',
      publicoFacts: publicoFacts,
      publicoCanais: o.publico_canais || null,
      publicoPresencial: o.publico_presencial || null,
      cotas: cotasArr,
      cotasHabilitadas: o.cotas_habilitadas !== false,
      canais: canaisArr,
      videoUrl: o.videoUrl || o.video_url || null,
      video_url: o.videoUrl || o.video_url || null,
      mediaKitUrl: o.mediaKitUrl || o.midia_kit_url || null,
      linkExterno: o.linkExterno || o.link_externo || null,
      link_externo: o.linkExterno || o.link_externo || null,
      datasEvento: o.datasEvento || o.datas_evento || null,
      formato: o.formato || (cat === 'Mídia' ? 'Digital' : 'Presencial + digital'),
      localizacao: o.localizacao || o.cidade || o.city || '',
      alcance: o.alcance || o.data || o._alcance || '',
      visibilidade: o.visibilidade || 'publica',
      sidebar: {
        evento: o.data || o._alcance || '',
        cotasQty: cotasArr.length + ' modalidade' + (cotasArr.length !== 1 ? 's' : ''),
        formato: o.formato || (cat === 'Mídia' ? 'Digital' : 'Presencial + digital'),
        participantes: o.alcance || o.data || '',
        preco: basePrice
      },
      _orgData: {
        nome: orgName,
        empresa: orgName,
        descricao: emp.descricao || 'Instituto dedicado à promoção do esporte, cultura e entretenimento.',
        website: 'https://' + (o.detentorEmpresaDomain || (emp.empresa_domain || 'institutoesportivo.com.br')),
        slug: o.perfilSlug || 'instituto-esportivo'
      },
      projetoIncentivado: o.projetoIncentivado || o.projeto_incentivado || false,
      incentivoData: o.incentivoData || o.incentivo_data || null
    };
  }
  window._demoOppToDetail = _demoOppToDetail;

  /**
   * Localiza uma oportunidade demo a partir de URL params (?id=, ?@perfil/slug, ?slug=).
   * Retorna o opp já formatado para renderPage() ou null.
   */
  window.findDemoOppFromURL = function () {
    var params = new URLSearchParams(window.location.search);
    var rawKey = params.keys().next().value;
    var perfilSlug = null, oppSlug = null, id = null;

    if (rawKey && rawKey.startsWith('@')) {
      var parts = rawKey.substring(1).split('/');
      if (parts.length >= 2) { perfilSlug = parts[0]; oppSlug = parts[1]; }
      else { oppSlug = parts[0]; }
    } else if (params.get('slug')) {
      oppSlug = params.get('slug');
    } else if (params.get('id')) {
      var raw = params.get('id');
      var parsed = parseInt(raw);
      id = !isNaN(parsed) ? parsed : raw;
    }

    var pool = [];
    if (window.DEMO && window.DEMO.detentor && window.DEMO.detentor.oportunidades) {
      pool = pool.concat(window.DEMO.detentor.oportunidades);
    }
    if (window.CATALOG) {
      // _demoOppToDetail é tolerante a ambos os shapes (CATALOG + DEMO.detentor),
      // então passamos o item do catálogo direto — campos ricos preservados.
      pool = pool.concat(window.CATALOG);
    }

    var match = null;
    if (oppSlug) match = pool.find(function (o) { return o.slug === oppSlug; });
    if (!match && id != null) match = pool.find(function (o) { return o.id === id || String(o.id) === String(id); });
    if (!match && pool.length > 0) match = pool[0]; // fallback: primeiro item

    return match ? _demoOppToDetail(match) : null;
  };

  /**
   * Helper para detail pages: localiza opp demo, chama renderPage(opp), esconde loading.
   * Retorna true se renderizou (caller pode dar return), false se não há demo opp.
   */
  window.loadDemoOppDetail = async function () {
    var opp = window.findDemoOppFromURL();
    if (!opp) return false;
    if (typeof renderPage === 'function') {
      try { renderPage(opp); } catch (e) { console.error('[DemoMode] renderPage error', e); }
    }
    // Hide loading
    setTimeout(function () {
      var ls = document.getElementById('loadingScreen');
      if (ls) {
        ls.style.opacity = '0';
        ls.style.transition = 'opacity 0.3s';
        setTimeout(function () { ls.style.display = 'none'; }, 300);
      }
    }, 200);
    return true;
  };

  // ── 12. Stub de fetchOppFromSupabase: substitui após inline script definir a função ──
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.fetchOppFromSupabase === 'function') {
      window.fetchOppFromSupabase = async function () {
        var opp = window.findDemoOppFromURL();
        return opp;
      };
    }
  });

  // ── 13. Stubs para criar-oportunidade.html ──
  //    saveDraft / publishOpportunity tornam-se no-ops com toast + redirect.
  document.addEventListener('DOMContentLoaded', function () {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('criar-oportunidade') === -1) return;

    function _demoSaveSuccess(label) {
      if (typeof showToast === 'function') {
        showToast(label + ' (demo)', 'success');
      }
      setTimeout(function () {
        window.location.href = 'dashboard-detentor.html?demo=true#oportunidades';
      }, 1000);
    }
    window.saveDraft = async function () { _demoSaveSuccess('Rascunho salvo'); };
    window.publishOpportunity = async function () { _demoSaveSuccess('Oportunidade publicada'); };
  });

  // ── 14. Auto-propagação de ?demo=true em links internos ──
  function _propagateDemoFlagToLinks() {
    try {
      var anchors = document.querySelectorAll('a[href]');
      anchors.forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href) return;
        // Apenas links internos .html (não externos, não anchors puros)
        if (/^https?:\/\//i.test(href)) return;
        if (href.startsWith('#')) return;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
        // Apenas .html ou paths simples sem query — se já tem ?demo, ignora
        if (/[?&]demo=true/.test(href)) return;
        // Apenas se aponta para uma página HTML do mesmo domínio
        if (!/\.html(\?|#|$)/i.test(href) && !href.endsWith('/')) return;
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        // Mantém hash no final
        var hashIdx = href.indexOf('#');
        if (hashIdx >= 0) {
          var base = href.substring(0, hashIdx);
          var hash = href.substring(hashIdx);
          a.setAttribute('href', base + sep + 'demo=true' + hash);
        } else {
          a.setAttribute('href', href + sep + 'demo=true');
        }
      });
    } catch (e) { console.warn('[DemoMode] link propagation failed', e); }
  }

  // Reaplica após mutações DOM (ex.: render dinâmico de cards)
  document.addEventListener('DOMContentLoaded', function () {
    var mo = new MutationObserver(function () { _propagateDemoFlagToLinks(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });

  // ── 15. Wrappers para navegações programáticas (redirect via JS) ──
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.editarOportunidade === 'function') {
      var _origEdit = window.editarOportunidade;
      window.editarOportunidade = function (id) {
        try {
          var opp = (window.MINHAS_OPPS || []).find(function (o) { return o.id === id; });
          if (opp) sessionStorage.setItem('edit_opp', JSON.stringify(opp));
        } catch (e) {}
        window.location.href = 'criar-oportunidade.html?edit=' + id + '&demo=true';
      };
    }
  });

  console.log('[DemoMode] Ativo — dados mock carregados de demo-data.js');
})();
