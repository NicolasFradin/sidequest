# Branding & Charte graphique

Ce dossier centralise les assets visuels de référence pour le projet (voir `docs/plan-mvp-mascotte-coach.md`, section 9 pour le détail des tokens : palette, typographies, composants).

## Contenu

- `style-guide.png` — Charte graphique de référence (couleurs, typographies, composants UI, iconographie, exemples d'écrans). Pensée à l'origine pour mobile, adaptée pour le dashboard/overlay desktop dans le plan (section 9).
- `mascots/mascot-ronnie-coleman.png` — Mascotte "Ronnie Coleman", thème Miami Vice 80s, style pixel art 8-bit/16-bit.
- `mascots/mascot-miami-80s.png` — Mascotte "Miami 80s", même style graphique.

## Utilisation prévue

Ces images serviront de source pour :
- Les sprites affichés dans l'overlay mascotte (`packages/app/overlay`)
- Les icônes de tray et d'app (déclinaisons redimensionnées à prévoir : 16x16, 32x32, 256x256 pour le packaging Electron)
- La sélection de mascotte dans le dashboard (réglages)

Toute nouvelle mascotte ajoutée au projet doit respecter le même style (pixel art, palette néon Miami Vice, voir `style-guide.png`) pour rester cohérente.
