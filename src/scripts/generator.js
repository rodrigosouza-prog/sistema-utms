/* Runtime do gerador.
   O HTML ja vem renderizado pelo Astro — aqui ficam estado, combobox,
   dicionario editavel, navegacao entre telas, validacao e saida.

   Dicionario = base do JSON  −  removidos  +  adicionados/editados.
   Removidos e adicionados moram no localStorage; "Baixar JSON" gera o
   arquivo ja com as duas coisas aplicadas, para commitar no repositorio. */

import TX from '../../taxonomia/dicionario.json';
import { FIELDS, SECOES, PREVIEWS, RE_MAP, TOKEN_RE, slug } from '../lib/fields.js';
import {
  isDyn, isGoogleAds, isMsAds, usaCustomParam,
  trackingTemplate, customParams, urlFinal
} from '../lib/utm.js';

const LS_HIST = 'at_utm_hist_v1';
const LS_DICT = 'at_utm_dict_v1';
const LS_HIDE = 'at_utm_hidden_v1';

const S = {};                 /* valores do formulario */
let CUSTOM = {};              /* { dim: { valor: descricao|cfg } } adicionados ou editados */
let HIDDEN = {};              /* { dim: { valor: 1 } } removidos da base */
let tab = 'url';
let variante = 'completo';
let view = 'anuncios';
let canalTab = 'anuncio';   /* modo ativo, vindo do menu lateral */
const TOUCHED = new Set();

/* Anuncios e Organico sao a MESMA tela; o que muda e quais canais aparecem.
   sec = qual <section class="view"> exibir. modo = filtro do dropdown de canal. */
