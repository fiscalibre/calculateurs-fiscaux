# Sources & décision fiscale — moteur crédit d'impôt 2047

> Vérification effectuée le 2026-06-22 contre les sources **officielles** (formulaire +
> notice 2047 rev. 2025, BOFiP). Toute valeur non confirmée par une source est marquée
> `⚠️ à vérifier` dans `rates.ts`.

## 1. Sources consultées

- **Formulaire 2047 (rev. 2025, revenus 2025, N°11226\*28)** — cadre 2, lignes 200-208 et 230-238.
  <https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5488.pdf>
- **Notice 2047-NOT (rev. 2025, N°50545\*28)** — « TAUX APPLICABLES AUX REVENUS NETS DE
  L'IMPÔT PRÉLEVÉ À LA SOURCE » + table des taux par pays.
  <https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5490.pdf>
- **BOFiP BOI-INT-DG-20-20-100** — élimination de la double imposition (méthode du crédit
  d'impôt égal à l'impôt étranger, plafonné au taux conventionnel).
  <https://bofip.impots.gouv.fr/bofip/4877-PGP.html>

## 2. LA décision : base NET, pas brut × convention (hypothèse de mission INFIRMÉE)

La mission posait l'hypothèse « crédit = `min(taux_conventionnel × BRUT, retenue réelle)` »,
qui donnerait pour DE (brut 1000 €, retenue 26,375 %) un crédit de **150 €**.

**Cette hypothèse est INFIRMÉE par les sources officielles.** Le bon modèle est `net × forfait`.

### Citations littérales

**Formulaire 2047, cadre 2, ligne 200 (texte imprimé) :**

> « Lorsque la convention fiscale prévoit l'élimination de la double imposition par un crédit
> d'impôt égal à l'impôt étranger, indiquez le montant des revenus perçus **(après déduction
> de l'impôt supporté à l'étranger)**, le taux applicable indiqué dans la notice et le montant
> de l'impôt supporté à l'étranger. Le crédit d'impôt à retenir est égal au montant de l'impôt
> supporté à l'étranger **sauf lorsque le produit du montant net du revenu par le taux applicable
> est inférieur. Dans ce cas, il convient de retenir ce dernier montant** (suivre lignes 203 à
> 208 ou 233 à 238). »

Détail des lignes du formulaire :
- **203** = « Montant **net** encaissé » (après retenue étrangère)
- **204** = « Taux applicable » (celui de la notice)
- **205** = « Résultat » = 203 × 204
- **206** = « Impôt supporté à l'étranger »
- **207** = « Crédit d'impôt retenu », avec l'instruction imprimée :
  > « si ligne 205 < ligne 206, retenir la ligne 205 ; si ligne 206 < ligne 205, retenir la ligne 206. »
  → soit **207 = min(205, 206)**.

**Notice 2047-NOT, en-tête de la table des taux :**

> « **TAUX APPLICABLES AUX REVENUS NETS DE L'IMPÔT PRÉLEVÉ À LA SOURCE** »

> « Les taux par pays fournis à titre indicatif dans cette notice sont ceux communément
> applicables **au montant net des dividendes ou intérêts, c'est-à-dire après déduction de
> l'impôt payé à l'étranger**. »

> « Sauf mention contraire, le crédit d'impôt imputable en France est égal à l'impôt
> effectivement supporté à l'étranger, sous réserve que celui-ci n'excède pas le taux
> applicable aux revenus mentionnés ci-après, et dans la limite de l'impôt français afférent
> à ces mêmes revenus. »

### Pourquoi 17,6 % et pas 15 %

Le taux notice est un **forfait sur le NET** équivalent à 15 % du brut **quand la retenue
étrangère = 15 %** : `15 / (100 − 15) = 15 / 85 = 17,647 % ≈ 17,6 %`. La notice a déjà
fait cette conversion ; on applique donc directement le forfait au net déclaré. Il ne faut
**pas** reconstruire le brut ni appliquer 15 % au brut.

### Le cas DE 26,375 % / CH 35 % — tranché

Quand l'étranger prélève **plus** que la convention, la mécanique form-littérale `min(205, 206)`
gère le cas **sans rien changer** : le forfait notice 17,6 % (calé sur 15 % de la convention)
reste appliqué au net, et il est *inférieur* à l'impôt réellement supporté → on retient 205.

