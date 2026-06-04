/* ff-filter.js — Filtro de oportunidades compartilhado (dashboard + criar-campanha)
 *
 * Fonte única do modal de filtro. Carregar como <script src> CLÁSSICO (sem type=module):
 * as funções top-level precisam ser globais para os onclick inline do modal resolverem.
 *
 * Uso:
 *   FF.init({ liveCount, onChange, onClear, onClose, footer, onApply })
 *   FF.open(filtroJson?)   // abre, pré-preenche, pinta DOM
 *   FF.getState()          // { tipo, sel:{grp:[...]}, toggles } (serializado)
 *   FF.setState(json)      // restaura estado + pinta DOM
 *   FF.match(opp) / FF.summaryChips(json) / FF.clear() / FF.close() / FF.setFooter(html)
 *
 * Schema de estado == output de FF.getState == campanha.filtro do agente:
 *   { tipo:'todos'|'personalidade'|'evento'|'artista'|'midia', sel:{grp:[strings]}, toggles:{incentivo,cotas} }
 */

/* ─── Config ─────────────────────────────────────────────────────────────── */
const FF_SEGMENTOS = ['Esportes e fitness','Moda e lifestyle','Tecnologia e inovação','Alimentação e bebidas','Finanças e investimentos','Saúde e bem-estar','Educação','Entretenimento','Automobilismo','Games e eSports','Música','Família e maternidade','Negócios e empreendedorismo','Beleza e cuidados','Turismo e viagens','Sustentabilidade','Cultura e arte','Luxo e alto padrão'];
const FF_ALCANCE = ['Regional','Nacional','Internacional'];
const FF_INVEST = [
  {l:'Até R$ 10k', min:0, max:10000},
  {l:'R$ 10k – 50k', min:10000, max:50000},
  {l:'R$ 50k – 200k', min:50000, max:200000},
  {l:'R$ 200k+', min:200000, max:Infinity}
];
const _FF_IC = {
  personalidade: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
  evento: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  artista: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  midia: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><polygon points="10 9 15 12 10 15"/></svg>'
};
// Cada pasta espelha um template. grp = id do grupo; key = chave EXATA em detalhes.
const FF_FOLDERS = [
  { key:'personalidade', name:'Personalidade', sub:'Tipo · nicho principal · idioma', fields:[
    { grp:'p_tipo', dkey:'Tipo', label:'Tipo', opts:['Creator','Celebridade','Apresentador(a)','Especialista / Palestrante','Jornalista','Atleta','Ator / Atriz','Comediante','Streamer','Podcaster','Modelo'] },
    { grp:'p_nicho', dkey:'Nicho principal', label:'Nicho principal', opts:['Esporte','Moda','Beleza','Gastronomia','Tecnologia','Finanças','Humor','Cinema & Séries','Lifestyle','Fitness & Saúde','Música','Games & eSports','Educação','Viagens','Automotivo','Pets','Família','Sustentabilidade','Negócios & Empreendedorismo','Casa & Decoração','Saúde Mental & Bem-estar','Luxo'] },
    { grp:'p_idioma', dkey:'Idioma do conteúdo', label:'Idioma do conteúdo', opts:['Português','Inglês','Espanhol','Francês','Alemão','Italiano','Japonês','Mandarim / Chinês','Árabe','Russo','Coreano','Hindi'] }
  ]},
  { key:'evento', name:'Evento', sub:'Tipo · formato · público · perfil', fields:[
    { grp:'e_tipo', dkey:'Tipo de evento', label:'Tipo de evento', opts:['Festival','Show / Espetáculo','Stand-up / Humor','Conferência / Congresso','Workshop / Capacitação','Feira','Exposição','Networking','Negócios / B2B','Torneio Esportivo','Corrida / Atletismo','Campeonato','Esports / Gaming','Rodeio','Desfile de Moda','Premiação / Award','Hackathon','Lançamento de Produto','Evento Corporativo','Meetup / Comunidade','Gastronomia','Causas / Filantropia','Formatura','Religioso / Celebração'] },
    { grp:'e_formato', dkey:'Formato', label:'Formato', opts:['Presencial','Online'] },
    { grp:'e_publico', dkey:'Público esperado', label:'Público esperado', opts:[{l:'Até 100',v:'Até 100 pessoas'},{l:'100 a 500',v:'100 a 500 pessoas'},{l:'500 a 2k',v:'500 a 2.000'},{l:'2k a 10k',v:'2.000 a 10.000'},{l:'10k a 50k',v:'10.000 a 50.000'},{l:'50k+',v:'Mais de 50.000'}] },
    { grp:'e_abrang', dkey:'Abrangência', label:'Abrangência', opts:['Regional','Nacional','Internacional'] },
    { grp:'e_perfil', dkey:'Perfil socioeconômico dominante', label:'Perfil socioeconômico', opts:[{l:'Classe A',v:'A (renda alta)'},{l:'Classe A/B',v:'A/B (renda média-alta)'},{l:'Classe B/C',v:'B/C (renda média)'},{l:'Classe C/D',v:'C/D (renda média-baixa)'},{l:'Todos',v:'Todos os perfis'}] }
  ]},
  { key:'artista', name:'Artista Musical', sub:'Estilo · shows/mês · público', fields:[
    { grp:'a_estilo', dkey:'Estilo musical', label:'Estilo musical', opts:['Sertanejo','Funk','Pagode','Samba','Axé','Forró','Piseiro','Brega Funk','MPB','Bossa Nova','Gospel','Pop','Rock','Metal / Hard Rock','Indie / Alternativo','Hip-Hop','Rap','Trap','R&B / Soul','Eletrônica','Reggae','Reggaeton','Jazz / Blues','Country','K-Pop'] },
    { grp:'a_shows', dkey:'Média de shows por mês', label:'Média de shows por mês', opts:[{l:'Esporádico',v:'Esporádico (menos de 1 por mês)'},{l:'1 a 2',v:'1 a 2 shows por mês'},{l:'3 a 5',v:'3 a 5 shows por mês'},{l:'6 a 10',v:'6 a 10 shows por mês'},{l:'11 a 20',v:'11 a 20 shows por mês'},{l:'21 a 30',v:'21 a 30 shows por mês'},{l:'Mais de 30',v:'Mais de 30 shows por mês'}] },
    { grp:'a_publico', dkey:'Média de público por show', label:'Média de público por show', opts:[{l:'Até 500',v:'Até 500 pessoas'},{l:'500 a 2k',v:'500 a 2.000'},{l:'2k a 5k',v:'2.000 a 5.000'},{l:'5k a 20k',v:'5.000 a 20.000'},{l:'20k a 50k',v:'20.000 a 50.000'},{l:'50k+',v:'Mais de 50.000'}] },
    { grp:'a_abrang', dkey:'Abrangência dos shows', label:'Abrangência dos shows', opts:['Regional','Nacional','Internacional'] }
  ]},
  { key:'midia', name:'Mídia', sub:'Veículo · nicho editorial · frequência', fields:[
    { grp:'m_veiculo', dkey:'Tipo de veículo', label:'Tipo de veículo', opts:['Portal / Site','Revista','Jornal','Rádio','TV Aberta','TV Fechada / Pay-TV','Canal Streaming','Canal Jornalístico','Podcast','Newsletter','Canal YouTube','Perfil Instagram','Perfil TikTok','Página Facebook','App','Mídia Externa','Conglomerado de Mídia'] },
    { grp:'m_nicho', dkey:'Nicho editorial', label:'Nicho editorial', opts:['Esporte','Moda','Beleza','Gastronomia','Tecnologia','Finanças','Humor','Cinema & Séries','Lifestyle','Fitness & Saúde','Música','Games & eSports','Educação','Viagens','Automotivo','Pets','Família','Sustentabilidade','Negócios & Empreendedorismo','Casa & Decoração','Saúde Mental & Bem-estar','Luxo','Política & Jornalismo','Agro & Rural','Jurídico','Religião & Espiritualidade'] },
    { grp:'m_freq', dkey:'Frequência de publicação', label:'Frequência de publicação', opts:['Diário','Semanal','Quinzenal','Mensal'] },
    { grp:'m_abrang', dkey:'Abrangência', label:'Abrangência', opts:['Regional','Nacional','Internacional'] }
  ]}
];