const VIEWS = {
  anuncios:   { sec: 'gerador', modo: 'anuncio',
                t: 'UTM de anuncios', s: 'Midia paga — Google, Meta, TikTok, parcerias e offline.' },
  organico:   { sec: 'gerador', modo: 'organico',
                t: 'UTM organico',    s: 'Canais proprios — e-mail, WhatsApp, SMS, push e social organico.' },
  inside:     { sec: 'gerador', modo: 'inside',
                t: 'UTM de inside sales', s: 'Link 1:1 do comercial — WhatsApp, e-mail, CRM, direct e ligacao.' },
  cs:         { sec: 'gerador', modo: 'cs',
                t: 'UTM de CS',       s: 'Retencao e reversao da base — o canal ja separa as duas frentes.' },
  historico:  { sec: 'historico',  t: 'Historico',       s: 'Campanhas salvas neste navegador.' },
  dicionario: { sec: 'dicionario', t: 'Dicionario',      s: 'Adicione, edite ou remova os valores que aparecem nos campos.' },
  ajuda:      { sec: 'ajuda',      t: 'Regras & padrao', s: 'Como o nome e montado e onde colar cada saida.' }
};

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SVG = (d, sz = 14) =>
  `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  copy:   '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>',
  alert:  '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16.2" r=".7" fill="currentColor" stroke="none"/>',
  info:   '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none"/>',
  link:   '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  hist:   '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  dots:   '<circle cx="12" cy="12" r="9"/><path d="M9 12h6"/>',
  x:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
};
const btnCopy = alvo =>
  `<button type="button" class="ico" data-cp="${alvo}" title="Copiar">
     ${SVG(IC.copy, 14).replace('<svg ', '<svg class="cy" ')}
     ${SVG(IC.check, 14).replace('<svg ', '<svg class="ck" ')}
   </button>`;

/* ═══════════════ dicionario ═══════════════ */

const DIM_LABEL = { canal: 'Canal' };
const TIPO_LABEL = { anuncio: 'Anuncios', organico: 'Organico', inside: 'Inside sales', cs: 'CS' };
/* canal sem tipo reconhecido cai em anuncio, para nunca sumir da tela */
const tipoDoCanal = cfg => (cfg && TIPO_LABEL[cfg.tipo] ? cfg.tipo : 'anuncio');
for (const f of Object.values(FIELDS)) if (f.dim) DIM_LABEL[f.dim] = f.label;
const DIMS = Object.keys(DIM_LABEL);

/* campos extras que so o canal tem */
const CANAL_COLS = [
  { k: 'label',               ph: 'Nome exibido (ex: Pinterest)' },
  { k: 'tipo',                ph: 'Modo', opts: ['anuncio', 'organico', 'inside', 'cs'] },
  { k: 'grupo',               ph: 'Grupo (ex: Outras midias pagas)' },
  { k: 'utm_source',          ph: 'utm_source' },
  { k: 'utm_medium',          ph: 'utm_medium' },
  { k: 'utm_source_platform', ph: 'utm_source_platform' }
];

const isHidden = (dim, v) => !!(HIDDEN[dim] && HIDDEN[dim][v]);
const isCustom = (dim, v) => !!(CUSTOM[dim] && CUSTOM[dim][v] !== undefined);

function baseVals(dim) {
  const o = {};
  Object.entries(TX[dim] || {}).forEach(([k, v]) => { if (!k.startsWith('_')) o[k] = v; });
  return o;
}
const isBase = (dim, v) => baseVals(dim)[v] !== undefined;

/** valores visiveis de uma dimensao: base − removidos + adicionados */
function allVals(dim) {
  const out = {};
  for (const [k, v] of Object.entries(baseVals(dim))) if (!isHidden(dim, k)) out[k] = v;
  return Object.assign(out, CUSTOM[dim] || {});
}

/** valores removidos que ainda existem na base (da para restaurar) */
function hiddenVals(dim) {
  const b = baseVals(dim), out = {};
  Object.keys(HIDDEN[dim] || {}).forEach(k => { if (b[k] !== undefined) out[k] = b[k]; });
  return out;
}

/** descricao legivel de um valor — canal guarda objeto, o resto guarda string */
const descOf = (dim, raw) => dim === 'canal'
  ? `${(raw && raw.utm_source) || '?'} / ${(raw && raw.utm_medium) || '?'}`
  : String(raw ?? '');

/* usado pela validacao dos campos de token */
const dictOf = dim => allVals(dim);
const isKnown = (dim, v) => !!v && Object.prototype.hasOwnProperty.call(dictOf(dim), v);
const canalCfg = () => (CUSTOM.canal && CUSTOM.canal[S.canal]) || (TX.canal || {})[S.canal] || null;

const saveDict = () => {
  localStorage.setItem(LS_DICT, JSON.stringify(CUSTOM));
  localStorage.setItem(LS_HIDE, JSON.stringify(HIDDEN));
};

/* ── mutacoes ── */

function dictSet(dim, v, val) {
  CUSTOM[dim] = CUSTOM[dim] || {};
  CUSTOM[dim][v] = val;
  if (HIDDEN[dim]) delete HIDDEN[dim][v];
  saveDict(); afterDict();
}

function dictRemove(dim, v) {
  const antesCustom = isCustom(dim, v) ? CUSTOM[dim][v] : undefined;
  const eraBase = isBase(dim, v);

  if (antesCustom !== undefined) delete CUSTOM[dim][v];
  if (eraBase) { HIDDEN[dim] = HIDDEN[dim] || {}; HIDDEN[dim][v] = 1; }
  saveDict(); afterDict();

  toast(`<b>${esc(v)}</b> removido de ${esc(DIM_LABEL[dim])}.`, () => {
    if (eraBase && HIDDEN[dim]) delete HIDDEN[dim][v];
    if (antesCustom !== undefined) { CUSTOM[dim] = CUSTOM[dim] || {}; CUSTOM[dim][v] = antesCustom; }
    saveDict(); afterDict();
  });
}

function dictRestore(dim, v) {
  if (HIDDEN[dim]) delete HIDDEN[dim][v];
  saveDict(); afterDict();
}

/* tudo que precisa reagir a uma mudanca no dicionario */
function afterDict() {
  syncCombos();
  /* dropdown aberto precisa refletir a mudanca na hora */
  Object.keys(CBX).forEach(k => { if (!CBX[k].pop.hidden) cbxFilter(k); });
  if (view === 'dicionario') renderDims();
  update();
  go('anuncios');
}

/* ═══════════════ nomes ═══════════════ */

/* Campo sem 'modo' vale em todos. Fora do modo ativo ele nao existe:
   nao aparece, nao valida e nao entra em nome nenhum. */
const campoAtivo = k => !FIELDS[k].modo || FIELDS[k].modo === canalTab;
const secoesAtivas = () => SECOES[canalTab];
/* bloco 4 so entra na URL se alguem preencheu algo nele */
const temAnuncio = () => TOKENS[canalTab].a.some(k => S[k]);

/* so entra no nome o valor que passa na validacao do proprio campo —
   senao o preview monta um nome com um valor que o Salvar vai recusar */
function tok(k) {
  const st = fieldState(k);
  return st.s === 'ok' || st.s === 'novo' ? S[k] : null;
}

function tokOuNa(k) {
  if (!S[k]) return FIELDS[k].req ? null : 'na';
  return tok(k);
}

/* que campos formam utm_content e utm_term em cada modo */
const TOKENS = {
  anuncio:  { j: ['publico', 'detalhe', 'posicionamento'], a: ['formato', 'angulo', 'gancho', 'versao'] },
  organico: { j: ['segmento', 'segmento_detalhe'],         a: ['peca', 'posicao', 'assunto', 'peca_versao'] },
  inside:   { j: ['vendedor', 'origem_lead'],              a: ['etapa', 'material', 'inside_versao'] },
  cs:       { j: ['agente', 'situacao'],                   a: ['acao', 'material_cs', 'cs_versao'] }
};

function nomes() {
  const ok = arr => arr.every(v => v && TOKEN_RE.test(v));
  const c = ['objetivo', 'produto', 'funil', 'geo', 'periodo'].map(tokOuNa);
  const { j: jk, a: ak } = TOKENS[canalTab];

  const j = jk.map(tokOuNa);
  const a = ak.map(tokOuNa);
  const tem = ak.some(k => S[k]);   /* bloco 4 e opcional nos dois modos */

  return {
    campanha: ok(c) ? c.join('_') : null,
    conjunto: ok(j) ? j.join('_') : null,
    anuncio:  tem && ok(a) ? a.join('_') : null
  };
}

/* ═══════════════ estado de campo ═══════════════ */

function fieldState(k) {
  const f = FIELDS[k];
  if (!campoAtivo(k)) return { s: 'off' };
  const v = S[k];
  if (!v) return { s: f.req ? 'vazio' : 'off' };
  if (f.kind === 'canal') return { s: 'ok' };
  if (f.kind === 'url') {
    try { new URL(v); } catch { return { s: 'bad', why: 'URL invalida' }; }
    return { s: 'ok' };
  }
  if (f.re && !RE_MAP[f.re].test(v)) return { s: 'bad', why: 'fora do formato' };
  if (f.chk && !f.chk(v)) return { s: 'bad', why: f.chkWhy || 'valor invalido' };
  if (!TOKEN_RE.test(v)) return { s: 'bad', why: 'caracteres invalidos' };
  if (f.kind === 'combo') return isKnown(f.dim, v) ? { s: 'ok' } : { s: 'novo' };
  return { s: 'ok' };
}

/* ═══════════════ combobox ═══════════════ */

const CBX = {};
const dimOf = k => (FIELDS[k].kind === 'canal' ? 'canal' : FIELDS[k].dim);

function cbxSetup(k) {
  const el = $(`[data-cbx="${k}"]`);
  if (!el) return;

  const c = CBX[k] = {
    k, el,
    inp:   el.querySelector('.inp'),
    pop:   el.querySelector('.cbx__pop'),
    list:  el.querySelector('.cbx__list'),
    empty: el.querySelector('.cbx__empty'),
    novo:  el.querySelector('.cbx__new'),
    hi: -1,
    dirty: false   /* so filtra depois que a pessoa digita algo */
  };
  const canal = FIELDS[k].kind === 'canal';

  /* clique dentro do popup nao pode tirar o foco do input */
  c.pop.addEventListener('mousedown', e => e.preventDefault());

  c.pop.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      e.stopPropagation();
      const [dim, v] = rm.dataset.rm.split('|');
      return dictRemove(dim, v);
    }
    const opt = e.target.closest('.opt');
    if (opt && !opt.dataset.removed) return cbxChoose(k, opt);
  });

  el.querySelector('[data-toggle]').addEventListener('click', () => {
    if (c.pop.hidden) { cbxOpen(k); c.inp.focus(); } else cbxClose(k);
  });

  c.inp.addEventListener('focus', () => cbxOpen(k));
  c.inp.addEventListener('blur', () => {
    cbxClose(k);
    if (canal) syncCanal();
    else { TOUCHED.add(k); update(); }
  });

  c.inp.addEventListener('input', () => {
    if (canal) { cbxOpen(k); c.dirty = true; cbxFilter(k); return; }
    const raw = c.inp.value;
    const caret = c.inp.selectionStart;
    const v = slug(raw);
    S[k] = v;
    if (v !== raw) {
      c.inp.value = v;
      const d = raw.length - v.length;
      try { c.inp.setSelectionRange(caret - d, caret - d); } catch {}
    }
    cbxOpen(k);
    c.dirty = true;
    cbxFilter(k);
    update();
  });

  c.inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); c.pop.hidden ? cbxOpen(k) : cbxMove(k, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cbxMove(k, -1); }
    else if (e.key === 'Enter') {
      const vis = cbxVisible(k);
      if (!c.pop.hidden && c.hi >= 0 && vis[c.hi]) { e.preventDefault(); cbxChoose(k, vis[c.hi]); }
      else cbxClose(k);
    }
    else if (e.key === 'Escape') { if (!c.pop.hidden) { e.stopPropagation(); cbxClose(k); } }
    else if (e.key === 'Tab') cbxClose(k);
  });
}

const cbxVisible = k => Array.from(CBX[k].list.querySelectorAll('.opt')).filter(o => !o.hidden);

function cbxOpen(k) {
  const c = CBX[k];
  Object.keys(CBX).forEach(o => { if (o !== k) cbxClose(o); });
  c.pop.hidden = false;
  c.el.classList.add('is-open');
  c.inp.setAttribute('aria-expanded', 'true');
  c.dirty = false;          /* abriu: mostra a lista inteira */
  cbxFilter(k);
}

function cbxClose(k) {
  const c = CBX[k];
  if (!c || c.pop.hidden) return;
  c.pop.hidden = true;
  c.el.classList.remove('is-open');
  c.inp.setAttribute('aria-expanded', 'false');
  c.hi = -1;
  c.list.querySelectorAll('.is-hi').forEach(o => o.classList.remove('is-hi'));
}

function cbxFilter(k) {
  const c = CBX[k];
  const canal = FIELDS[k].kind === 'canal';
  /* enquanto ninguem digitou, a lista vem inteira — mesmo com um valor
     ja escolhido no campo, senao reabrir o dropdown mostraria so ele */
  const q = c.dirty ? c.inp.value.trim().toLowerCase() : '';

  let visiveis = 0;
  c.list.querySelectorAll('.opt').forEach(o => {
    const naAba = !canal || o.dataset.tipo === canalTab;
    const hit = !o.dataset.removed && naAba && (!q || o.dataset.search.includes(q));
    o.hidden = !hit;
    if (hit) visiveis++;
    o.classList.toggle('is-on', o.dataset.val === (canal ? S.canal : S[k]));
  });

  /* titulo de grupo sem nenhum item visivel nao deve aparecer */
  c.list.querySelectorAll('[data-g]').forEach(g => {
    let n = 0;
    for (let el = g.nextElementSibling; el && el.classList.contains('opt'); el = el.nextElementSibling) {
      if (!el.hidden) n++;
    }
    g.hidden = n === 0;
  });

  c.empty.hidden = visiveis > 0;
  if (canal && !visiveis) {
    c.empty.textContent = q
      ? `nenhum canal de ${TIPO_LABEL[canalTab].toLowerCase()} com esse texto`
      : `nenhum canal de ${TIPO_LABEL[canalTab].toLowerCase()} no dicionario`;
  }
  c.hi = -1;
  c.list.querySelectorAll('.is-hi').forEach(o => o.classList.remove('is-hi'));

  if (c.novo) {
    const st = fieldState(k);
    c.novo.hidden = st.s !== 'novo';
    const b = c.novo.querySelector('[data-newval]');
    if (b) b.textContent = S[k] || '';
  }
}

function cbxMove(k, dir) {
  const c = CBX[k];
  const vis = cbxVisible(k);
  if (!vis.length) return;
  c.list.querySelectorAll('.is-hi').forEach(o => o.classList.remove('is-hi'));
  c.hi = (c.hi + dir + vis.length) % vis.length;
  const el = vis[c.hi];
  el.classList.add('is-hi');
  el.scrollIntoView({ block: 'nearest' });
}

function cbxChoose(k, opt) {
  const c = CBX[k];
  const v = opt.dataset.val;
  if (FIELDS[k].kind === 'canal') {
    S.canal = v;
    c.inp.value = opt.dataset.label || v;
  } else {
    S[k] = v;
    c.inp.value = v;
  }
  TOUCHED.add(k);
  cbxClose(k);
  c.inp.focus();
  update();
}

function syncCanal() {
  const c = CBX.canal;
  if (c) c.inp.value = canalCfg()?.label || '';
}

/** reflete o dicionario atual nas listas ja renderizadas no HTML */
function syncCombos() {
  for (const k of Object.keys(CBX)) {
    const dim = dimOf(k);
    if (!dim) continue;
    const vals = allVals(dim);
    const c = CBX[k];

    c.list.querySelectorAll('.opt').forEach(o => {
      const v = o.dataset.val;
      const vivo = Object.prototype.hasOwnProperty.call(vals, v);
      if (vivo) delete o.dataset.removed; else o.dataset.removed = '1';
      if (!vivo) return;

      const raw = vals[v];
      const label = dim === 'canal' ? (raw.label || v) : v;
      const desc = descOf(dim, raw);
      o.querySelector('.opt__v').textContent = label;
      o.querySelector('.opt__d').textContent = desc;
      o.dataset.label = label;
      if (dim === 'canal') o.dataset.tipo = tipoDoCanal(raw);
      o.dataset.search = `${v} ${label} ${desc}`.toLowerCase();
    });

    for (const [v, raw] of Object.entries(vals)) {
      if (!c.list.querySelector(`.opt[data-val="${CSS.escape(v)}"]`)) cbxAddOpt(k, dim, v, raw);
    }
  }
  syncCanal();
}

function cbxAddOpt(k, dim, v, raw) {
  const c = CBX[k];
  if (!c || c.list.querySelector(`.opt[data-val="${CSS.escape(v)}"]`)) return;

  const canal = dim === 'canal';
  const label = canal ? (raw.label || v) : v;
  const desc = descOf(dim, raw);

  const el = document.createElement('div');
  el.className = 'opt';
  el.setAttribute('role', 'option');
  el.dataset.val = v;
  el.dataset.label = label;
  if (canal) el.dataset.tipo = tipoDoCanal(raw);
  el.dataset.search = `${v} ${label} ${desc}`.toLowerCase();
  el.innerHTML =
    `<span class="opt__v">${esc(label)}</span><span class="opt__d">${esc(desc)}</span>` +
    `<span class="opt__x" role="button" data-rm="${dim}|${esc(v)}" title="Remover do dicionario">${SVG(IC.x, 12)}</span>`;

  if (canal) {
    const tipo = el.dataset.tipo;
    const grupo = raw.grupo || 'Outros';
    let head = Array.from(c.list.querySelectorAll('[data-g]'))
      .find(g => g.dataset.g === grupo && g.dataset.tipo === tipo);
    if (!head) {
      head = document.createElement('div');
      head.className = 'cbx__g';
      head.dataset.g = grupo;
      head.dataset.tipo = tipo;
      head.textContent = grupo;
      c.list.insertBefore(head, c.empty);
    }
    let last = head;
    for (let n = head.nextElementSibling; n && n.classList.contains('opt'); n = n.nextElementSibling) last = n;
    last.after(el);
  } else {
    const irmaos = Array.from(c.list.querySelectorAll('.opt'));
    const depois = irmaos.find(x => x.dataset.val > v);
    c.list.insertBefore(el, depois || c.empty);
  }
}

/* ═══════════════ tela do dicionario ═══════════════ */

let formAberto = null;   /* `${dim}|${valor||''}` */

function renderDims() {
  $('#dims').innerHTML = DIMS.map(dimCard).join('');
}

function dimCard(dim) {
  const vals = allVals(dim);
  const keys = Object.keys(vals).sort();
  const oc = hiddenVals(dim);
  const ocKeys = Object.keys(oc).sort();
  const aberto = formAberto && formAberto.split('|')[0] === dim;

  return `<div class="dim" data-dim="${dim}" id="dim-${dim}">
    <div class="dim__h">
      <span class="dim__t">${esc(DIM_LABEL[dim])}</span>
      <span class="dim__c">${keys.length}</span>
      <button type="button" class="btn btn--sm" data-dimadd="${dim}">${SVG(IC.plus, 12)} Adicionar</button>
    </div>
    ${aberto ? dimForm(dim, formAberto.split('|')[1]) : ''}
    <div class="dim__l">
      ${keys.length
        ? keys.map(v => dimRow(dim, v, vals[v])).join('')
        : '<div class="dim__e">nenhum valor ainda — clique em <b>Adicionar</b></div>'}
    </div>
    ${ocKeys.length ? `<details class="dim__hid">
      <summary>${ocKeys.length} removido${ocKeys.length > 1 ? 's' : ''} da base</summary>
      ${ocKeys.map(v => `<div class="dim__r is-off">
        <span class="dim__v">${esc(v)}</span>
        <span class="dim__d">${esc(descOf(dim, oc[v]))}</span>
        <span class="dim__acts">
          <button type="button" class="btn btn--sm btn--ghost" data-dimrestore="${dim}|${esc(v)}">Restaurar</button>
        </span>
      </div>`).join('')}
    </details>` : ''}
  </div>`;
}

function dimRow(dim, v, raw) {
  const custom = isCustom(dim, v);
  const base = isBase(dim, v);
  const tag = custom && !base ? 'novo' : custom ? 'editado' : '';
  return `<div class="dim__r" data-v="${esc(v)}">
    <span class="dim__v">${esc(v)}</span>
    <span class="dim__d">${esc(descOf(dim, raw))}</span>
    ${tag ? `<span class="dim__tag">${tag}</span>` : ''}
    <span class="dim__acts">
      <button type="button" class="ico ico--xs" data-dimedit="${dim}|${esc(v)}" title="Editar">${SVG(IC.pencil, 13)}</button>
      <button type="button" class="ico ico--xs ico--del" data-dimdel="${dim}|${esc(v)}" title="Remover">${SVG(IC.x, 13)}</button>
    </span>
  </div>`;
}

function dimForm(dim, editV) {
  const cur = editV ? allVals(dim)[editV] : null;
  const canal = dim === 'canal';
  const val = (k) => esc(canal && cur ? (cur[k] ?? '') : '');

  const campos = canal
    ? `<input class="inp inp--sm" data-df="v" placeholder="chave (ex: pinterest)" value="${esc(editV || '')}" ${editV ? 'disabled' : ''}>` +
      CANAL_COLS.map(c => c.opts
        ? `<select class="inp inp--sm" data-df="${c.k}">${c.opts.map(o =>
             `<option value="${o}"${val(c.k) === o ? ' selected' : ''}>${TIPO_LABEL[o] || o}</option>`).join('')}</select>`
        : `<input class="inp inp--sm" data-df="${c.k}" placeholder="${c.ph}" value="${val(c.k)}">`).join('')
    : `<input class="inp inp--sm" data-df="v" placeholder="valor (ex: black-friday)" value="${esc(editV || '')}" ${editV ? 'disabled' : ''}>
       <input class="inp inp--sm dform__wide" data-df="d" placeholder="descricao curta" value="${esc(cur ?? '')}">`;

  return `<div class="dform">
    <div class="dform__g">${campos}</div>
    <div class="dform__a">
      <span class="dform__e" data-dferr hidden></span>
      <button type="button" class="btn btn--sm" data-dfcancel>Cancelar</button>
      <button type="button" class="btn btn--sm btn--primary" data-dfsave="${dim}|${esc(editV || '')}">
        ${editV ? 'Salvar alteracao' : 'Adicionar'}
      </button>
    </div>
  </div>`;
}

function dimFormOpen(dim, editV) {
  formAberto = `${dim}|${editV || ''}`;
  renderDims();
  const f = $(`#dim-${dim} [data-df="${editV ? (dim === 'canal' ? 'label' : 'd') : 'v'}"]`);
  if (f) f.focus();
  $(`#dim-${dim}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function dimFormSave(dim, editV) {
  const card = $(`#dim-${dim}`);
  const get = k => (card.querySelector(`[data-df="${k}"]`)?.value ?? '').trim();
  const err = m => {
    const e = card.querySelector('[data-dferr]');
    e.hidden = false; e.textContent = m;
  };

  const v = editV || slug(get('v'));
  if (!v) return err('informe o valor');
  if (!TOKEN_RE.test(v)) return err('use so a-z, 0-9 e hifen');
  if (!editV && allVals(dim)[v] !== undefined) return err(`"${v}" ja existe`);

  if (dim === 'canal') {
    const cfg = {};
    for (const c of CANAL_COLS) cfg[c.k] = get(c.k);
    if (!cfg.label) return err('informe o nome exibido');
    if (!cfg.utm_source || !cfg.utm_medium) return err('utm_source e utm_medium sao obrigatorios');
    cfg.grupo = cfg.grupo || 'Outros';
    cfg.tipo = TIPO_LABEL[cfg.tipo] ? cfg.tipo : 'anuncio';
    cfg.utm_source_platform = cfg.utm_source_platform || 'manual';
    dictSet(dim, v, cfg);
  } else {
    dictSet(dim, v, get('d') || v);
  }

  formAberto = null;
  renderDims();
  toast(`<b>${esc(v)}</b> ${editV ? 'atualizado' : 'adicionado'} em ${esc(DIM_LABEL[dim])}.`);
}