- **DE** : net 736,25 €, impôt 263,75 € → 205 = 736,25 × 17,6 % = 129,58 → **130 €** ;
  206 = 264 € ; 207 = **min(130, 264) = 130 €**. L'excédent (264 − 130 = 134 €) **n'est pas
  récupérable côté FR** : il doit être réclamé à l'Allemagne (taux réduit conventionnel /
  remboursement de la part au-delà de 15 %). → **130 €, et NON 150 €.**
- **CH** : net 650 €, impôt 350 € → 205 = 650 × 17,6 % = 114,40 → **114 €** ;
  206 = 350 € ; 207 = **min(114, 350) = 114 €**. Excédent 236 € non récupérable côté FR
  (réclamable à la Suisse, formulaire 83 / imputation forfaitaire).

> Le forfait sur net 17,6 % n'est **pas** « un raccourci qui casse dès que la retenue dépasse
> 15 % ». C'est le **taux officiel de la ligne 204**, appliqué tel quel au net, par construction
> du formulaire. L'idée « repasser par le brut × taux conventionnel » contredit le texte imprimé.

## 3. Cas particulier du Royaume-Uni (et des pays sans retenue effective)

La notice donne **UK dividendes = 17,6 %** (la convention *autorise* jusqu'à 15 % de retenue à
la source). Mais en pratique le UK ne prélève **aucune** retenue sur les dividendes → ligne 206 = 0
→ 207 = min(205, 0) = **0**. Il n'y a donc aucun crédit, non parce que le forfait serait nul,
mais parce qu'**il n'y a pas de double imposition à éliminer** (rien n'a été retenu à l'étranger).

→ Conséquence de modélisation : `ouvreDroitCredit` ne dépend PAS seulement du pays, mais aussi
de l'existence d'un impôt étranger réellement supporté. Une ligne n'ouvre droit à crédit que si
(a) le pays a un forfait notice > 0 (pas `c/`) **et** (b) un impôt étranger > 0 a été retenu.
La base 8PL (revenus nets ouvrant droit) suit la même condition.

## 4. Table des taux dividendes (notice 2047-NOT rev. 2025) — pays MVP

Tous **sur le NET**, en points de base. `c/` = imposable exclusivement au lieu de résidence
→ aucun crédit (forfait 0).

| Pays | Code | Div. notice | bp | Source |
|------|------|-------------|----|--------|
| États-Unis | US | 17,6 % | 1760 | notice « ÉTATS-UNIS div. 17,6 % » (crédit = impôt US plafonné 15 % brut) |
| Allemagne | DE | 17,6 % | 1760 | notice « ALLEMAGNE div. 17,6 %, int. c/ » |
| Suisse | CH | 17,6 % | 1760 | notice « SUISSE div. 17,6 %, int. c/ » |
| Royaume-Uni | GB | 17,6 % | 1760 | notice « ROYAUME-UNI div. 17,6 %, int. c/ » |
| Irlande | IE | `c/` (0) | 0 | notice « IRLANDE div., int. c/ » → aucun crédit |
| Pays-Bas | NL | 17,6 % | 1760 | notice « PAYS-BAS div. 17,6 %, int. 11,1 % » |
| Espagne | ES | 17,6 % | 1760 | notice « ESPAGNE div. 17,6 %, int. 11,1 % » |
| Italie | IT | 17,6 % | 1760 | notice « ITALIE div. 17,6 %, int. 11,1 % » |
| Canada | CA | 17,6 % | 1760 | notice « CANADA (QUÉBEC COMPRIS) div. 17,6 %, int. 11,1 % » |
| Belgique | BE | 17,6 % | 1760 | notice « BELGIQUE div. 17,6 %, int. 17,6 % » |

Taux **intérêts** (ligne 234), même mécanique, renseignés quand la notice les donne ;
`c/` (DE, CH, GB, IE) = pas de crédit sur intérêts.

## 5. Routage 2042 (report des revenus du cadre 2 du 2047 vers la 2042 / 2042C)

Après calcul du crédit sur le 2047, le **montant net** de chaque revenu doit être reporté
dans la case du 2042 / 2042C correspondant à sa nature. La notice 2047-NOT rev. 2025 donne
le routage de manière littérale, sous le titre **« N'oubliez pas de reporter le montant de
ces revenus sur votre déclaration no 2042 »**.

