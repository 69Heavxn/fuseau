// Page web : coller un numéro -> pays, heure locale, numéro corrigé.
import { analyze, findNumbers } from './engine.js';
import { CSS, renderCard, copyText } from './ui.js';
import { hereTime } from './time.js';

const $ = (s) => document.querySelector(s);
const input = $('#num');
const out = $('#out');
const clock = $('#clock');
const auto = $('#auto');
let last = '';

const style = document.createElement('style');
style.textContent = CSS;
document.head.append(style);

function render() {
  clock.textContent = hereTime();
  const v = input.value.trim();
  if (!v) { out.replaceChildren(); return; }
  // plusieurs numéros collés d'un coup : une carte par numéro
  const many = findNumbers(v);
  const list = many.length > 1 ? many : [v];
  const open = new Map([...out.querySelectorAll('details[data-k]')].map((d) => [d.getAttribute('data-k'), d.open]));
  out.replaceChildren(...list.map((n) => {
    const res = analyze(n);
    const card = renderCard(res, { openAlts: open.get(res.digits) });
    const d = card.querySelector('details');
    if (d) d.setAttribute('data-k', res.digits);
    return card;
  }));
}

input.addEventListener('input', render);
for (const b of document.querySelectorAll('[data-try]')) {
  b.addEventListener('click', () => { input.value = b.getAttribute('data-try'); render(); input.focus(); });
}
setInterval(() => {
  const s = window.getSelection();
  if (s && String(s).trim()) return;
  render();
}, 15000);

// ------------------------------------------------ presse-papier automatique
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } },
};
auto.checked = store.get('fuseau.auto') !== '0';
auto.addEventListener('change', () => { store.set('fuseau.auto', auto.checked ? '1' : '0'); if (auto.checked) readClipboard(); });

async function readClipboard() {
  if (!auto.checked || !navigator.clipboard || !navigator.clipboard.readText) return;
  try {
    const t = (await navigator.clipboard.readText()).trim();
    if (!t || t === last || t.length > 80) return;
    if (!findNumbers(t).length && t.replace(/\D/g, '').length < 8) return;
    last = t;
    input.value = t;
    render();
  } catch { /* permission refusée : on reste en collage manuel */ }
}
window.addEventListener('focus', readClipboard);
document.addEventListener('visibilitychange', () => { if (!document.hidden) readClipboard(); });

// ------------------------------------------------------------ favori
const link = $('#bm');
const copyBm = $('#copybm');
fetch('bookmarklet.txt', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
  .then((url) => {
    link.href = url.trim();
    link.removeAttribute('aria-disabled');
    copyBm.disabled = false;
    copyBm.addEventListener('click', async () => {
      const ok = await copyText(url.trim());
      copyBm.textContent = ok ? 'Code copié ✓' : 'Échec de la copie';
    });
  })
  .catch(() => { $('#bmerr').hidden = false; });
link.addEventListener('click', (e) => {
  e.preventDefault();
  $('#bmhint').classList.add('shake');
  setTimeout(() => $('#bmhint').classList.remove('shake'), 600);
});

render();
input.focus();
readClipboard();