/* adicionar direto do dropdown, sem sair do formulario */
function addFromCombo(k) {
  const dim = dimOf(k);
  const v = S[k];
  if (!dim || !v || !TOKEN_RE.test(v)) return;
  dictSet(dim, v, v);
  toast(`<b>${esc(v)}</b> adicionado em ${esc(DIM_LABEL[dim])}. Descreva melhor no Dicionario.`);
}

/* ═══════════════ toast ═══════════════ */

let toastTimer;
function toast(msg, undo) {
  const el = $('#toast');
  $('#toast-t').innerHTML = msg;
  const u = $('#toast-u');
  u.hidden = !undo;
  u.onclick = () => { el.hidden = true; if (undo) undo(); };
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, undo ? 7000 : 3200);
}

/* ═══════════════ validacao ═══════════════ */

function problemas() {
  const faltando = [], invalidos = [], lp = [];

  for (const [k, f] of Object.entries(FIELDS)) {
    const st = fieldState(k);
    if (st.s === 'vazio') faltando.push({ k, label: f.label });
    else if (st.s === 'bad') invalidos.push({ k, label: f.label, why: st.why, val: S[k] });
  }

  if (S.lp) {
    try {
      const u = new URL(S.lp);
      for (const key of u.searchParams.keys()) {
        if (key.startsWith('utm_')) lp.push(`A landing page ja contem <code>${esc(key)}</code>. Remova — vai duplicar.`);
      }
    } catch {}
  }
  return { faltando, invalidos, lp };
}