### 5.1 Source — citations littérales (notice 2047-NOT rev. 2025, 2047_5490.pdf)

> « – **ligne 2DC** les revenus d'actions et parts de sociétés ayant leur siège dans un État
> de l'Union européenne ou dans un État ou territoire ayant conclu avec la France une
> convention en vue d'éviter les doubles impositions contenant une clause d'assistance
> administrative en vue de lutter contre la fraude et l'évasion fiscales. Ces revenus sont
> susceptibles de bénéficier de l'**abattement de 40 %** uniquement en cas d'option globale
> pour l'imposition au barème progressif […] (case 2OP cochée sur la déclaration no 2042) ; »

> « – **ligne 2TS** les autres revenus distribués (notamment les revenus d'actions et parts
> de sociétés ayant leur siège dans un État autre que ceux indiqués ci-dessus, **non
> susceptibles de bénéficier de l'abattement de 40 %**) et les jetons de présence ; »

> « – **ligne 2TR** les intérêts et autres produits de placement à revenu fixe ; »

Le **cadre 260** du 2047 (« revenus de valeurs mobilières émises en France […] encaissés à
l'étranger », p. ex. via un courtier étranger) est régi par la même liste de report : la
notice précise que ce bloc couvre « les revenus **de valeurs et capitaux mobiliers de source
française ou étrangère encaissés hors de France** ». Les dividendes de valeurs **françaises**
encaissés via un courtier étranger suivent donc le même routage → **2DC** (actions/parts de
sociétés UE/à convention).

> Hors périmètre 2047 (à NE PAS router ici) : la notice rappelle que les revenus de valeurs
> mobilières étrangères encaissés **en France** par un dépositaire français, et les revenus
> déjà soumis à **prélèvement libératoire**, sont à porter **directement sur la 2042 sans
> passer par le 2047**. Le moteur ne traite que les revenus encaissés à l'étranger / via
> intermédiaire étranger (périmètre du 2047).

### 5.2 Mapping retenu par le moteur

| Nature du revenu (entrée moteur)                          | Case 2042 | Justification notice |
|-----------------------------------------------------------|-----------|----------------------|
| Dividende, **éligible** abattement 40 % (UE / convention) | **2DC**   | « revenus d'actions et parts de sociétés ayant leur siège dans un État de l'UE… » |
| Dividende, **non éligible** (autres revenus distribués, ETF/fonds distribuants) | **2TS** | « autres revenus distribués […] non susceptibles de bénéficier de l'abattement de 40 % » |
| Intérêt / produit à revenu fixe                           | **2TR**   | « intérêts et autres produits de placement à revenu fixe » |
| Dividende de valeur **française** via courtier étranger (cadre 260) | **2DC** | actions/parts de sociétés ; cadre 260 = valeurs « de source française ou étrangère encaissés hors de France » |

**Défaut & cas incertains :**

- Tous les `Pays` de la table `rates.ts` sont UE ou à convention avec clause d'assistance →
  un dividende y est **par défaut réputé éligible** à l'abattement de 40 % → **2DC**.
- Le routage **2TS** est explicite : l'appelant passe `eligibleAbattement40: false` sur la
  ligne. C'est le cas des « autres revenus distribués » et de certains **ETF/fonds
  distribuants** dont les distributions ne bénéficient pas de l'abattement de 40 %.
- ⚠️ **Cas incertain non tranché dans le moteur** : la qualification fine 2DC vs 2TS d'un fonds
  ou ETF donné dépend de sa nature juridique et des indications de son **IFU** (imprimé fiscal
  unique), pas seulement du pays d'émission. Le moteur ne devine pas : à défaut d'indicateur,
  il route en 2DC (par défaut raisonnable pour un titre vif UE/convention) et laisse l'appelant
  forcer 2TS via `eligibleAbattement40: false` plutôt que d'inventer une règle de détection.
- Le report 2042 porte sur le **montant net** (déduction faite de l'impôt étranger), et il a
  lieu **même si la ligne n'ouvre pas droit à crédit** (forfait `c/` ou retenue nulle) : le
  revenu reste imposable en France. La condition `ouvreDroitCredit` ne concerne que 8VL/8PL.
