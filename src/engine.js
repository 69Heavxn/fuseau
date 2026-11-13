// Analyse d'un numéro de téléphone : pays probables, région, fuseau(x) horaire(s).
// 100 % local : aucune donnée ne sort du navigateur.
import {
  parsePhoneNumberFromString as parse,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  Metadata,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import { TZ, ZONES, MOBILE_ZONES } from './data/tz.js';
import { GEO } from './data/geo.js';
import { COUNTRY_PRIOR, DEFAULT_PRIOR, HOW_WEIGHT, EMAIL_HINT_FACTOR } from './config.js';

const COUNTRIES = getCountries();
const meta = new Metadata();
let tzMap, geoMap, mobileZones;

function loadMap(str, mapValue) {
  const m = new Map();
  for (const e of str.split('|')) {
    const i = e.indexOf(':');
    m.set(e.slice(0, i), mapValue(e.slice(i + 1)));
  }
  return m;
}
function init() {
  if (tzMap) return;
  const zones = ZONES.split('|');
  const dec = (v) => v.split(',').map((x) => zones[parseInt(x, 36)]);
  tzMap = loadMap(TZ, dec);
  mobileZones = Object.fromEntries(Object.entries(MOBILE_ZONES).map(([k, v]) => [k, dec(v)]));
  geoMap = loadMap(GEO, (v) => v);
}
function longest(map, digits) {
  for (let i = Math.min(digits.length, 10); i > 0; i--) {
    const v = map.get(digits.slice(0, i));
    if (v) return v;
  }
  return null;
}

const trunkOf = (c) => {
  meta.selectNumberingPlan(c);
  return meta.numberingPlan.nationalPrefix() || '';
};

let regionNames;
export function countryName(c) {
  try {
    regionNames ||= new Intl.DisplayNames(['fr'], { type: 'region' });
    return regionNames.of(c) || c;
  } catch { return c; }
}

const OVERSEAS = new Set(['RE', 'GP', 'MQ', 'GF', 'YT', 'PF', 'NC', 'PM', 'BL', 'MF', 'WF']);
const TYPE_FR = {
  MOBILE: 'mobile', FIXED_LINE: 'fixe', FIXED_LINE_OR_MOBILE: 'fixe ou mobile', TOLL_FREE: 'numéro gratuit',
  PREMIUM_RATE: 'surtaxé', SHARED_COST: 'coût partagé', VOIP: 'VoIP / box internet', PERSONAL_NUMBER: 'numéro personnel',
  PAGER: 'bipeur', UAN: "numéro d'entreprise", VOICEMAIL: 'messagerie',
};
const HOW_TEXT = {
  plus: (cc) => `indicatif +${cc} saisi`,
  intl00: (cc) => `indicatif 00${cc} saisi`,
  intl011: (cc) => `préfixe nord-américain 011 + indicatif ${cc}`,
  trunk: () => 'format national (avec le 0)',
  bareNoTrunk: () => 'format national',
  bareMissingTrunk: () => 'format national sans le 0 du début',
  ccNoPlus: (cc) => `indicatif ${cc} écrit sans + ni 00`,
  ccNoPlusNanp: (cc) => `indicatif ${cc} écrit sans +`,
  fixedTrunkZero: (cc) => `0 en trop après +${cc} retiré`,
  other: () => 'format inhabituel',
};

// ------------------------------------------------------------------ helpers
export function emailCountry(email) {
  const m = String(email || '').toLowerCase().match(/@([a-z0-9.-]+)\s*$/);
  if (!m) return null;
  const domain = m[1];
  if (/(^|\.)(bell\.net|sympatico\.ca|videotron\.ca)$/.test(domain)) return 'CA';
  const tld = domain.split('.').pop();
  if (tld === 'uk') return 'GB';
  if (tld.length === 2 && COUNTRIES.includes(tld.toUpperCase())) return tld.toUpperCase();
  return null;
}

function clean(raw) {
  let s = String(raw ?? '').normalize('NFKC').trim().replace(/^tel:/i, '');
  let ext = null;
  const em = s.match(/\s*(?:ext\.?|extension|poste|p\.|x|#)\s*(\d{1,6})\s*$/i);
  if (em && s.replace(em[0], '').replace(/\D/g, '').length >= 7) { ext = em[1]; s = s.slice(0, em.index); }
  const zeroParen = /\(\s*0\s*\)/.test(s);
  s = s.replace(/\(\s*0\s*\)/g, '');
  const plus = /^[\s(]*\+/.test(s);
  return { plus, digits: s.replace(/\D/g, ''), ext, zeroParen };
}

function placeOf(digits) {
  const v = longest(geoMap, digits);
  if (!v) return null;
  const i = v.indexOf(';');
  if (i < 0) return { region: v, cities: [] };
  const cities = v.slice(i + 1);
  return { region: v.slice(0, i), cities: cities ? cities.split(',') : [] };
}

const FR_PLAN = new Set(['RE', 'YT', 'GP', 'BL', 'MF', 'GF', 'MQ']);
const GROUPING_BONUS = 2.5;
const typicalCache = new Map();
const typicalLength = (c) => {
  if (!typicalCache.has(c)) {
    let n = null;
    try { n = getExampleNumber(c, examples).nationalNumber.length; } catch { /* pas d'exemple */ }
    typicalCache.set(c, n);
  }
  return typicalCache.get(c);
};

// Découpage du numéro tel que saisi : "06 12 34 56 78" -> [2,2,2,2,2]
function groupsOf(raw) {
  const g = String(raw || '').replace(/\(\s*0\s*\)/g, '').split(/[^\d]+/).filter(Boolean).map((x) => x.length);
  return g.length >= 3 ? g.join(',') : null;
}
function sameGroups(groups, p, how) {
  const nat = p.formatNational().split(/[^\d]+/).filter(Boolean).map((x) => x.length);
  if (nat.join(',') === groups) return true;
  // même découpage sans le 0 / l'indicatif du début
  if (how === 'bareMissingTrunk' && nat.length > 1 && nat[0] > 1) {
    const n2 = [nat[0] - 1, ...nat.slice(1)].join(',');
    if (n2 === groups) return true;
  }
  if (how === 'ccNoPlus' || how === 'ccNoPlusNanp') {
    const intl = p.formatInternational().split(/[^\d]+/).filter(Boolean).map((x) => x.length);
    if (intl.join(',') === groups) return true;
  }
  return false;
}

function countriesForCode(cc) {
  return COUNTRIES.filter((c) => getCountryCallingCode(c) === cc);
}

// ------------------------------------------------------------------ analyse
/**
 * @param {string} raw   numéro tel que saisi
 * @param {{email?: string}} [ctx]  indices facultatifs (e-mail du client)
 */
export function analyze(raw, ctx = {}) {
  init();
  const { plus, digits, ext, zeroParen } = clean(raw);
  const res = { raw: String(raw ?? ''), digits, ext, candidates: [], warnings: [], explicit: false };
  if (digits.length < 6) { res.status = 'empty'; return res; }
  if (digits.length > 17) { res.status = 'invalid'; res.warnings.push('Trop de chiffres pour un numéro de téléphone.'); return res; }

  const hint = emailCountry(ctx.email);
  const groups = groupsOf(raw);
  const cands = new Map();
  const add = (p, how) => {
    if (!p || !p.isValid()) return;
    const c = p.country || countriesForCode(p.countryCallingCode)[0];
    let prior = COUNTRY_PRIOR[c] ?? DEFAULT_PRIOR;
    // 0692…, 0590… : les DOM font partie du plan de numérotation français
    if (FR_PLAN.has(c) && how === 'trunk') prior = Math.max(prior, COUNTRY_PRIOR.FR * 0.8);
    let w = HOW_WEIGHT[how] * prior;
    if (hint && hint === c) w *= EMAIL_HINT_FACTOR;
    if (!['plus', 'intl00', 'intl011', 'fixedTrunkZero'].includes(how)) {
      // même découpage que l'usage local (06 12 34 56 78 / 514 555 0123 / 0470 12 34 56)
      if (groups && sameGroups(groups, p, how)) w *= GROUPING_BONUS;
      // longueur inhabituelle pour le pays (ex. numéro à 10 chiffres au Luxembourg)
      const typ = typicalLength(c);
      if (typ && p.nationalNumber.length !== typ && p.getType() !== 'MOBILE') w *= 0.35;
    }
    const prev = cands.get(p.number);
    if (prev && prev.weight >= w) return;
    cands.set(p.number, { p, country: c, how, weight: w, hinted: hint === c });
  };

  let intlRest = null;
  let intlHow = null;
  if (plus) { intlRest = digits; intlHow = zeroParen ? 'fixedTrunkZero' : 'plus'; }
  else if (digits.startsWith('00')) { intlRest = digits.replace(/^00+/, ''); intlHow = 'intl00'; }
  else if (digits.startsWith('011') && digits.length >= 11) { intlRest = digits.slice(3); intlHow = 'intl011'; }

  if (intlRest) {
    const p = parse('+' + intlRest);
    if (p && p.isValid()) { add(p, intlHow); res.explicit = intlHow !== 'intl011'; }
    else if (p && p.countryCallingCode) {
      // erreur fréquente : +33 06… / 0033 06…
      const cc = p.countryCallingCode;
      const after = intlRest.slice(cc.length);
      if (after.startsWith('0')) {
        const p2 = parse('+' + cc + after.replace(/^0+/, ''));
        if (p2 && p2.isValid()) { add(p2, 'fixedTrunkZero'); res.explicit = true; }
      }
    }
  }
  if (!res.explicit && (!intlRest || intlHow === 'intl011')) {
    // numéro sans indicatif : on l'essaie dans tous les pays
    for (const c of COUNTRIES) {
      const p = parse(digits, c);
      if (!p || !p.isValid()) continue;
      const nn = p.nationalNumber;
      let how = 'other';
      if (digits.endsWith(nn)) {
        const stripped = digits.slice(0, digits.length - nn.length);
        const trunk = trunkOf(p.country || c);
        if (stripped === '') how = trunk && p.countryCallingCode !== '1' ? 'bareMissingTrunk' : 'bareNoTrunk';
        else if (stripped === p.countryCallingCode) how = p.countryCallingCode === '1' ? 'ccNoPlusNanp' : 'ccNoPlus';
        else if (trunk && stripped === trunk) how = 'trunk';
      }
      add(p, how);
    }
    const p = parse('+' + digits);
    if (p && p.isValid()) add(p, p.countryCallingCode === '1' ? 'ccNoPlusNanp' : 'ccNoPlus');
  }

  if (cands.size) {
    const list = [...cands.values()].sort((a, b) => b.weight - a.weight);
    const total = list.reduce((s, x) => s + x.weight, 0);
    res.candidates = list.map((x) => {
      const p = x.p;
      const e164digits = p.number.slice(1);
      const type = p.getType();
      return {
        valid: true,
        e164: p.number,
        international: p.formatInternational(),
        country: x.country,
        countryName: countryName(x.country),
        overseas: OVERSEAS.has(x.country),
        callingCode: p.countryCallingCode,
        type: type || null,
        typeText: TYPE_FR[type] || '',
        how: x.how,
        howText: HOW_TEXT[x.how](p.countryCallingCode),
        hinted: x.hinted,
        pct: Math.round((100 * x.weight) / total),
        zones: (type === 'MOBILE' && mobileZones[x.country]) || longest(tzMap, e164digits) || [],
        zonesNote: type === 'MOBILE' && mobileZones[x.country] ? 'mobile : région inconnue' : '',
        place: placeOf(e164digits),
      };
    });
    const top = res.candidates[0];
    top.certain = res.explicit || top.pct >= 97;
    res.status = 'ok';
    if (ext) res.warnings.push(`Poste ${ext} indiqué après le numéro.`);
    return res;
  }

  // ----------------------------------------------- rien de valide : on explique
  res.status = 'invalid';
  if (intlRest) {
    const p = parse('+' + intlRest);
    const cc = p && p.countryCallingCode;
    if (!cc) {
      res.warnings.push(`Indicatif inconnu après le ${intlHow === 'plus' ? '+' : '00'}.`);
      return res;
    }
    const country = p.country || countriesForCode(cc)[0];
    const nsn = intlRest.length - cc.length;
    const typical = typicalLength(country);
    let msg = `Numéro incorrect pour ${countryName(country)} (+${cc}) : ${nsn} chiffres après l'indicatif`;
    msg += typical && typical !== nsn ? `, normalement ${typical}.` : '.';
    if (typical && nsn === typical + 1) {
      const fixable = [...intlRest.slice(cc.length)].some((_, i) => {
        const t = intlRest.slice(cc.length);
        const q = parse('+' + cc + t.slice(0, i) + t.slice(i + 1));
        return q && q.isValid();
      });
      if (fixable) msg += ' Il y a sans doute un chiffre en trop : à vérifier avec le client.';
    } else if (typical && nsn === typical - 1) msg += ' Il manque sans doute un chiffre.';
    res.warnings.push(msg);
    res.candidates.push({
      valid: false,
      e164: '+' + intlRest,
      international: '+' + cc + ' ' + intlRest.slice(cc.length),
      country,
      countryName: countryName(country),
      overseas: OVERSEAS.has(country),
      callingCode: cc,
      typeText: '',
      howText: 'numéro invalide',
      pct: 100,
      certain: false,
      zones: longest(tzMap, intlRest) || [],
      place: placeOf(intlRest),
    });
    return res;
  }
  // national non reconnu : pays où la longueur est au moins possible
  const possible = [];
  for (const c of COUNTRIES) {
    const p = parse(digits, c);
    if (p && p.isPossible()) possible.push({ p, c: p.country || c, w: COUNTRY_PRIOR[p.country || c] ?? DEFAULT_PRIOR });
  }
  possible.sort((a, b) => b.w - a.w);
  res.warnings.push('Numéro non reconnu dans aucun pays : il est peut-être mal saisi.');
  const seen = new Set();
  for (const { p, c } of possible) {
    if (seen.has(p.number) || seen.size >= 3) continue;
    seen.add(p.number);
    res.candidates.push({
      valid: false,
      e164: p.number,
      international: p.formatInternational(),
      country: c,
      countryName: countryName(c),
      overseas: OVERSEAS.has(c),
      callingCode: p.countryCallingCode,
      typeText: '',
      howText: 'longueur plausible, numéro non vérifié',
      pct: null,
      zones: longest(tzMap, p.number.slice(1)) || [],
      place: null,
    });
  }
  return res;
}

// ------------------------------------------------- recherche dans un texte
const PHONE_RE = /(?:\+|\b00|\(\+)?\d[\d\s.\-()/ ]{5,22}\d/g;
export function findNumbers(text) {
  const out = [];
  for (const m of String(text || '').matchAll(PHONE_RE)) {
    const s = m[0].trim();
    const d = s.replace(/\D/g, '');
    if (d.length < 8 || d.length > 16) continue;
    if (/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/.test(s)) continue; // dates
    out.push(s);
  }
  return out;
}