function avisos() {
  const out = [];

  const novos = Object.keys(FIELDS).filter(k => fieldState(k).s === 'novo');
  if (novos.length) {
    out.push({
      t: 'w',
      m: `Valor fora do dicionario em ${novos.map(k => `<b>${FIELDS[k].label}</b>`).join(', ')}. Funciona normal — abra o campo e clique em <b>Adicionar ao dicionario</b> se quiser que vire sugestao para o time.`
    });
  }

  if (S.lp) {
    try {
      const u = new URL(S.lp);
      if (u.protocol !== 'https:') out.push({ t: 'w', m: 'A landing page nao esta em <b>https</b>.' });
      if (isGoogleAds(S.canal) || isMsAds(S.canal)) {
        if (u.search) out.push({ t: 'i', m: 'Essa LP <b>tem</b> query string, entao o <code>&amp;</code> do template funciona aqui.' });
        else out.push({ t: 'w', m: 'Essa LP <b>nao tem</b> query string. Vale testar o template no botao <b>Testar</b> do Google Ads — <code>{lpurl}&amp;</code> pode gerar URL sem <code>?</code>.' });
      }
    } catch {}
  }

  /* link interno com UTM e o erro classico de auto-referencia:
     zera a origem real de quem chegou por anuncio e abre sessao nova */
  if (S.canal === 'blog' && S.lp) {
    try {
      const host = new URL(S.lp).hostname.replace(/^www\./, '');
      out.push({
        t: 'w',
        m: `Se o blog estiver em <b>${esc(host)}</b> — o mesmo dominio da landing page — esta UTM <b>apaga a origem real</b> do visitante e abre uma sessao nova no GA4. Quem veio de um anuncio vira "blog". Use so quando o link sai do dominio; para link interno, prefira um parametro sem <code>utm_</code> lido pelo GTM.`
      });
    } catch {}
  }

  const cfg = canalCfg();
  if (cfg?.utm_source_platform === 'manual') out.push({ t: 'i', m: 'Canal sem macro: distribua a <b>URL final</b> pronta ao lado.' });
  if (S.canal === 'linkedin') out.push({ t: 'w', m: 'LinkedIn <b>nao tem macro de URL</b>. Tudo digitado a mao — copie a URL final e confira antes de publicar.' });

  return out;
}

