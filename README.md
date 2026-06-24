# Calculateur de crédit d'impôt sur revenus mobiliers étrangers (2047)

Calculateur **gratuit et open source** du crédit d'impôt sur **dividendes et intérêts étrangers** :
cases du formulaire **2047** (205/206/207), **8VL**, **8PL** (2026) et **report 2042** (2DC/2TS/2TR).

Le calcul s'exécute **entièrement dans votre navigateur** — sans compte, sans tracker.

## Pourquoi

La fiscalité des revenus mobiliers étrangers (le crédit d'impôt, la case **8PL** introduite en 2026,
le routage 2047 → 2042) est mal documentée et source d'erreurs. Cet outil produit les bonnes cases,
gratuitement — et **son code est public pour que chacun puisse vérifier les calculs**.

## Ce qu'il fait

- Saisie multi-lignes : pays, type (dividende / intérêt), montant (brut ou net) + devise, date d'encaissement, impôt étranger retenu.
- Calcule, case par case : **205 / 206 / 207**, les agrégats **8VL / 8PL**, et le **report 2042** (2DC / 2TS / 2TR).
- Garde-fous : signalement de l'excédent de retenue non récupérable (ex. Allemagne 26,375 %, Suisse 35 %), pays sans crédit, etc.

## Vie privée

- **Le calcul est 100 % local.** Vos montants ne quittent jamais le navigateur : aucun envoi, aucun compte, aucune analytics tierce, aucun tracker.
- **Aucune donnée n'est collectée.** Le site est **entièrement statique** et n'effectue **aucune requête vers un serveur** : tout se passe dans votre navigateur.

## Licence

**GNU AGPLv3** ([`LICENSE`](LICENSE)) — le code est public et le reste. Vous pouvez l'auditer, le corriger,
proposer une amélioration ou l'héberger vous-même.

## Stack

- **Astro** (sortie statique, SEO) + un **îlot React** pour le calculateur, **TypeScript strict**, **Tailwind**.
- Le **moteur fiscal** — [`src/lib/tax-engine/`](src/lib/tax-engine/) — est un module **pur, sans dépendance, testé** (Vitest). Montants en **centimes entiers** (jamais de flottant pour de l'argent). Les sources fiscales sont citées dans [`src/lib/tax-engine/SOURCES-2047.md`](src/lib/tax-engine/SOURCES-2047.md).

## Développement

Prérequis : **Node ≥ 22**.

| Commande            | Action                                            |
| :------------------ | :------------------------------------------------ |
| `npm install`       | Installe les dépendances                          |
| `npm run dev`       | Serveur de dev sur `localhost:4321`               |
| `npm test`          | Lance les tests du moteur fiscal (Vitest)         |
| `npm run build`     | Build statique dans `./dist/`                     |
| `npm run astro check` | Vérification de types                           |

## Structure

```text
src/lib/tax-engine/   moteur fiscal pur (calcul, taux par pays, change BCE) + tests + SOURCES-2047.md
src/components/        UI : calculateur (React), disclaimer
src/pages/            calculateur (index) + guides explicatifs (SEO)
```

## Déploiement

Site **100 % statique** (`dist/`), déployable sur n'importe quel hébergeur statique. Procédure Cloudflare Pages dans [`DEPLOY.md`](DEPLOY.md).

## Statut & avertissement

Projet **en cours (v0)**. Les taux par pays et la logique de calcul sont **à recouper avec la
notice officielle 2047** avant tout usage engageant.

> **Aide informative — ne constitue pas un conseil fiscal.** Vérifiez chaque montant avec la notice
> officielle du formulaire 2047 ou un professionnel.
