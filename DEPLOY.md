# Déploiement — Cloudflare Pages

Le site est un **Astro statique** (`dist/`) — **aucune Pages Function, aucun
adaptateur SSR, aucun binding**. Il se déploie sur n'importe quel hébergeur
statique ; ci-dessous la configuration Cloudflare Pages.

> Le déploiement effectif nécessite un **compte Cloudflare** (action manuelle de
> votre part). Les étapes ci-dessous décrivent la configuration à réaliser une
> seule fois.

## 1. Build

| Réglage | Valeur |
| --- | --- |
| Commande de build | `npm run build` |
| Répertoire de sortie | `dist` |
| Version de Node | `>= 22.12.0` (cf. `package.json`) |
| Branche de production | `main` |

Sur Pages : **Workers & Pages → Create application → Pages → Connect to Git**,
sélectionnez le dépôt, puis renseignez la commande et le répertoire ci-dessus.

## 2. Placeholders à renseigner

| Emplacement | Placeholder | Remplacer par |
| --- | --- | --- |
| `src/pages/index.astro` | `https://example.com/` (`canonical`) | domaine de production |
| `README.md` | URL/dépôt si placeholder présent | dépôt et domaine réels |

## 3. Tester le build en local

```sh
npm run build
npm run preview
```

`npm run preview` sert `dist/` localement — équivalent du rendu de production
statique.