/* ═══════════════ coloracao ═══════════════ */

const OPEN = '‹M›';
const CLOSE = '‹/M›';

function colorize(s) {
  return esc(s)
    .replace(/(\{\{[^{}]*\}\}|\{[^{}]*\}|__[A-Z_]+__)/g, `${OPEN}$1${CLOSE}`)
    .replace(/(^|&amp;|\?)([a-zA-Z_]+)=/g, '$1<span class="k">$2</span><span class="eq">=</span>')
    .replace(/&amp;/g, '<span class="amp">&amp;</span>')
    .replace(/\?/g, '<span class="amp">?</span>')
    .split(OPEN).join('<span class="macro">')
    .split(CLOSE).join('</span>');
}
const colorNome = s => esc(s).split('_')
  .map(p => `<span>${p}</span>`).join('<span class="sep">_</span>');

/* ═══════════════ render ═══════════════ */

function update() {
  const n = nomes();

  for (const [k, f] of Object.entries(FIELDS)) {
    const st = fieldState(k);
    const mostra = TOUCHED.has(k);
    const badge = $(`#b-${k}`);
    const hint  = $(`#h-${k}`);
    const input = $(`#i-${k}`);

    if (input && f.kind !== 'canal') input.classList.toggle('is-bad', st.s === 'bad' && mostra);

    if (badge) {
      if (st.s === 'novo') setBadge(badge, 'novo', 'valor novo');
      else if (st.s === 'bad' && mostra) setBadge(badge, 'bad', st.why);
      else badge.hidden = true;
    }

    if (!hint || f.kind === 'canal') continue;
    if (st.s === 'ok' && f.kind === 'combo') hint.innerHTML = esc(dictOf(f.dim)[S[k]] || '');
    else if (st.s === 'novo') hint.innerHTML = 'nao esta no dicionario — sera aceito assim mesmo';
    else if (st.s === 'bad' && mostra) hint.innerHTML = esc(st.why);
    else hint.innerHTML = f.hint || '';
    hint.className = 'fld__h' + (st.s === 'bad' && mostra ? ' is-err' : st.s === 'ok' && f.kind === 'combo' ? ' is-ok' : '');
  }

  const cfg = canalCfg();
  $('#canal-map').innerHTML = cfg
    ? [['utm_source', cfg.utm_source], ['utm_medium', cfg.utm_medium], ['utm_source_platform', cfg.utm_source_platform]]
        .map(([k, v]) => `<span class="srcmap__i"><span class="srcmap__k">${k}</span><span class="srcmap__v">${esc(v)}</span></span>`).join('')
    : '<span class="srcmap__ph">escolha o canal para ver source, medium e platform</span>';

  const cb = $('#canal-badge');
  cb.hidden = !cfg;
  if (cfg) cb.textContent = cfg.label;

  let prontos = 0;
  for (const id of ['campanha', 'conjunto', 'anuncio']) {
    const el = $(`#pv-${id}`);
    const val = n[id];
    if (val) prontos++;
    el.innerHTML = val ? colorNome(val) : `<span class="ph">${el.dataset.vazio}</span>`;
    el.dataset.val = val || '';
    $(`#nmw-${id}`).classList.toggle('is-full', !!val);
    $(`[data-cp="pv-${id}"]`).disabled = !val;
  }
  const alvo = temAnuncio() ? 3 : 2;
  $('#prog-t').textContent = `${prontos} de ${alvo} nome${alvo > 1 ? 's' : ''}`;
  $('#prog').classList.toggle('is-full', prontos >= alvo);
  $$('#prog .prog__d').forEach((d, i) => {
    d.hidden = i >= alvo;
    d.classList.toggle('is-on', i < prontos);
  });

  $$('.blk[data-modo]').forEach(b => { b.hidden = b.dataset.modo !== canalTab; });
  PREVIEWS[canalTab].forEach(pv => {
    const t = $(`[data-nmt="${pv.id}"]`);
    const m = $(`[data-nmm="${pv.id}"]`);
    const v = $(`#pv-${pv.id}`);
    if (t) t.textContent = pv.titulo;
    if (m) m.textContent = pv.map;
    if (v) v.dataset.vazio = pv.vazio;
  });

  for (const sec of secoesAtivas()) {
    const ks = sec.rows.flat();
    const req = ks.filter(k => FIELDS[k].req);
    const bloco = $(`.blk[data-sec="${sec.n}"]`);
    const st = $(`[data-st="${sec.n}"]`);

    if (req.length) {
      const ok = req.filter(k => ['ok', 'novo'].includes(fieldState(k).s)).length;
      bloco.classList.toggle('is-done', ok === req.length);
      st.textContent = ok === req.length ? 'completo' : `${ok}/${req.length}`;
    } else {
      const cheios = ks.filter(k => S[k]).length;
      const algumBad = ks.some(k => fieldState(k).s === 'bad');
      bloco.classList.toggle('is-done', cheios > 0 && !algumBad);
      st.textContent = cheios ? `${cheios}/${ks.length}` : 'opcional';
    }
  }

  const defs = [['url', 'URL final']]
    .concat(isDyn(S.canal) ? [['tt', usaCustomParam(S.canal) ? 'Tracking template' : 'URL parameters']] : []);
  if (!defs.some(d => d[0] === tab)) tab = 'url';
  $('#tabs').className = 'tabs' + (defs.length === 1 ? ' tabs--one' : '');
  $('#tabs').innerHTML = defs
    .map(([id, label]) => `<button type="button" class="tab${tab === id ? ' is-on' : ''}" data-tab="${id}">${label}</button>`)
    .join('');
  $('#pane').innerHTML = pane(n);

  const p = problemas();
  const linhas = [];
  p.invalidos.filter(x => TOUCHED.has(x.k)).forEach(x => linhas.push({
    t: 'e', m: `<b>${x.label}</b>: <code>${esc(x.val)}</code> ${x.why}.`
  }));
  p.lp.forEach(m => linhas.push({ t: 'e', m }));
  if (p.faltando.length) {
    const lista = p.faltando.length <= 4
      ? p.faltando.map(x => `<b>${x.label}</b>`).join(', ')
      : `${p.faltando.length} campos`;
    linhas.push({ t: 'sum', m: `Faltam preencher: ${lista}.` });
  }
  avisos().forEach(a => linhas.push(a));

  $('#alerts').innerHTML = linhas.map(a =>
    `<div class="al al--${a.t}"><span class="al__ic">${SVG(a.t === 'i' ? IC.info : a.t === 'sum' ? IC.dots : IC.alert, 13)}</span><span>${a.m}</span></div>`
  ).join('');

  $('#btn-save').disabled = !!(p.faltando.length || p.invalidos.length || p.lp.length);

  const h = hist();
  const nb = $('#nav-hist');
  nb.hidden = !h.length;
  nb.textContent = h.length;
}

