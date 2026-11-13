import { CALL_WINDOW } from './config.js';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtCache = new Map();
const cached = (key, make) => {
  let v = fmtCache.get(key);
  if (!v) { v = make(); fmtCache.set(key, v); }
  return v;
};

function partsIn(tz, date) {
  const f = cached('p' + (tz || ''), () => new Intl.DateTimeFormat('en-US', {
    timeZone: tz || undefined, hourCycle: 'h23', year: 'numeric', month: 'numeric',
    day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }));
  const p = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  const t = { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, wd: WD.indexOf(p.weekday) };
  t.offset = (Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi) - Math.floor(date.getTime() / 60000) * 60000) / 60000;
  return t;
}

const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (t) => `${pad(t.h)}:${pad(t.mi)}`;

export function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

function fmtDiff(min) {
  if (min === 0) return 'même heure que toi';
  const s = min > 0 ? '+' : '−';
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return `${s}${h} h${m ? ' ' + pad(m) : ''} par rapport à toi`;
}

export function zoneLabel(tz, now = new Date()) {
  const f = cached('l' + tz, () => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, timeZoneName: 'longGeneric' }));
  const part = f.formatToParts(now).find((x) => x.type === 'timeZoneName');
  return part ? part.value : tz;
}

const dayWord = (diff, wdName) => (diff === 0 ? "aujourd'hui" : diff === 1 ? 'demain' : diff === -1 ? 'hier' : wdName);

export function weekdayName(tz, date) {
  const f = cached('w' + (tz || ''), () => new Intl.DateTimeFormat('fr-FR', { timeZone: tz || undefined, weekday: 'long' }));
  return f.format(date);
}

// Everything the UI needs about "now" in a given IANA time zone.
export function zoneInfo(tz, now = new Date()) {
  const t = partsIn(tz, now);
  const here = partsIn(undefined, now);
  const minutes = t.h * 60 + t.mi;
  const dayDiff = Math.round((Date.UTC(t.y, t.mo - 1, t.d) - Date.UTC(here.y, here.mo - 1, here.d)) / 864e5);
  const { start, end, soon, lastCall } = CALL_WINDOW;
  const info = {
    tz,
    time: hhmm(t),
    minutes,
    offset: t.offset,
    weekday: weekdayName(tz, now),
    weekend: t.wd === 0 || t.wd === 6,
    dayDiff,
    diffText: fmtDiff(t.offset - here.offset),
  };
  if (minutes >= start && minutes < end) {
    const left = end - minutes;
    info.status = 'green';
    info.statusText = left <= lastCall
      ? `Bon moment pour appeler · plus que ${fmtDur(left)}`
      : `Bon moment pour appeler · encore ${fmtDur(left)}`;
  } else {
    const wait = minutes < start ? start - minutes : 1440 - minutes + start;
    const at = new Date(now.getTime() + wait * 60000);
    const a = partsIn(undefined, at);
    const atDiff = Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(here.y, here.mo - 1, here.d)) / 864e5);
    const when = `${dayWord(atDiff, weekdayName(undefined, at))} ${hhmm(a)} chez toi`;
    info.wait = wait;
    if (wait <= soon) {
      info.status = 'orange';
      info.statusText = `Presque : rappeler dans ${fmtDur(wait)} (${when})`;
    } else {
      info.status = 'red';
      info.statusText = `${minutes >= end ? 'Trop tard' : 'Trop tôt'} : rappeler dans ${fmtDur(wait)} (${when})`;
    }
  }
  return info;
}

export const hereTime = (now = new Date()) => hhmm(partsIn(undefined, now));
