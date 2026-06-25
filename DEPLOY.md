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

## 2. Domaine de production

Le domaine est **centralisé** dans `astro.config.mjs` :

```js
site: 'https://clairfisc.fr',
```

Tout en dérive automatiquement au build, **un seul endroit à changer** :
- le `canonical` de chaque page (dérivé de `Astro.url.pathname` → toujours cohérent avec l'URL servie) ;
- l'URL `og:image` et `og:url` (absolues) ;
- le `sitemap-index.xml` / `sitemap-0.xml` (générés par `@astrojs/sitemap`).

`public/robots.txt` référence `https://clairfisc.fr/sitemap-index.xml` (à aligner si le domaine change). `public/og-default.png` (1200×630) est l'image de partage par défaut.

> Tant que le DNS de `clairfisc.fr` n'est pas pointé sur Cloudflare, le site reste accessible sur le sous-domaine `*.pages.dev` ; les `canonical` pointeront déjà vers `clairfisc.fr` (sans incidence tant que le domaine n'est pas en ligne).

## 3. Tester le build en local

```sh
npm run build
npm run preview
```

`npm run preview` sert `dist/` localement — équivalent du rendu de production
statique.