function setBadge(el, kind, txt) {
  el.hidden = false;
  el.className = `fld__badge fld__badge--${kind}`;
  el.textContent = txt;
}

const codeBox = (texto, id) =>
  `<div class="code">
     <div class="code__b"><div class="mono" id="${id}">${colorize(texto)}</div></div>
     ${btnCopy(id)}
   </div>`;

/* ═══════════════ painel de saida ═══════════════ */

function pane(n) {
  if (tab === 'tt') return paneTemplate(n);

  const u = urlFinal(S, canalCfg(), n);
  if (!u) return `<div class="out"><div class="empty">${SVG(IC.link, 22)}<span>escolha o canal e informe a landing page</span></div></div>`;
  return `<div class="out">
    <div class="out__h"><span class="out__len">${u.length} chars</span></div>
    ${codeBox(u, 'o-url')}
    ${isDyn(S.canal)
      ? `<div class="note">Essa plataforma preenche a URL sozinha. Em producao use a aba <b>${usaCustomParam(S.canal) ? 'Tracking template' : 'URL parameters'}</b> — esta URL serve para teste manual.</div>`
      : ''}
  </div>`;
}

function paneTemplate(n) {
  const gads = usaCustomParam(S.canal);
  const t = trackingTemplate(S, canalCfg(), n, variante);
  const cps = customParams(n);

  const toggle = gads ? `<div class="seg">
      <button type="button" class="seg__b${variante === 'completo' ? ' is-on' : ''}" data-var="completo">Completo</button>
      <button type="button" class="seg__b${variante === 'simples' ? ' is-on' : ''}" data-var="simples">Simples</button>
    </div>` : '';

  const params = gads ? `<div class="cps">
      <div class="cps__t">Custom parameters da campanha</div>
      ${cps.length
        ? cps.map(([k, v]) => `<div class="cps__r">
             <span class="cps__k">${k}</span>
             <span class="cps__v" id="cpv-${k.slice(1)}" data-val="${esc(v)}">${esc(v)}</span>
             ${btnCopy(`cpv-${k.slice(1)}`)}
           </div>`).join('')
        : '<div class="cps__e">complete os blocos 2 e 4 para gerar os valores</div>'}
    </div>` : '';

  return `<div class="out">
    <div class="out__h">${toggle}<span class="out__len">${t.length} chars</span></div>
    ${codeBox(t, 'o-tt')}
    ${params}
    <div class="note">${gads
      ? 'Template <b>fixo</b> da conta — cola uma vez em <b>Configuracoes da campanha &rarr; Opcoes de URL</b>. O que muda a cada campanha sao os custom parameters acima.'
      : 'Cole no campo <b>Parametros de URL</b> do anuncio, sem <code>?</code> inicial. As macros preenchem sozinhas.'}</div>
  </div>`;
}