// Config de matching por grupo (mode + chave)
const FF_GROUP_CFG = (function(){
  const cfg = {
    segmento: { mode:'tags' },
    alcance:  { mode:'alcance' },
    invest:   { mode:'invest' }
  };
  FF_FOLDERS.forEach(f => f.fields.forEach(fl => { cfg[fl.grp] = { mode:'det', key:fl.dkey }; }));
  return cfg;
})();

/* ─── Estado ─────────────────────────────────────────────────────────────── */
let _ffState = { tipo:'todos', sel:{}, toggles:{ incentivo:false, cotas:false } };
let _ffRendered = false;

/* ─── HTML do modal (injetado no init) ────────────────────────────────────── */
const _FF_MODAL_HTML = `
<div class="ff-overlay" id="ff-overlay" onclick="if(event.target===this)ffClose()">
  <div class="ff-modal">
    <div class="ff-head">
      <button class="ff-close" onclick="ffClose()">✕</button>
      <h2>Filtros</h2>
    </div>
    <div class="ff-body">
      <div class="ff-group">
        <div class="ff-glabel">Tipo de oportunidade</div>
        <div class="ff-ghint">Escolher um tipo abre os filtros específicos dele abaixo.</div>
        <div class="ff-segmented">
          <div class="ff-seg active" data-tipo="todos" onclick="ffPickTipo(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Todos</span>
          </div>
          <div class="ff-seg" data-tipo="personalidade" onclick="ffPickTipo(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
            <span>Personalidade</span>
          </div>
          <div class="ff-seg" data-tipo="evento" onclick="ffPickTipo(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Evento</span>
          </div>
          <div class="ff-seg" data-tipo="artista" onclick="ffPickTipo(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span>Artista Musical</span>
          </div>
          <div class="ff-seg" data-tipo="midia" onclick="ffPickTipo(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><polygon points="10 9 15 12 10 15"/></svg>
            <span>Mídia</span>
          </div>
        </div>
      </div>
      <div class="ff-group">
        <div class="ff-glabel">Segmento</div>
        <div class="ff-ghint">Que audiência a marca quer atingir. Múltipla seleção.</div>
        <div class="ff-chips" id="ff-segmento"></div>
      </div>
      <div class="ff-group">
        <div class="ff-glabel">Alcance</div>
        <div class="ff-ghint">Escala de cobertura da oportunidade.</div>
        <div class="ff-chips" id="ff-alcance"></div>
      </div>
      <div class="ff-group">
        <div class="ff-glabel">Investimento</div>
        <div class="ff-ghint">Faixa de valor a partir do preço mínimo da oportunidade.</div>
        <div class="ff-chips" id="ff-invest"></div>
      </div>
      <div class="ff-group">
        <div class="ff-glabel">Detalhes por formato</div>
        <div class="ff-ghint">Cada formato abre uma pasta com seus campos. Escolher um tipo lá em cima abre só a pasta dele.</div>
        <div id="ff-folders"></div>
      </div>
      <div class="ff-group">
        <div class="ff-glabel">Extras</div>
        <div class="ff-toggle-row">
          <div class="ff-tinfo">
            <div class="ff-ttitle">Projeto incentivado</div>
            <div class="ff-tsub">Permite captação via lei de incentivo (Rouanet, LIE…)</div>
          </div>
          <button class="ff-switch" data-toggle="incentivo" onclick="ffToggleSwitch(this)"></button>
        </div>
        <div class="ff-toggle-row">
          <div class="ff-tinfo">
            <div class="ff-ttitle">Com cotas disponíveis</div>
            <div class="ff-tsub">Oportunidades com pacotes de patrocínio definidos</div>
          </div>
          <button class="ff-switch" data-toggle="cotas" onclick="ffToggleSwitch(this)"></button>
        </div>
      </div>
    </div>
    <div class="ff-foot" id="ffFootSlot"></div>
  </div>
</div>`;

