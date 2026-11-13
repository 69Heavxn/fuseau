// Tests du moteur : numéros fournis par l'équipe (fictifs) + cas pièges.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, emailCountry, findNumbers } from '../src/engine.js';
import { zoneInfo } from '../src/time.js';

const top = (n, ctx) => analyze(n, ctx).candidates[0];

test("exemples de l'équipe", () => {
  const cases = [
    ['0612345678', 'FR', '+33612345678', 'Europe/Paris'],
    ['+32470123456', 'BE', '+32470123456', 'Europe/Brussels'],
    ['+15145550123', 'CA', '+15145550123', 'America/Toronto'],
    ['001-514-555-0147', 'CA', '+15145550147', 'America/Toronto'],
    ['+16785550182', 'US', '+16785550182', 'America/New_York'],
    ['+447400123456', 'GB', '+447400123456', 'Europe/London'],
    ['+15615550161', 'US', '+15615550161', 'America/New_York'],
    ['07400123456', 'GB', '+447400123456', 'Europe/London'],
    ['+447400654321', 'GB', '+447400654321', 'Europe/London'],
    ['+14385550199', 'CA', '+14385550199', 'America/Toronto'],
    ['+15105550110', 'US', '+15105550110', 'America/Los_Angeles'],
  ];
  for (const [n, cc, e164, tz] of cases) {
    const c = top(n);
    assert.equal(c.country, cc, n);
    assert.equal(c.e164, e164, n);
    assert.ok(c.zones.includes(tz), `${n} -> ${c.zones}`);
  }
});

test('régions précises (Amérique du Nord)', () => {
  assert.deepEqual(top('+15145550123').place, { region: 'Québec', cities: ['Montréal'] });
  assert.equal(top('+16785550182').place.region, 'Géorgie');
  assert.equal(top('+15615550161').place.region, 'Floride');
  assert.equal(top('+15105550110').place.region, 'Californie');
  assert.ok(top('+1 709 722 1234').zones.includes('America/St_Johns')); // Terre-Neuve, UTC-3:30
});

test('indicatif à cheval sur deux fuseaux', () => {
  const z = top('+1 208 222 1234').zones; // Idaho
  assert.ok(z.length >= 2);
});

test('numéro trop long (+41 avec un chiffre de trop)', () => {
  const r = analyze('+417612345678');
  assert.equal(r.status, 'invalid');
  assert.equal(r.candidates[0].country, 'CH');
  assert.match(r.warnings[0], /chiffre en trop/);
});

test('outre-mer écrit au format français', () => {
  assert.equal(top('0692 12 34 56').country, 'RE');
  assert.equal(top('0590 12 34 56').country, 'GP');
  assert.equal(top('0696 12 34 56').country, 'MQ');
  assert.equal(top('0694 12 34 56').country, 'GF');
});

test('erreurs de saisie courantes', () => {
  assert.equal(top('+33 (0)6 12 34 56 78').e164, '+33612345678');
  assert.equal(top('0033 06 12 34 56 78').e164, '+33612345678');
  assert.equal(top('33612345678').e164, '+33612345678');
  assert.equal(top('1 (514) 555-0123').country, 'CA');
  assert.equal(top('514-555-0123').country, 'CA');
  assert.equal(top('tel:+32470123456').country, 'BE');
});

test('ambiguïté affichée avec probabilités', () => {
  const r = analyze('0756123456');
  assert.ok(!r.candidates[0].certain);
  assert.ok(r.candidates.length > 1);
  assert.ok(r.candidates[0].pct > r.candidates[1].pct);
  assert.equal(r.candidates.reduce((s, c) => s + c.pct, 0) >= 95, true);
});

test('découpage typique du pays', () => {
  assert.equal(top('0470 12 34 56').country === 'FR' || top('0470 12 34 56').country === 'BE', true);
  assert.equal(top('621 123 456').country, 'LU');
});

test("indice tiré de l'e-mail", () => {
  assert.equal(emailCountry('jean@videotron.ca'), 'CA');
  assert.equal(emailCountry('a@b.co.uk'), 'GB');
  assert.equal(emailCountry('a@gmail.com'), null);
  const sans = analyze('0470 12 34 56').candidates.find((c) => c.country === 'BE').pct;
  const avec = analyze('0470 12 34 56', { email: 'x@skynet.be' }).candidates.find((c) => c.country === 'BE').pct;
  assert.ok(avec > sans);
});

test('mobiles sans région dans un grand pays', () => {
  const c = top('+61 412 345 678');
  assert.ok(c.zones.length > 3);
  assert.ok(c.zonesNote);
});

test('fuseaux corrigés (proxys de 2018)', () => {
  assert.ok(top('+212 6 12 34 56 78').zones.includes('Africa/Casablanca'));
  assert.deepEqual(top('+213 5 51 23 45 67').zones, ['Africa/Algiers']);
  assert.deepEqual(top('+353 87 123 4567').zones, ['Europe/Dublin']);
});

test('entrées vides ou absurdes', () => {
  assert.equal(analyze('').status, 'empty');
  assert.equal(analyze('12').status, 'empty');
  assert.equal(analyze('+999 123456').status, 'invalid');
});

test('recherche de numéros dans un texte', () => {
  const t = 'Échéance : 16/11/2026 · Mobile 06 12 34 56 78 · Tentatives 3 · +1 (514) 555-0123';
  assert.deepEqual(findNumbers(t), ['06 12 34 56 78', '+1 (514) 555-0123']);
});

test('statut horaire', () => {
  // 12:00 UTC un mercredi
  const now = new Date(Date.UTC(2026, 10, 11, 12, 0));
  assert.equal(zoneInfo('Europe/Paris', now).status, 'green'); // 13:00
  assert.equal(zoneInfo('America/Toronto', now).status, 'red'); // 07:00
  const mtl = zoneInfo('America/Toronto', new Date(Date.UTC(2026, 10, 11, 13, 0))); // 08:00
  assert.equal(mtl.status, 'orange');
  assert.match(mtl.statusText, /dans 1 h/);
  assert.equal(zoneInfo('Pacific/Auckland', new Date(Date.UTC(2026, 10, 11, 20, 0))).dayDiff, 1);
});

test('numéro clair : pas de doute affiché', () => {
  for (const n of ['0612345678', '06 12 34 56 78', '0692 12 34 56', '0590 12 34 56', '07400123456', '514 555 0123', '+32470123456', '0142685300']) {
    assert.equal(analyze(n).clear, true, n);
  }
});

test('numéro difficile : probabilités affichées', () => {
  for (const n of ['0756123456', '079 123 45 67', '0470 12 34 56', '621 123 456', '612345678']) {
    const r = analyze(n);
    assert.equal(r.clear, false, n);
    assert.ok(r.candidates.length > 1, n);
  }
});