/* ═══════════════ export ═══════════════ */

function exportDict() {
  const merged = JSON.parse(JSON.stringify(TX));
  for (const dim of DIMS) {
    merged[dim] = merged[dim] || {};
    for (const v of Object.keys(HIDDEN[dim] || {})) delete merged[dim][v];
    Object.assign(merged[dim], CUSTOM[dim] || {});
  }
  merged._meta.atualizado_em = new Date().toISOString().slice(0, 10);
  download('dicionario.json', JSON.stringify(merged, null, 2), 'application/json');
}

/* ═══════════════ historico ═══════════════ */

const hist = () => { try { return JSON.parse(localStorage.getItem(LS_HIST) || '[]'); } catch { return []; } };

function renderHist() {
  const h = hist();
  const box = $('#hist');
  if (!h.length) {
    box.innerHTML = `<div class="tablewrap"><div class="empty">${SVG(IC.hist, 22)}<span>nenhuma campanha salva ainda — gere e clique em <b>Salvar campanha</b></span></div></div>`;
    return;
  }
  box.innerHTML = `<div class="tablewrap"><div class="scroll"><table>
    <thead><tr><th>Data</th><th>Canal</th><th>Campanha</th><th>Conjunto</th><th>Anuncio</th><th></th></tr></thead>
    <tbody>${h.slice().reverse().map((r, i) => `<tr>
      <td style="white-space:nowrap">${esc(r.ts)}</td>
      <td>${esc(r.canal)}</td>
      <td class="mono">${colorNome(r.campanha || '')}</td>
      <td class="mono">${colorNome(r.conjunto || '')}</td>
      <td class="mono">${colorNome(r.anuncio || '')}</td>
      <td><span id="hu-${i}" data-val="${esc(r.url || '')}" hidden></span>${btnCopy(`hu-${i}`)}</td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

function csv() {
  const cols = ['ts', 'canal', 'utm_source', 'utm_medium', 'campanha', 'conjunto', 'anuncio', 'lp', 'url'];
  const rows = [cols.join(',')].concat(
    hist().map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
  );
  download('utm-historico.csv', rows.join('\n'), 'text/csv;charset=utf-8');
}

function download(name, body, type) {
  const href = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/* ═══════════════ copiar ═══════════════ */

function doCopy(btn) {
  const src = $(`#${btn.dataset.cp}`);
  const val = 'val' in src.dataset ? src.dataset.val : src.textContent;
  if (!val) return;
  navigator.clipboard.writeText(val);
  btn.classList.add('is-done');
  setTimeout(() => btn.classList.remove('is-done'), 1300);
}

/* ═══════════════ navegacao ═══════════════ */

function go(v, foco) {
  if (!VIEWS[v]) return;
  view = v;
  const cfgV = VIEWS[v];
  $$('.view').forEach(s => s.classList.toggle('is-on', s.dataset.view === cfgV.sec));
  $$('.nav__i').forEach(b => b.classList.toggle('is-on', b.dataset.view === v));

  if (cfgV.modo) {
    canalTab = cfgV.modo;
    /* canal escolhido no outro modo nao vale aqui */
    const cfg = canalCfg();
    if (cfg && tipoDoCanal(cfg) !== canalTab) {
      delete S.canal;
      syncCanal();
    }
    update();
  }
  $('#page-t').textContent = VIEWS[v].t;
  $('#page-s').textContent = VIEWS[v].s;
  $$('[data-acts]').forEach(el => { el.hidden = el.dataset.acts !== cfgV.sec; });
  document.body.classList.remove('nav-open');

  if (v === 'historico') renderHist();
  if (v === 'dicionario') { formAberto = null; renderDims(); }

  if (foco) {
    const card = $(`#dim-${foco}`);
    if (card) {
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      card.classList.add('is-flash');
      setTimeout(() => card.classList.remove('is-flash'), 1400);
      return;
    }
  }
  window.scrollTo({ top: 0 });
}

/* ═══════════════ init ═══════════════ */

export function init() {
  try { CUSTOM = JSON.parse(localStorage.getItem(LS_DICT) || '{}'); } catch { CUSTOM = {}; }
  try { HIDDEN = JSON.parse(localStorage.getItem(LS_HIDE) || '{}'); } catch { HIDDEN = {}; }

  Object.keys(FIELDS).forEach(k => { if ($(`[data-cbx="${k}"]`)) cbxSetup(k); });
  syncCombos();

  for (const [k, f] of Object.entries(FIELDS)) {
    if (CBX[k]) continue;
    const el = $(`#i-${k}`);
    if (!el) continue;
    el.addEventListener('input', () => {
      const raw = el.value;
      if (f.kind === 'url') {
        S[k] = raw.trim();
      } else {
        const caret = el.selectionStart;
        const v = slug(raw);
        S[k] = v;
        if (v !== raw) {
          el.value = v;
          const d = raw.length - v.length;
          try { el.setSelectionRange(caret - d, caret - d); } catch {}
        }
      }
      update();
    });
    el.addEventListener('blur', () => { TOUCHED.add(k); update(); });
  }

  document.addEventListener('click', e => {
    const nv = e.target.closest('.nav__i');
    if (nv) return go(nv.dataset.view);

    const man = e.target.closest('[data-manage]');
    if (man) return go('dicionario', man.dataset.manage);

    const add = e.target.closest('[data-add]');
    if (add) return addFromCombo(add.dataset.add);

    const dAdd = e.target.closest('[data-dimadd]');
    if (dAdd) return dimFormOpen(dAdd.dataset.dimadd, '');

    const dEdit = e.target.closest('[data-dimedit]');
    if (dEdit) { const [d, v] = dEdit.dataset.dimedit.split('|'); return dimFormOpen(d, v); }

    const dDel = e.target.closest('[data-dimdel]');
    if (dDel) { const [d, v] = dDel.dataset.dimdel.split('|'); return dictRemove(d, v); }

    const dRes = e.target.closest('[data-dimrestore]');
    if (dRes) { const [d, v] = dRes.dataset.dimrestore.split('|'); return dictRestore(d, v); }

    const dSave = e.target.closest('[data-dfsave]');
    if (dSave) { const [d, v] = dSave.dataset.dfsave.split('|'); return dimFormSave(d, v); }

    if (e.target.closest('[data-dfcancel]')) { formAberto = null; return renderDims(); }

    const cp = e.target.closest('[data-cp]');
    if (cp) return doCopy(cp);

    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; return update(); }

    const vr = e.target.closest('[data-var]');
    if (vr) { variante = vr.dataset.var; return update(); }

    if (!e.target.closest('.cbx')) Object.keys(CBX).forEach(cbxClose);
  });

  /* Enter salva o formulario do dicionario */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('nav-open');
    if (e.key !== 'Enter') return;
    const f = e.target.closest('.dform');
    if (!f) return;
    e.preventDefault();
    const b = f.querySelector('[data-dfsave]');
    const [d, v] = b.dataset.dfsave.split('|');
    dimFormSave(d, v);
  });

  $('#btn-menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));

  $('#btn-save').addEventListener('click', () => {
    const p = problemas();
    if (p.faltando.length || p.invalidos.length || p.lp.length) return;
    const n = nomes();
    const cfg = canalCfg();
    const h = hist();
    h.push({
      ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
      canal: cfg.label, utm_source: cfg.utm_source, utm_medium: cfg.utm_medium,
      campanha: n.campanha, conjunto: n.conjunto, anuncio: n.anuncio,
      lp: S.lp, url: urlFinal(S, cfg, n)
    });
    localStorage.setItem(LS_HIST, JSON.stringify(h));
    update();
    go('historico');
  });

  $('#btn-reset').addEventListener('click', () => {
    Object.keys(S).forEach(k => delete S[k]);
    TOUCHED.clear();
    $$('input[data-k]').forEach(el => { el.value = ''; });
    tab = 'url';
    update();
  });

  $('#btn-csv').addEventListener('click', csv);
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('Apagar todo o historico salvo neste navegador?')) return;
    localStorage.removeItem(LS_HIST);
    renderHist();
    update();
  });
  $('#btn-dict').addEventListener('click', exportDict);
  $('#btn-dict2').addEventListener('click', exportDict);

  update();
}
