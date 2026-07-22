# ♠ Sabot — Assistant de comptage & stratégie blackjack (PWA)

Application web **sans framework** (HTML/CSS/JS vanilla) de comptage de cartes
Hi-Lo et d'assistance à la stratégie de base, installable en PWA, 100 % hors
ligne, aucune donnée envoyée nulle part.

> Outil pédagogique / entraînement / jeu en ligne. Le comptage de cartes n'est
> pas illégal, mais il est mal vu voire interdit dans les casinos physiques.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Interface + état applicatif (`state`) + rendu |
| `engine.js` | **Moteur pur** : valeur des mains, stratégie de base, déviations, probabilités, comptage. Aucune dépendance au DOM ni à l'état global — chargé par la page *et* importable en Node pour les tests |
| `sw.js` | Service worker (cache offline de l'app shell, stratégie cache-first) |
| `manifest.json` | Métadonnées PWA (chemins relatifs → compatible sous-chemin GitHub Pages) |
| `icon.svg` | Icône |
| `tests/engine.test.js` | Tests unitaires du moteur (`node --test`, zéro dépendance) |

## Hypothèses de règles

La table de stratégie et les déviations supposent :

- **Multi-deck** (1 à 8 jeux, 6 par défaut)
- **S17** : le croupier reste sur soft 17 (c'est pourquoi soft 19 vs 6 = *rester*,
  alors qu'en H17 ce serait *doubler*)
- **DAS** : double après split autorisé (justifie les splits 2/2 et 3/3 vs 2-7,
  4/4 vs 5-6, 6/6 vs 2)
- **Abandon tardif** si la table le permet (16 vs 9/10/As, 15 vs 10 →
  « abandonner si possible, sinon tirer »)

Si tu joues avec d'autres règles (H17 notamment), quelques cases de la table
changent — c'est le premier endroit à adapter dans `getBasicStrategy`.

## Choix techniques

### Pourquoi Hi-Lo ?

C'est le meilleur rapport simplicité/efficacité : trois classes de cartes
(+1 pour 2-6, 0 pour 7-9, −1 pour 10/figures/As), un système *équilibré*
(somme nulle sur un jeu complet) et une corrélation de mise (~0,97) très proche
de systèmes bien plus complexes (Wong Halves, Zen). Pour un assistant visuel
où l'utilisateur saisit les cartes, la robustesse prime sur les 2-3 % d'EV
théorique que rapporterait un système multi-niveaux.

Le **true count** est calculé en divisant le running count par le nombre de
jeux restants *réel* (cartes restantes / 52), pas par une estimation visuelle —
c'est un avantage de l'app par rapport au comptage de tête. Sous 0,25 jeu
restant, le TC est masqué (division quasi nulle → valeurs explosives non
significatives).

### Pourquoi ces déviations précises ?

Le toggle « Déviations » applique un **sous-ensemble de l'Illustrious 18**
(Don Schlesinger) : les écarts à la stratégie de base qui capturent l'essentiel
de l'EV additionnelle du comptage. On se limite aux **mains dures** + assurance
(les déviations sur paires/soft rapportent marginalement et compliquent la table) :

| Main | Seuil | Action |
|---|---|---|
| Assurance | TC ≥ +3 | Prendre |
| 16 vs 10 | TC ≥ 0 | Rester |
| 16 vs 9 | TC ≥ +5 | Rester |
| 15 vs 10 | TC ≥ +4 | Rester |
| 13 vs 2 | TC < −1 | **Tirer** (déviation négative) |
| 12 vs 2 | TC ≥ +3 | Rester |
| 12 vs 3 | TC ≥ +2 | Rester |
| 12 vs 4 | TC < 0 | **Tirer** (déviation négative) |
| 11 vs As | TC ≥ +1 | Doubler |
| 10 vs As | TC ≥ +4 | Doubler |
| 9 vs 2 | TC ≥ +1 | Doubler |
| 9 vs 7 | TC ≥ +3 | Doubler |

Les deux « déviations négatives » (13 vs 2, 12 vs 4) s'activent quand le sabot
est *pauvre* en grosses cartes : le risque de sauter en tirant diminue, donc on
tire là où la base dit de rester.

### Limites du modèle de probabilité

- **Prob. de bust** et **prob. de carte forte** sont exactes *conditionnellement
  aux cartes connues* : elles utilisent la composition réelle du sabot restant,
  pas une distribution infinie. Mais elles ne valent que si toutes les cartes
  vues ont bien été saisies (y compris celles des autres joueurs).
- **L'avantage estimé** (`≈ TC × 0,5 % − 0,5 %`) est une règle du pouce, pas une
  simulation : l'avantage réel dépend des règles exactes, de la pénétration et
  de la stratégie de mise.
- La recommandation **ne simule pas la main du croupier** : c'est une table
  (stratégie de base + déviations), pas un calcul d'EV exhaustif par
  énumération. C'est voulu — une table est vérifiable, testable et instantanée.
- La suggestion de mise (min/normale/élevée/max aux paliers TC 1/2/4) est un
  gabarit simplifié de « bet spread », pas un critère de Kelly.

## Historique de session

« **Main suivante** » archive la main en cours (heure, cartes, total, carte
croupier, running count, true count) puis vide les zones de saisie **sans
toucher au sabot ni au comptage**. Le panneau Session affiche le nombre de
mains et le TC moyen, avec export **CSV** (UTF-8 + BOM, compatible Excel) et
réinitialisation. Stockage **localStorage uniquement** — rien ne quitte
l'appareil.

## Tests

```bash
npm test
```

43 tests (`node --test`, aucune dépendance) couvrant : gestion des As
multiples et soft→hard, détection de paires, frontières de la table
(hard/soft/paires), seuils exacts de chaque déviation (y compris négatives),
assurance, true count, probabilité de bust sur sabot contrôlé, paliers de mise.

## Développement local

```bash
python -m http.server 8123
```

Puis ouvrir <http://localhost:8123>. `localhost` est une origine sécurisée :
le service worker et l'installation PWA fonctionnent aussi en local.

**Attention au cache** : le SW est cache-first. Après une modification, bumper
`CACHE_NAME` dans `sw.js` (ou, en dev, désenregistrer le SW dans les DevTools).

## Déploiement — GitHub Pages (depuis la branche main)

Une seule fois, depuis la racine du projet :

```bash
gh repo create sabot-blackjack --public --source=. --push
```

Puis activer Pages sur la branche `main` :

```bash
gh api repos/{owner}/sabot-blackjack/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

(ou via l'interface : **Settings → Pages → Deploy from a branch → main / root**)

L'app est ensuite disponible sur `https://<ton-user>.github.io/sabot-blackjack/`
— tous les chemins (manifest, SW, icône) sont relatifs, donc le sous-chemin
fonctionne sans configuration. Pour les mises à jour suivantes :

```bash
git push
```

### Installer sur mobile

- **Android/Chrome** : menu ⋮ → « Ajouter à l'écran d'accueil »
- **iOS/Safari** : Partager → « Sur l'écran d'accueil »
