// Rendu des résultats (DOM construit à la main : pas d'innerHTML, compatible
// avec les pages qui imposent Trusted Types / CSP strictes comme Salesforce).
import { zoneInfo, zoneLabel } from './time.js';
import { ALT_MIN_PCT } from './config.js';

export const CSS = `
:host, .fz { all: initial; }
.fz, .fz * { box-sizing: border-box; }
.fz {
  --ink: #181818; --muted: #5c5c5c; --faint: #8a8a8a; --line: #e5e5e5; --bg: #ffffff; --soft: #f6f6f4;
  --green: #2e844a; --green-bg: #ebf7e6; --orange: #b45a00; --orange-bg: #fef1e2; --red: #c23934; --red-bg: #fdecea;
  --gray: #706e6b; --accent: #0b5cab;
  font: 13px/1.4 "Salesforce Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  color: var(--ink); display: block; -webkit-font-smoothing: antialiased;
}
.card { background: var(--bg); border: 1px solid var(--line); border-left: 4px solid var(--gray); border-radius: 8px; padding: 12px 14px; margin: 0 0 10px; }
.card.green { border-left-color: var(--green); } .card.orange { border-left-color: var(--orange); }
.card.red { border-left-color: var(--red); } .card.bad { border-left-color: var(--orange); }
.src { font-size: 11px; color: var(--muted); margin-bottom: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.src b { font-weight: 600; color: var(--ink); }
.hero { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.time { font-size: 30px; font-weight: 700; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; line-height: 1.1; }
.wd { color: var(--muted); font-size: 13px; }
.badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 10px; background: var(--soft); color: var(--muted); }
.badge.day { background: #fff3c4; color: #7a5b00; }
.status { margin: 4px 0 8px; font-weight: 600; display: flex; gap: 7px; align-items: center; }
.status.green { color: var(--green); } .status.orange { color: var(--orange); } .status.red { color: var(--red); } .status.gray { color: var(--gray); }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex: none; background: var(--gray); }
.dot.green { background: var(--green); } .dot.orange { background: #dd7a01; } .dot.red { background: var(--red); }
.where { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 14px; }
.cc { font: 700 10px/1 ui-monospace, Menlo, Consolas, monospace; background: var(--ink); color: #fff; padding: 3px 4px; border-radius: 3px; letter-spacing: .5px; }
.type { color: var(--muted); font-size: 12px; }
.place { color: var(--ink); margin-top: 2px; }
.note { color: var(--muted); font-size: 12px; margin-top: 2px; }
.diff { color: var(--muted); font-size: 12px; }
.num { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 7px 8px 7px 10px; background: var(--soft); border-radius: 6px; }
.num .digits { font: 600 15px/1.2 ui-monospace, Menlo, Consolas, monospace; user-select: all; -webkit-user-select: all; cursor: text; flex: 1; color: var(--ink); }
button { font: inherit; cursor: pointer; }
.copy { border: 1px solid #c9c9c9; background: #fff; color: var(--accent); border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
.copy:hover { background: #f3f8fd; } .copy.ok { color: var(--green); border-color: var(--green); }
.conf { margin-top: 8px; font-size: 12px; color: var(--muted); }
.conf.unsure { color: var(--orange); font-weight: 600; }
.warn { margin-top: 8px; padding: 7px 9px; background: var(--orange-bg); color: #7a3d00; border-radius: 6px; font-size: 12px; }
.rows { margin: 4px 0 8px; display: grid; gap: 4px; }
.row { display: grid; grid-template-columns: auto auto 1fr; gap: 4px 8px; align-items: center; }
.row .t { font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.row .l { color: var(--muted); font-size: 12px; }
.row .s { grid-column: 2 / 4; font-size: 12px; font-weight: 600; margin-top: -2px; }
.row .s.green { color: var(--green); } .row .s.orange { color: var(--orange); } .row .s.red { color: var(--red); }
.doubt { margin-top: 10px; padding: 9px 10px 4px; background: var(--orange-bg); border-radius: 6px; font-size: 12px; color: #6b3600; }
.doubt b { font-size: 13px; color: #7a3d00; }
.doubt .alts { margin-top: 8px; }
.doubt .alts-h { font-weight: 600; margin-bottom: 2px; }
.doubt .alt { border-bottom-color: rgba(180, 90, 0, .15); }
.doubt .alt .num { background: rgba(255, 255, 255, .7); }
.alt { display: grid; grid-template-columns: auto 1fr auto; gap: 2px 8px; padding: 7px 0; border-bottom: 1px solid #f0f0f0; align-items: center; }
.alt:last-child { border-bottom: 0; }
.alt .n { font-weight: 600; } .alt .pct { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.alt .info { grid-column: 2 / 4; color: var(--muted); font-size: 12px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.alt .info .t { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.alt .num { grid-column: 1 / 4; margin-top: 4px; padding: 4px 6px 4px 8px; }
.alt .num .digits { font-size: 13px; }
.empty { color: var(--muted); padding: 4px 2px 10px; }
`;

