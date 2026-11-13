# Fuseau

Pays, région et heure locale d'un numéro de téléphone, même saisi sans indicatif.
Pensé pour l'équipe qui rappelle les pistes Salesforce : la couleur dit tout de suite
si on peut appeler (vert 9h–18h chez le client, orange si ça ouvre bientôt, rouge sinon).

Deux façons de l'utiliser, même moteur :

- **Le favori (bookmarklet)** : un clic sur une fiche Salesforce, une bulle affiche
  pays, heure locale, numéro corrigé (+33…) prêt à copier ou à appeler (clic droit → Call).
- **La page web** : on colle un numéro (ou elle lit le presse-papier toute seule).

Tout est calculé dans le navigateur : aucun numéro n'est envoyé nulle part.

## Installer le favori

1. Ouvrir https://69heavxn.github.io/fuseau/ et afficher la barre de favoris : `Ctrl`+`Maj`+`B`.
2. Glisser le bouton noir **Fuseau** dans la barre de favoris.
3. Sur une fiche Salesforce : clic sur **Fuseau**. `Échap` ou × pour fermer.

Si la bulle ne trouve pas le numéro : le sélectionner à la souris puis recliquer.
Sinon, bouton « Copier un diagnostic » et envoyer le texte (il ne contient aucun numéro).

## Comment il devine le pays

1. `+` / `00` / `011` : l'indicatif est lu directement (certain).
2. Sinon le numéro est essayé dans tous les pays (règles de numérotation Google
   libphonenumber). Chaque pays possible reçoit un score :
   clientèle habituelle (`src/config.js`) × façon d'écrire (avec le 0, sans le 0,
   indicatif sans +…) × découpage des chiffres (06 12 34 56 78, 514 555 0123,
   0470 12 34 56…) × indice de l'e-mail (.ca, .be…).
3. Les DOM écrits à la française (0692…, 0590…) sont reconnus comme tels.
4. Numéro invalide : le pays est quand même donné quand l'indicatif est connu, avec
   l'erreur probable (ex. « un chiffre en trop »).

Le fuseau vient de l'indicatif régional (USA/Canada par indicatif, Brésil, Mexique,
Australie, Espagne/Canaries, Portugal/Açores…). Quand un indicatif couvre plusieurs
fuseaux, toutes les heures sont affichées.

## Modifier

- Réglages (horaires, pays favoris) : `src/config.js`
- `npm install` puis `npm run build` régénère `docs/` (servi par GitHub Pages).
- `npm test` : tests du moteur.
- Mettre à jour les données Google : `npm run fetch-data && npm run data && npm run build`.

Après une mise à jour, chacun doit re-glisser le favori (l'ancien continue de marcher).

Données de numérotation : [Google libphonenumber](https://github.com/google/libphonenumber)
(Apache 2.0) via [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) (MIT).
