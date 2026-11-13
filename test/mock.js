// composant en shadow DOM natif (comme certains composants LWC)
// numéro fictif mal saisi : indicatif +14 inexistant
const host = document.getElementById('shadowhost');
const root = host.attachShadow({ mode: 'open' });
const f = document.createElement('lightning-formatted-phone');
const a = document.createElement('a');
a.href = 'tel:+14-(0)312345678';
a.textContent = '+14-(0)312345678';
f.append(a);
root.append(f);
