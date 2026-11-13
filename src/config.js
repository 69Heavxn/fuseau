// Réglages de l'outil : à modifier ici puis relancer `npm run build`.

// Plage horaire où l'on peut appeler (heure locale du client).
export const CALL_WINDOW = {
  start: 9 * 60, // 9h00
  end: 18 * 60, // 18h00
  soon: 90, // orange si l'ouverture est dans moins de 90 min
  lastCall: 30, // signale "plus que X min" dans les 30 dernières minutes
};

// Probabilité de départ par pays (plus c'est haut, plus le pays est favorisé
// quand un numéro sans indicatif est valide dans plusieurs pays).
// Basé sur la clientèle : Français en France et expatriés.
export const COUNTRY_PRIOR = {
  FR: 40, CA: 12, US: 12, CH: 8, BE: 8, LU: 5, GB: 4,
  RE: 2, GP: 1.2, MQ: 1.2, GF: 0.8, YT: 0.6, PF: 0.8, NC: 0.8, PM: 0.3, BL: 0.2, MF: 0.2, WF: 0.1,
  ES: 2, PT: 2, MA: 2, DE: 1.2, IT: 1.2, NL: 1, DZ: 1, TN: 1, IL: 1, AE: 1, AU: 1,
  IE: 0.6, MC: 0.6, SN: 0.5, CI: 0.5, MU: 0.5, TH: 0.5, MX: 0.5, BR: 0.5, SG: 0.4, HK: 0.4, CN: 0.4,
  JP: 0.3, AT: 0.3, SE: 0.3, DK: 0.3, NO: 0.3, GR: 0.3, PL: 0.3, LB: 0.3, VN: 0.3, ZA: 0.3,
};
export const DEFAULT_PRIOR = 0.15;

// Poids de chaque façon d'écrire le numéro.
export const HOW_WEIGHT = {
  plus: 1, // +33… : certain
  intl00: 1, // 0033… : certain
  intl011: 0.9, // 011 33… (préfixe international nord-américain)
  trunk: 1, // 06…, 0032 n'est pas ici : format national avec le 0
  bareNoTrunk: 1, // pays sans 0 national (USA, Canada, Italie, Espagne…)
  bareMissingTrunk: 0.25, // 6 12 34 56 78 : le 0 a été oublié
  ccNoPlus: 0.6, // 33612345678 : indicatif sans + ni 00
  ccNoPlusNanp: 0.9, // 1 514 … : très courant en Amérique du Nord
  fixedTrunkZero: 0.95, // +33 (0)6… ou +33 06… : 0 en trop retiré
  badCcLiteral: 0.1, // +14-(0)3…  lu +1 4… en ignorant le (0) : peu probable
  other: 0.1,
};

// Indice tiré de l'adresse e-mail (.ca, .be…) : multiplie la probabilité du pays.
export const EMAIL_HINT_FACTOR = 3;
// Pays dont l'e-mail ne prouve rien : les expatriés gardent leur adresse française.
export const EMAIL_HINT_IGNORE = ['FR'];

// Les formulaires sont surtout remplis avec des portables : bonus aux numéros mobiles.
export const MOBILE_BONUS = 2;

// Tranches qui existent mais que les particuliers n'ont quasiment jamais
// (début du numéro national, sans le 0) : probabilité divisée par 5.
export const RARE_RANGES = {
  CH: ['68', '69'], // mobiles suisses récents ; les vrais portables sont en 075-079
};

// Fiche Salesforce : le champ téléphone de la section dont le titre contient
// ce mot passe avant tous les autres numéros de la page.
export const PHONE_SECTION = 'entreprise';
// Numéros trouvés hors d'un champ "Téléphone/Mobile…" : ignorés en dessous de
// ce nombre de chiffres (évite les références, compteurs, identifiants…).
export const MIN_DIGITS_OUTSIDE_PHONE_FIELD = 8;

// Numéro jugé clair (la bulle n'affiche que l'essentiel) si le pays en tête
// dépasse CLEAR_THRESHOLD %, ou dépasse CLEAR_LEAD % sans autre pays au-dessus
// de CLEAR_RUNNER_UP %. Sinon : probabilités + autres pays possibles.
export const CLEAR_THRESHOLD = 80;
export const CLEAR_LEAD = 70;
export const CLEAR_RUNNER_UP = 10;
// Autres pays affichés seulement s'ils dépassent ce pourcentage (3 au maximum).
export const ALT_MIN_PCT = 5;