// ---------------------------------------------------------------- h()
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v; // CSSOM : autorisé même sans 'unsafe-inline'
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'open') el.open = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false || k === '') continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

// ------------------------------------------------------------- copier
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* rien */ }
    ta.remove();
    return ok;
  }
}

function copyButton(text, label = 'Copier') {
  const b = h('button', { class: 'copy', type: 'button', title: `Copier ${text}` }, label);
  b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await copyText(text);
    b.textContent = ok ? 'Copié ✓' : 'Échec';
    b.classList.toggle('ok', ok);
    setTimeout(() => { b.textContent = label; b.classList.remove('ok'); }, 1600);
  });
  return b;
}

function numberRow(c) {
  return h('div', { class: 'num' },
    h('span', { class: 'digits', title: 'Clic pour sélectionner (puis clic droit → Call)' }, c.international),
    copyButton(c.e164));
}

// ------------------------------------------------------------ fuseaux
// Regroupe les fuseaux qui ont la même heure en ce moment.
export function zoneGroups(zones, now = new Date()) {
  const by = new Map();
  for (const z of zones) {
    let info;
    try { info = zoneInfo(z, now); } catch { continue; }
    if (!by.has(info.offset)) by.set(info.offset, { info, labels: [] });
    const lbl = zoneLabel(z, now);
    const g = by.get(info.offset);
    if (!g.labels.includes(lbl)) g.labels.push(lbl);
  }
  return [...by.values()].sort((a, b) => b.info.offset - a.info.offset);
}

const dayBadge = (info) => (info.dayDiff === 1 ? 'demain là-bas' : info.dayDiff === -1 ? 'hier là-bas' : info.dayDiff ? `${info.dayDiff > 0 ? '+' : ''}${info.dayDiff} j` : null);

function timeBlock(c, now) {
  const groups = zoneGroups(c.zones, now);
  if (!groups.length) {
    return { status: 'gray', el: h('div', { class: 'status gray' }, h('i', { class: 'dot' }), 'Fuseau horaire inconnu') };
  }
  if (groups.length === 1) {
    const { info, labels } = groups[0];
    return {
      status: info.status,
      el: [
        h('div', { class: 'hero' },
          h('span', { class: 'time' }, info.time),
          h('span', { class: 'wd' }, info.weekday),
          dayBadge(info) && h('span', { class: 'badge day' }, dayBadge(info)),
          info.weekend && h('span', { class: 'badge' }, 'week-end'),
        ),
        h('div', { class: `status ${info.status}` }, h('i', { class: `dot ${info.status}` }), info.statusText),
        info.diffMin !== 0 && h('div', { class: 'diff' }, info.diffText),
      ],
    };
  }
  if (groups.length > 4) {
    const first = groups[0].info, last = groups[groups.length - 1].info;
    const anyGreen = groups.some((g) => g.info.status === 'green');
    return {
      status: 'gray',
      el: [
        h('div', { class: 'hero' }, h('span', { class: 'time' }, `${last.time} – ${first.time}`)),
        h('div', { class: 'status gray' }, h('i', { class: 'dot' }),
          `Heure exacte inconnue (${groups.length} fuseaux dans le pays)`),
        h('div', { class: 'diff' }, anyGreen ? 'Ouvert dans une partie du pays : demande la ville au client.' : 'Fermé partout ou presque en ce moment.'),
      ],
    };
  }
  const best = groups.find((g) => g.info.status === 'green') || groups[0];
  return {
    status: best.info.status,
    el: [
      h('div', { class: 'note' }, 'Plusieurs fuseaux possibles pour cet indicatif :'),
      h('div', { class: 'rows' }, groups.map(({ info, labels }) => [
        h('div', { class: 'row' },
          h('i', { class: `dot ${info.status}` }),
          h('span', { class: 't' }, info.time),
          h('span', { class: 'l' }, labels.join(' / '), dayBadge(info) ? ` · ${dayBadge(info)}` : ''),
          h('span', { class: `s ${info.status}` }, info.statusText)),
      ])),
    ],
  };
}

