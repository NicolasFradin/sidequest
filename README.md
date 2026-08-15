# ClaudeCodeGym
Your AI assistant for moving more and sitting less.

**Mascot Coach** est une application desktop (macOS/Windows/Linux) qui affiche une mascotte coach pendant tes temps morts pour te proposer des micro-exercices de sport — inspirée du principe "no pain, no gain" façon Miami Vice 80s.

## Installer l'application

Télécharge la dernière version depuis la page [**Releases**](../../releases) :

| OS | Fichier |
|---|---|
| macOS | `Mascot Coach-x.x.x-mac-x64.dmg` |
| Windows | `Mascot Coach-x.x.x-win-x64.exe` (ou la version `portable`) |
| Linux | `Mascot Coach-x.x.x-linux-x86_64.AppImage` (ou le `.deb`) |

L'app n'étant pas signée (pas de certificat payant au stade MVP), l'OS affichera un avertissement au premier lancement — c'est normal, l'app est open source et le code est juste ici :
- **macOS** : clic droit sur l'app → **"Ouvrir"** (au lieu d'un double-clic), puis confirme.
- **Windows** : SmartScreen → "Informations complémentaires" → "Exécuter quand même".
- **Linux** : `chmod +x Mascot*.AppImage` puis lance-le directement, ou `sudo dpkg -i` pour le `.deb`.

## Lancer l'application

Une fois installée, **Mascot Coach tourne en arrière-plan** — pas de fenêtre qui s'ouvre au démarrage (sauf la toute première fois, pour choisir tes réglages). Cherche son icône dans :
- la **barre de menu macOS** (en haut à droite) ou la **zone de notification Windows/Linux** — clic pour ouvrir le menu ("Ouvrir le dashboard", "Déclencher un exercice maintenant", "Quitter") ;
- le **Dock/la barre des tâches**, si ton OS l'affiche.

Un exercice apparaît automatiquement toutes les 30 minutes par défaut (réglable dans le dashboard), sous forme d'une mascotte qui te propose de bouger.

## Développer / contribuer

Le code de l'app vit dans [`mascot/`](mascot/) — voir [`mascot/README.md`](mascot/README.md) pour le setup dev, faire tourner les tests, ou packager l'app toi-même.
