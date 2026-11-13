// composant en shadow DOM natif (comme certains composants LWC)
const host = document.getElementById('shadowhost');
const root = host.attachShadow({ mode: 'open' });
const f = document.createElement('lightning-formatted-phone');
const a = document.createElement('a');
a.href = 'tel:+15145550123';
a.textContent = '+1 514-555-0123';
f.append(a);
root.append(f);