function placeText(c) {
  const parts = [];
  if (c.place) {
    if (c.place.region) parts.push(c.place.region);
    if (c.place.cities && c.place.cities.length) parts.push(c.place.cities.join(', ') + (c.place.cities.length > 1 ? '…' : ''));
  }
  return parts.join(' · ');
}

// Encadré affiché seulement quand le pays n'est pas sûr.
function doubtBox(top, alts, now) {
  const head = top.valid
    ? [h('b', null, `Pays à vérifier : ${top.countryName} à ${top.pct} %`), ` · ${top.howText}`]
    : [h('b', null, 'Numéro non reconnu'), ' : pays possibles d’après la longueur'];
  return h('div', { class: 'doubt' },
    h('div', null, head),
    alts.length > 0 && h('div', { class: 'alts' },
      h('div', { class: 'alts-h' }, 'Autres possibilités :'),
      alts.map((c) => altRow(c, now))));
}

function altRow(c, now) {
  const g = zoneGroups(c.zones, now);
  const info = g.length ? g[0].info : null;
  const many = g.length > 1;
  return h('div', { class: 'alt' },
    h('span', { class: 'cc' }, c.country),
    h('span', { class: 'n' }, c.countryName),
    h('span', { class: 'pct' }, c.pct != null ? `${c.pct} %` : ''),
    h('div', { class: 'info' },
      info && h('i', { class: `dot ${info.status}` }),
      info && h('span', { class: 't' }, many ? `${g[g.length - 1].info.time}–${info.time}` : info.time),
      info && dayBadge(info) && h('span', { class: 'badge day' }, dayBadge(info)),
      [c.typeText, placeText(c)].filter(Boolean).join(' · ')),
    numberRow(c));
}

/**
 * Carte de résultat pour un numéro.
 * @param {object} res résultat de analyze()
 * @param {{label?: string, now?: Date, openAlts?: boolean}} opts
 */
export function renderCard(res, opts = {}) {
  const now = opts.now || new Date();
  const src = h('div', { class: 'src' },
    opts.label && h('b', null, opts.label),
    opts.label && '·',
    h('span', null, res.raw.trim()));

  if (res.status === 'empty') {
    return h('div', { class: 'card bad' }, src, h('div', { class: 'warn' }, 'Pas assez de chiffres pour un numéro de téléphone.'));
  }
  const top = res.candidates[0];
  if (!top) {
    return h('div', { class: 'card bad' }, src, res.warnings.map((w) => h('div', { class: 'warn' }, w)));
  }
  const tb = timeBlock(top, now);
  // numéro clair : uniquement l'essentiel ; sinon probabilités + autres pays
  const doubt = !res.clear && (top.valid || res.candidates.length > 1);
  const alts = doubt
    ? res.candidates.slice(1).filter((c) => c.pct == null || c.pct >= ALT_MIN_PCT).slice(0, 3)
    : [];
  const card = h('div', { class: `card ${top.valid ? tb.status : 'bad'}`, 'data-key': res.digits },
    src,
    tb.el,
    h('div', { class: 'where', style: 'margin-top:8px' },
      h('span', { class: 'cc' }, top.country),
      h('b', null, top.countryName),
      top.overseas && h('span', { class: 'type' }, 'outre-mer'),
      top.typeText && h('span', { class: 'type' }, top.typeText)),
    placeText(top) && h('div', { class: 'place' }, placeText(top)),
    top.zonesNote && h('div', { class: 'note' }, top.zonesNote),
    numberRow(top),
    res.warnings.map((w) => h('div', { class: 'warn' }, w)),
    doubt && doubtBox(top, alts, now),
  );
  return card;
}