/* ─── Render do modal ──────────────────────────────────────────────────────── */
function _ffChipHtml(grp, opt) {
  const o = (typeof opt === 'string') ? { l:opt, v:opt } : opt;
  return `<div class="ff-chip" data-grp="${grp}" data-val="${o.v.replace(/"/g,'&quot;')}" onclick="ffToggleChip(this)">${o.l}</div>`;
}

function ffRenderModal() {
  if (_ffRendered) return;
  const segEl = document.getElementById('ff-segmento');
  if (!segEl) return; // modal ainda não injetado
  segEl.innerHTML = FF_SEGMENTOS.map(s => _ffChipHtml('segmento', s)).join('');
  document.getElementById('ff-alcance').innerHTML = FF_ALCANCE.map(s => _ffChipHtml('alcance', s)).join('');
  document.getElementById('ff-invest').innerHTML = FF_INVEST.map((r,i) => _ffChipHtml('invest', {l:r.l, v:String(i)})).join('');
  document.getElementById('ff-folders').innerHTML = FF_FOLDERS.map(f => `
    <div class="ff-folder" data-folder="${f.key}">
      <div class="ff-fhead" onclick="this.parentElement.classList.toggle('open')">
        <div class="ff-ficon">${_FF_IC[f.key]}</div>
        <div class="ff-fmeta">
          <div class="ff-fname">${f.name}<span class="ff-fcount" data-fcount="${f.key}" style="display:none"></span></div>
          <div class="ff-fsub">${f.sub}</div>
        </div>
        <svg class="ff-chevron" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="ff-fbody">
        ${f.fields.map(fl => `
          <div class="ff-subfield">
            <div class="ff-sublabel">${fl.label}</div>
            <div class="ff-chips">${fl.opts.map(o => _ffChipHtml(fl.grp, o)).join('')}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
  _ffRendered = true;
}

/* ─── Pintar DOM a partir do _ffState (centraliza o "restaura visual") ──────── */
function _ffPaintDOM() {
  document.querySelectorAll('.ff-seg').forEach(s => s.classList.toggle('active', s.dataset.tipo === _ffState.tipo));
  document.querySelectorAll('.ff-folder').forEach(f => {
    const match = f.dataset.folder === _ffState.tipo;
    if (_ffState.tipo === 'todos') { f.style.display = ''; f.classList.remove('open'); }
    else { f.style.display = match ? '' : 'none'; f.classList.toggle('open', match); }
  });
  document.querySelectorAll('.ff-chip').forEach(c => {
    const grp = c.dataset.grp, val = c.dataset.val;
    c.classList.toggle('active', !!(_ffState.sel[grp] && _ffState.sel[grp].has(val)));
  });
  document.querySelectorAll('.ff-switch').forEach(s => s.classList.toggle('on', !!_ffState.toggles[s.dataset.toggle]));
  ffUpdateFolderCounts();
}

/* ─── Handlers (globais — usados por onclick inline) ───────────────────────── */
function ffToggleChip(el) {
  const grp = el.dataset.grp, val = el.dataset.val;
  if (!_ffState.sel[grp]) _ffState.sel[grp] = new Set();
  if (_ffState.sel[grp].has(val)) _ffState.sel[grp].delete(val); else _ffState.sel[grp].add(val);
  if (_ffState.sel[grp].size === 0) delete _ffState.sel[grp];
  el.classList.toggle('active');
  ffUpdateFolderCounts();
  if (FF._opts.onChange) FF._opts.onChange();
}

function ffToggleSwitch(el) {
  const key = el.dataset.toggle;
  _ffState.toggles[key] = !_ffState.toggles[key];
  el.classList.toggle('on', _ffState.toggles[key]);
  if (FF._opts.onChange) FF._opts.onChange();
}

function ffPickTipo(el) {
  const tipo = el.dataset.tipo;
  _ffState.tipo = tipo;
  document.querySelectorAll('.ff-seg').forEach(s => s.classList.toggle('active', s === el));
  document.querySelectorAll('.ff-folder').forEach(f => {
    const match = f.dataset.folder === tipo;
    if (tipo === 'todos') { f.style.display = ''; f.classList.remove('open'); }
    else {
      f.style.display = match ? '' : 'none';
      f.classList.toggle('open', match);
      if (!match) {
        f.querySelectorAll('.ff-chip.active').forEach(c => {
          c.classList.remove('active');
          const g = c.dataset.grp;
          if (_ffState.sel[g]) { _ffState.sel[g].delete(c.dataset.val); if (!_ffState.sel[g].size) delete _ffState.sel[g]; }
        });
      }
    }
  });
  ffUpdateFolderCounts();
  if (FF._opts.onChange) FF._opts.onChange();
}

function ffUpdateFolderCounts() {
  FF_FOLDERS.forEach(f => {
    let n = 0;
    f.fields.forEach(fl => { if (_ffState.sel[fl.grp]) n += _ffState.sel[fl.grp].size; });
    const el = document.querySelector(`[data-fcount="${f.key}"]`);
    if (el) { el.textContent = n; el.style.display = n ? '' : 'none'; }
  });
}

function ffClose() {
  const ov = document.getElementById('ff-overlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  if (FF._opts.onClose) FF._opts.onClose();
}

function ffClear() {
  _ffState = { tipo:'todos', sel:{}, toggles:{ incentivo:false, cotas:false } };
  document.querySelectorAll('.ff-chip.active').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.ff-switch.on').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.ff-seg').forEach(s => s.classList.toggle('active', s.dataset.tipo === 'todos'));
  document.querySelectorAll('.ff-folder').forEach(f => { f.style.display = ''; f.classList.remove('open'); });
  ffUpdateFolderCounts();
  if (FF._opts.onChange) FF._opts.onChange();
  if (FF._opts.onClear) FF._opts.onClear();
}

/* ─── Engine (pura) ────────────────────────────────────────────────────────── */
function ffMatch(opp) {
  if (_ffState.tipo !== 'todos' && opp._categoriaSlug !== _ffState.tipo) return false;
  const det = opp._detalhes || {};
  for (const grp in _ffState.sel) {
    const set = _ffState.sel[grp];
    if (!set || !set.size) continue;
    const cfg = FF_GROUP_CFG[grp];
    if (!cfg) continue;
    if (cfg.mode === 'tags') {
      if (!(opp._tags || []).some(t => set.has(t))) return false;
    } else if (cfg.mode === 'alcance') {
      const vals = [det['Abrangência'], det['Abrangência dos shows']].filter(Boolean);
      if (!vals.some(v => set.has(v))) return false;
    } else if (cfg.mode === 'invest') {
      const p = opp._price;
      if (p == null) return false;
      let ok = false;
      set.forEach(idx => { const r = FF_INVEST[+idx]; if (r && p >= r.min && p < r.max) ok = true; });
      if (!ok) return false;
    } else if (cfg.mode === 'det') {
      const v = det[cfg.key];
      if (v == null) return false;
      if (Array.isArray(v)) { if (!v.some(x => set.has(x))) return false; }
      else { if (!set.has(v)) return false; }
    }
  }
  if (_ffState.toggles.incentivo && !opp._projetoIncentivado) return false;
  if (_ffState.toggles.cotas && !opp._cotasHabilitadas) return false;
  return true;
}

function ffActiveCount() {
  let n = (_ffState.tipo !== 'todos') ? 1 : 0;
  for (const g in _ffState.sel) n += _ffState.sel[g].size;
  if (_ffState.toggles.incentivo) n++;
  if (_ffState.toggles.cotas) n++;
  return n;
}

/* ─── Serialização (Sets <-> arrays) ───────────────────────────────────────── */
function ffSerializeState(state) {
  const sel = {};
  for (const g in state.sel) sel[g] = [...state.sel[g]];
  return { tipo: state.tipo, sel, toggles: state.toggles };
}

function ffDeserializeState(json) {
  if (!json) return null;
  const sel = {};
  for (const g in (json.sel || {})) sel[g] = new Set(json.sel[g]);
  return { tipo: json.tipo || 'todos', sel, toggles: json.toggles || { incentivo: false, cotas: false } };
}

function ffSumaryChips(filtrosJson) {
  if (!filtrosJson) return [];
  const chips = [];
  const TIPO_LABELS = { personalidade: 'Personalidade', evento: 'Evento', artista: 'Artista Musical', midia: 'Mídia' };
  if (filtrosJson.tipo && filtrosJson.tipo !== 'todos') chips.push(TIPO_LABELS[filtrosJson.tipo] || filtrosJson.tipo);
  const sel = filtrosJson.sel || {};
  if (sel.segmento) sel.segmento.slice(0,2).forEach(s => chips.push(s));
  if (sel.alcance)  sel.alcance.slice(0,1).forEach(s => chips.push(s));
  if (sel.invest)   chips.push('Investimento filtrado');
  if ((filtrosJson.toggles || {}).incentivo) chips.push('Incentivado');
  if ((filtrosJson.toggles || {}).cotas)    chips.push('Com cotas');
  return chips;
}

/* ─── API pública ──────────────────────────────────────────────────────────── */
window.FF = {
  _opts: {},
  init(opts) {
    this._opts = opts || {};
    if (!document.getElementById('ff-overlay')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = _FF_MODAL_HTML.trim();
      document.body.appendChild(wrap.firstElementChild);
    }
    ffRenderModal();
    if (this._opts.footer) this.setFooter(this._opts.footer);
  },
  open(stateJson) {
    ffRenderModal();
    if (stateJson) { const d = ffDeserializeState(stateJson); if (d) _ffState = d; }
    _ffPaintDOM();
    const ov = document.getElementById('ff-overlay');
    if (ov) ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (this._opts.onChange) this._opts.onChange();
  },
  close() { ffClose(); },
  getState() { return ffSerializeState(_ffState); },
  setState(json) {
    const d = ffDeserializeState(json);
    _ffState = d || { tipo:'todos', sel:{}, toggles:{ incentivo:false, cotas:false } };
    ffRenderModal();
    _ffPaintDOM();
  },
  match(opp) { return ffMatch(opp); },
  activeCount() { return ffActiveCount(); },
  summaryChips(json) { return ffSumaryChips(json); },
  clear() { ffClear(); },
  setFooter(html) { const f = document.getElementById('ffFootSlot'); if (f) f.innerHTML = html; },
  apply() { if (this._opts.onApply) this._opts.onApply(this.getState()); },
  // acesso ao estado interno para wrappers do dashboard
  get state() { return _ffState; },
  set state(s) { _ffState = s; }
};
