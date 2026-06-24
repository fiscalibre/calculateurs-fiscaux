import type { Pays } from "./types";

/**
 * Table des taux de crédit d'impôt forfaitaires de la notice 2047-NOT (revenus 2025),
 * exprimés **SUR LE NET** en points de base. Sources & citations : ./SOURCES-2047.md.
 *
 * En-tête officiel de la table notice : « TAUX APPLICABLES AUX REVENUS NETS DE L'IMPÔT
 * PRÉLEVÉ À LA SOURCE ». Le taux s'applique donc au montant NET encaissé (ligne 203),
 * jamais au brut (cf. SOURCES-2047.md §2 — l'hypothèse « brut × convention » est infirmée).
 *
 * Repère : une convention prévoyant 15 % de retenue → forfait sur net = 15 / 85
 * = 17,647 %, arrondi à 17,6 % par la notice → 1760 points de base.
 *
 * `c/` dans la notice = revenu imposable exclusivement au lieu de résidence → AUCUN crédit
 * → forfait 0. Quand un pays a un forfait dividendes > 0 mais `c/` sur intérêts (DE, CH, GB),
 * `forfaitInteretSurNetBp` vaut 0.
 *
 * Toutes les valeurs ci-dessous sont vérifiées contre la notice 2047-NOT rev. 2025
 * (2047_5490.pdf). Aucune n'est en attente de vérification pour les pays MVP listés.
 */

// ── Pays MVP (investisseurs FR en titres étrangers) ─────────────────────────────
// Notice : « ÉTATS-UNIS div. 17,6 %, int. 17,6 % » (crédit = impôt US plafonné 15 % brut).
export const ETATS_UNIS: Pays = {
  code: "US",
  nom: "États-Unis",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1760,
};
// Notice : « ALLEMAGNE div. 17,6 %, int. c/ ». Retenue réelle DE = 26,375 % > convention
// → l'excédent n'est pas récupérable côté FR (à réclamer à l'Allemagne). cf. SOURCES §2.
export const ALLEMAGNE: Pays = {
  code: "DE",
  nom: "Allemagne",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 0,
};
// Notice : « SUISSE div. 17,6 %, int. c/ ». Retenue réelle CH = 35 % > convention
// → l'excédent n'est pas récupérable côté FR (réclamable à la Suisse). cf. SOURCES §2.
export const SUISSE: Pays = {
  code: "CH",
  nom: "Suisse",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 0,
};
// Notice : « ROYAUME-UNI div. 17,6 %, int. c/ ». La convention autorise 15 %, mais le UK
// ne prélève en pratique AUCUNE retenue sur dividendes → impôt étranger 0 → crédit 0
// (via min(205, 206)). Le forfait reste 1760 ; c'est l'absence de retenue qui annule le
// crédit, pas un forfait nul. cf. SOURCES-2047.md §3.
export const ROYAUME_UNI: Pays = {
  code: "GB",
  nom: "Royaume-Uni",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 0,
};
// Notice : « IRLANDE div., int. c/ » → imposable au seul lieu de résidence → AUCUN crédit.
// Important pour les ETF domiciliés en Irlande (UCITS) : 0 crédit côté FR.
export const IRLANDE: Pays = {
  code: "IE",
  nom: "Irlande",
  forfaitSurNetBp: 0,
  forfaitInteretSurNetBp: 0,
};
// Notice : « PAYS-BAS div. 17,6 %, int. 11,1 % ».
export const PAYS_BAS: Pays = {
  code: "NL",
  nom: "Pays-Bas",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1110,
};
// Notice : « ESPAGNE div. 17,6 %, int. 11,1 % ».
export const ESPAGNE: Pays = {
  code: "ES",
  nom: "Espagne",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1110,
};
// Notice : « ITALIE div. 17,6 %, int. 11,1 % ».
export const ITALIE: Pays = {
  code: "IT",
  nom: "Italie",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1110,
};
// Notice : « CANADA (QUÉBEC COMPRIS) div. 17,6 %, int. 11,1 % ».
export const CANADA: Pays = {
  code: "CA",
  nom: "Canada",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1110,
};
// Notice : « BELGIQUE div. 17,6 %, int. 17,6 % ».
export const BELGIQUE: Pays = {
  code: "BE",
  nom: "Belgique",
  forfaitSurNetBp: 1760,
  forfaitInteretSurNetBp: 1760,
};

/** Liste des pays proposés (ordre = fréquence approximative pour un investisseur FR). */
export const PAYS_2025: readonly Pays[] = [
  ETATS_UNIS,
  ALLEMAGNE,
  ROYAUME_UNI,
  IRLANDE,
  SUISSE,
  PAYS_BAS,
  ESPAGNE,
  ITALIE,
  CANADA,
  BELGIQUE,
];
