// Favori "Fuseau" : lit le(s) numéro(s) de la fiche Salesforce affichée et
// ouvre une bulle avec pays, heure locale et numéro corrigé.
import { analyze, findNumbers } from './engine.js';
import { CSS, h, renderCard, copyText } from './ui.js';
import { hereTime } from './time.js';

const VERSION = __VERSION__;
const HOST_ID = 'fuseau-panel-host';
const PHONE_LABEL = /t[ée]l[ée]?phone|phone|mobile|portable|gsm|cellulaire|appeler|whats ?app|fax|num[ée]ro/i;

// ---------------------------------------------------------- DOM profond
function* deepElements(root) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    let el = walker.currentNode;
    while (el) {
      if (el.nodeType === 1) {
        yield el;
        if (el.shadowRoot) stack.push(el.shadowRoot);
      }
      el = walker.nextNode();
    }
  }
}
const parentDeep = (el) => el.parentElement || (el.parentNode && el.parentNode.host) || null;
function closestDeep(el, selector) {
  for (let e = el; e; e = parentDeep(e)) if (e.matches && e.matches(selector)) return e;
  return null;
}
const visible = (el) => {
  try {
    if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true, opacityProperty: false });
    return el.getClientRects().length > 0;
  } catch { return true; }
};
const inPanel = (el) => !!closestDeep(el, '#' + HOST_ID);

const FIELD = '.slds-form-element, records-record-layout-item, force-record-layout-item, .slds-form__item, li, tr';
const LABEL = '.slds-form-element__label, .test-id__field-label, label, dt, th';
function labelFor(el) {
  const box = closestDeep(el, FIELD);
  if (!box) return '';
  for (const l of deepElements(box)) {
    if (l.matches && l.matches(LABEL)) {
      const t = (l.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 60) return t;
    }
  }
  return '';
}

// ------------------------------------------------------------ scan page
function scanPage() {
  const found = [];
  let email = null;
  const push = (value, label, el) => {
    const v = String(value || '').trim();
    if (v.replace(/\D/g, '').length < 6) return;
    found.push({ value: v, label: label || '', el });
  };

  const sel = String(window.getSelection ? window.getSelection() : '').trim();
  const fromSel = sel && !inPanelSelection() && sel.replace(/\D/g, '').length >= 6 && sel.length < 80;

  for (const el of deepElements(document)) {
    if (inPanel(el)) continue;
    const tag = el.tagName;
    if (tag === 'A') {
      const href = el.getAttribute('href') || '';
      if (/^mailto:/i.test(href)) { if (!email && visible(el)) email = href.slice(7).split('?')[0]; continue; }
      if (/^(tel|callto|sip):/i.test(href) && !fromSel && visible(el)) {
        push((el.textContent || '').trim() || decodeURIComponent(href.replace(/^[a-z]+:/i, '')), labelFor(el), el);
      }
    } else if (!fromSel && (tag === 'LIGHTNING-FORMATTED-PHONE' || tag === 'LIGHTNING-CLICK-TO-DIAL') && visible(el)) {
      push(el.textContent, labelFor(el), el);
    }
  }
  if (fromSel) return { items: [{ value: sel, label: 'Sélection' }], email, mode: 'selection' };

  // champs dont le libellé parle de téléphone
  if (!found.length) {
    for (const el of deepElements(document)) {
      if (!el.matches || !el.matches(LABEL) || inPanel(el)) continue;
      const lbl = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!lbl || lbl.length > 60 || !PHONE_LABEL.test(lbl) || !visible(el)) continue;
      const box = closestDeep(el, FIELD);
      if (!box) continue;
      const text = (box.innerText || box.textContent || '').replace(lbl, ' ');
      for (const n of findNumbers(text)) push(n, lbl, box);
    }
  }
  // dernier recours : tout le texte visible
  if (!found.length) {
    const text = document.body ? document.body.innerText : '';
    for (const n of findNumbers(text).slice(0, 6)) push(n, '', null);
  }

  // dédoublonnage (même chiffres = même numéro)
  const byDigits = new Map();
  for (const f of found) {
    const k = f.value.replace(/\D/g, '').replace(/^00/, '');
    if (!byDigits.has(k)) byDigits.set(k, { value: f.value, labels: [] });
    const rec = byDigits.get(k);
    if (f.label && !rec.labels.includes(f.label)) rec.labels.push(f.label);
  }
  return {
    items: [...byDigits.values()].map((r) => ({ value: r.value, label: r.labels.join(', ') })),
    email,
    mode: 'page',
  };
}
function inPanelSelection() {
  const s = window.getSelection && window.getSelection();
  return !!(s && s.anchorNode && inPanel(s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement || s.anchorNode.parentNode));
}

