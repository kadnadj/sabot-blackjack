# Sabot — Assistant Blackjack (PWA)

## Fichiers
- `index.html` — l'application
- `manifest.json` — métadonnées PWA (nom, icône, couleurs)
- `sw.js` — service worker (cache offline)
- `icon.svg` — icône de l'app

## Pourquoi il faut l'héberger
Les navigateurs n'autorisent l'installation d'une PWA (et les service workers)
que sur une origine **HTTPS** (ou `localhost`). Ouvrir le fichier directement
depuis ton disque (`file://...`) ne permettra pas l'installation ni le mode
hors-ligne — l'app fonctionnera quand même dans le navigateur, mais sans le
bouton "Installer".

## Option la plus rapide : GitHub Pages (gratuit, 5 minutes)
1. Crée un repo GitHub (public ou privé), ex. `sabot-blackjack`.
2. Mets les 4 fichiers (`index.html`, `manifest.json`, `sw.js`, `icon.svg`)
   à la racine du repo.
3. Va dans **Settings > Pages**, choisis la branche `main` et le dossier `/root`.
4. Après ~1 minute, ton app est disponible à :
   `https://<ton-user>.github.io/sabot-blackjack/`
5. Ouvre ce lien sur ton téléphone (Chrome Android ou Safari iOS) :
   - **Android/Chrome** : menu ⋮ → "Ajouter à l'écran d'accueil" (ou une
     bannière d'installation apparaît automatiquement)
   - **iOS/Safari** : bouton Partager → "Sur l'écran d'accueil"

## Alternative : Netlify Drop
Va sur https://app.netlify.com/drop et glisse-dépose le dossier contenant
les 4 fichiers. Netlify te donne une URL HTTPS instantanément, utilisable
directement pour l'installation.

## Test en local (développement)
```bash
cd sabot-blackjack
python3 -m http.server 8000
```
Puis ouvre `http://localhost:8000` — `localhost` est considéré comme une
origine sécurisée par les navigateurs, donc l'installation et le service
worker fonctionnent aussi en local.

## Nouveautés de cette version
- **Déviations de comptage (Illustrious 18 simplifié)** : bouton à activer
  dans la section Recommandation. Une fois activé, l'app ajuste la
  recommandation Tirer/Rester/Doubler pour certaines mains dures selon le
  true count (ex : dur 16 vs 10 → rester si TC≥0), et affiche un conseil
  d'assurance (prendre l'assurance si TC≥3).
- **Installable** en app mobile via manifest + service worker (cache offline
  de l'interface — les calculs se font toujours localement, aucune donnée
  n'est envoyée nulle part).