// ------------------------------------------------------------ diagnostic
function diagnostic() {
  let tel = 0, telVis = 0, lfp = 0, lfpVis = 0, shadows = 0, total = 0;
  const labels = [];
  for (const el of deepElements(document)) {
    total++;
    if (el.shadowRoot) shadows++;
    const href = el.tagName === 'A' ? el.getAttribute('href') || '' : '';
    if (/^(tel|callto|sip):/i.test(href)) { tel++; if (visible(el)) telVis++; }
    if (el.tagName === 'LIGHTNING-FORMATTED-PHONE') { lfp++; if (visible(el)) lfpVis++; }
    if (el.matches && el.matches(LABEL) && labels.length < 12) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 60 && PHONE_LABEL.test(t) && visible(el)) {
        const box = closestDeep(el, FIELD);
        const chain = [];
        if (box) {
          for (const d of deepElements(box)) {
            if (chain.length > 14) break;
            const own = [...d.childNodes].some((n) => n.nodeType === 3 && /\d{4,}/.test(n.textContent));
            if (own) chain.push(`${d.tagName.toLowerCase()}${d.className && typeof d.className === 'string' ? '.' + d.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`);
          }
        }
        labels.push(`"${t}" -> ${box ? box.tagName.toLowerCase() : 'aucun conteneur'} [${chain.join(' | ') || 'pas de chiffres'}]`);
      }
    }
  }
  return [
    `Fuseau ${VERSION} · diagnostic`,
    `page: ${location.host}${location.pathname.replace(/\/[a-zA-Z0-9]{15,18}(?=\/|$)/g, '/ID')}`,
    `navigateur: ${navigator.userAgent}`,
    `éléments: ${total} · shadow roots: ${shadows}`,
    `liens tel: ${tel} (visibles ${telVis}) · lightning-formatted-phone: ${lfp} (visibles ${lfpVis})`,
    'libellés téléphone visibles :',
    ...labels.map((l) => '  ' + l),
  ].join('\n');
}

// ---------------------------------------------------------------- panneau
function buildPanel() {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;top:64px;right:16px;z-index:2147483000;width:380px;max-width:calc(100vw - 32px);';
  const root = host.attachShadow({ mode: 'open' });
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS + PANEL_CSS);
    root.adoptedStyleSheets = [sheet];
  } catch {
    root.append(h('style', null, CSS + PANEL_CSS));
  }
  const body = h('div', { class: 'body' });
  const clock = h('span', { class: 'clock' });
  const input = h('input', { class: 'in', type: 'text', placeholder: 'Coller un autre numéro…', autocomplete: 'off', spellcheck: 'false' });
  const manual = h('div', { class: 'manual' });
  const close = h('button', { class: 'x', type: 'button', title: 'Fermer (Échap)', 'aria-label': 'Fermer' }, '×');
  const header = h('div', { class: 'hd' },
    h('span', { class: 'logo' }), h('b', null, 'Fuseau'), clock, h('span', { class: 'sp' }), close);
  const panel = h('div', { class: 'fz panel' }, header, h('div', { class: 'scroll' }, body, manual),
    h('div', { class: 'ft' }, input));
  root.append(panel);
  document.documentElement.append(host);

  const state = { host, root, body, manual, clock, input, data: null, manualValue: '', timer: null };
  close.addEventListener('click', () => destroy(state));
  input.addEventListener('input', () => { state.manualValue = input.value; renderManual(state); });
  input.addEventListener('keydown', (e) => e.stopPropagation(), true);
  state.onKey = (e) => { if (e.key === 'Escape') destroy(state); };
  document.addEventListener('keydown', state.onKey, true);

  // déplacer la bulle en tirant l'en-tête
  header.addEventListener('pointerdown', (e) => {
    if (e.target === close) return;
    const r = host.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (ev) => {
      host.style.left = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dx)) + 'px';
      host.style.top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dy)) + 'px';
      host.style.right = 'auto';
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  });

  state.timer = setInterval(() => {
    // ne pas tout redessiner pendant que l'utilisateur sélectionne un numéro
    const s = root.getSelection ? root.getSelection() : window.getSelection();
    if (s && String(s).trim()) return;
    render(state);
  }, 15000);
  return state;
}

function destroy(state) {
  clearInterval(state.timer);
  document.removeEventListener('keydown', state.onKey, true);
  state.host.remove();
  window.__fuseau = null;
}

function openState(state) {
  const open = new Map();
  for (const d of state.root.querySelectorAll('details[data-k]')) open.set(d.getAttribute('data-k'), d.open);
  return open;
}

function render(state) {
  const now = new Date();
  state.clock.textContent = `ici ${hereTime(now)}`;
  const open = openState(state);
  const { items, email, mode } = state.data;
  const cards = items.map((it) => {
    const res = analyze(it.value, { email });
    const card = renderCard(res, { label: it.label || (mode === 'page' ? 'Sur la page' : ''), now, openAlts: open.get(res.digits) });
    const d = card.querySelector('details');
    if (d) d.setAttribute('data-k', res.digits);
    return card;
  });
  if (!cards.length) {
    const diag = h('button', { class: 'copy', type: 'button' }, 'Copier un diagnostic');
    diag.addEventListener('click', async () => {
      const ok = await copyText(diagnostic());
      diag.textContent = ok ? 'Diagnostic copié ✓ (colle-le à Claude)' : 'Échec de la copie';
    });
    cards.push(h('div', { class: 'card' },
      h('div', { class: 'empty' }, 'Aucun numéro trouvé sur cette page.'),
      h('div', { class: 'note' }, 'Sélectionne le numéro à la souris puis reclique sur le favori, ou colle-le en bas.'),
      h('div', { style: 'margin-top:10px' }, diag)));
  }
  state.body.replaceChildren(...cards);
  renderManual(state, now);
}

function renderManual(state, now = new Date()) {
  const v = state.manualValue.trim();
  if (v.replace(/\D/g, '').length < 6) { state.manual.replaceChildren(); return; }
  state.manual.replaceChildren(renderCard(analyze(v, { email: state.data && state.data.email }), { label: 'Saisi', now }));
}

const PANEL_CSS = `
.panel { background: #fafaf9; border: 1px solid #d8d8d8; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08); overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 96px); }
.hd { display: flex; align-items: center; gap: 8px; padding: 9px 10px 9px 14px; background: #fff; border-bottom: 1px solid #e5e5e5; cursor: move; user-select: none; }
.hd b { font-size: 14px; }
.logo { width: 12px; height: 12px; border-radius: 50%; background: conic-gradient(#2e844a 0 37.5%, #dd7a01 0 50%, #c23934 0 100%); }
.clock { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.sp { flex: 1; }
.x { border: 0; background: transparent; font-size: 20px; line-height: 1; color: #706e6b; padding: 2px 6px; border-radius: 6px; }
.x:hover { background: #f0f0f0; color: #181818; }
.scroll { overflow: auto; padding: 10px 10px 0; }
.ft { padding: 8px 10px 10px; border-top: 1px solid #ececec; background: #fff; }
.in { width: 100%; font: inherit; font-size: 13px; padding: 7px 10px; border: 1px solid #c9c9c9; border-radius: 6px; outline: none; color: #181818; background: #fff; }
.in:focus { border-color: #0b5cab; box-shadow: 0 0 0 2px rgba(11,92,171,.15); }
`;

// ---------------------------------------------------------------- entrée
(function main() {
  let state = window.__fuseau;
  if (!state || !state.host.isConnected) {
    state = buildPanel();
    window.__fuseau = state;
  }
  state.data = scanPage();
  render(state);
})();
