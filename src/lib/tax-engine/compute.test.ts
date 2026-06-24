import { describe, it, expect } from "vitest";
import { calculeLigne, calculeDeclaration } from "./compute";
import { ETATS_UNIS, ALLEMAGNE, SUISSE, ROYAUME_UNI, IRLANDE } from "./rates";
import type { Ligne } from "./types";

/** Helper fixtures : euros → centimes entiers. */
const eur = (n: number): number => Math.round(n * 100);

describe("crédit d'impôt 2047 — cas standard (retenue = convention)", () => {
  it("US : dividende brut 100 $, retenue 15 % (net 85 €, impôt 15 €) → crédit 15 €", () => {
    const ligne: Ligne = {
      pays: ETATS_UNIS,
      type: "dividende",
      netEncaisseCents: eur(85),
      impotEtrangerCents: eur(15),
    };
    const r = calculeLigne(ligne);
    expect(r.ligne205Eur).toBe(15); // 85 × 17,6 % = 14,96 → arrondi 15
    expect(r.ligne207Eur).toBe(15); // min(15, 15)
    expect(r.excedentNonRecuperableEur).toBe(0);
    expect(r.ouvreDroitCredit).toBe(true);
  });

  it("GB : dividende 100 € sans retenue (0 %) → aucun crédit, n'ouvre pas droit", () => {
    // Notice : UK div. = 17,6 % (la convention autorise 15 %). Mais le UK ne prélève AUCUNE
    // retenue sur dividendes → impôt étranger 0 → 207 = min(205, 0) = 0 (rien à éliminer).
    // C'est l'absence de retenue, pas un forfait nul, qui annule le crédit. cf. SOURCES §3.
    const ligne: Ligne = {
      pays: ROYAUME_UNI,
      type: "dividende",
      netEncaisseCents: eur(100),
      impotEtrangerCents: 0,
    };
    const r = calculeLigne(ligne);
    expect(r.ligne206Eur).toBe(0);
    expect(r.ligne207Eur).toBe(0); // min(205, 0) = 0 → aucun crédit
    expect(r.ouvreDroitCredit).toBe(false); // pas d'impôt étranger supporté
  });

  it("agrégats 8VL / 8PL : US + GB → 8VL = 15, 8PL = 85 (GB exclu, n'ouvre pas droit)", () => {
    const decl = calculeDeclaration([
      { pays: ETATS_UNIS, type: "dividende", netEncaisseCents: eur(85), impotEtrangerCents: eur(15) },
      { pays: ROYAUME_UNI, type: "dividende", netEncaisseCents: eur(100), impotEtrangerCents: 0 },
    ]);
    expect(decl.case8vlEur).toBe(15);
    expect(decl.case8plEur).toBe(85);
  });
});

describe("crédit d'impôt 2047 — retenue > convention (cf. SOURCES-2047.md §2)", () => {
  // TRANCHÉ contre les sources officielles (cf. SOURCES-2047.md §2) : le taux notice s'applique
  // au NET (en-tête « TAUX APPLICABLES AUX REVENUS NETS… »), et 207 = min(205, 206) géré tel quel.
  // Le crédit est donc 130 € (= 736,25 × 17,6 % arrondi), et NON 150 € : l'hypothèse « 15 % du
  // brut » est INFIRMÉE. L'excédent (264 − 130 = 134 €) n'est pas récupérable côté FR.
  it("DE : dividende brut 1000 €, retenue 26,375 % → crédit retenu 130 € (et non 150)", () => {
    const ligne: Ligne = {
      pays: ALLEMAGNE,
      type: "dividende",
      netEncaisseCents: eur(736.25),
      impotEtrangerCents: eur(263.75),
    };
    const r = calculeLigne(ligne);
    expect(r.ligne205Eur).toBe(130); // 736,25 × 17,6 % = 129,58 → arrondi 130
    expect(r.ligne206Eur).toBe(264); // 263,75 → arrondi 264
    expect(r.ligne207Eur).toBe(130); // min(130, 264) = 130 (plafond conventionnel)
    expect(r.excedentNonRecuperableEur).toBe(134); // 264 − 130, à réclamer à l'Allemagne
    expect(r.ouvreDroitCredit).toBe(true);
  });

  // CH : retenue 35 % > convention 15 %. Net 650 €, impôt 350 €.
  // 205 = 650 × 17,6 % = 114,40 → 114 ; 206 = 350 ; 207 = min(114, 350) = 114.
  it("CH : dividende brut 1000 €, retenue 35 % → crédit retenu 114 €, excédent non récupérable", () => {
    const ligne: Ligne = {
      pays: SUISSE,
      type: "dividende",
      netEncaisseCents: eur(650),
      impotEtrangerCents: eur(350),
    };
    const r = calculeLigne(ligne);
    expect(r.ligne205Eur).toBe(114); // 650 × 17,6 % = 114,40 → arrondi 114
    expect(r.ligne206Eur).toBe(350);
    expect(r.ligne207Eur).toBe(114); // min(114, 350)
    expect(r.excedentNonRecuperableEur).toBe(236); // 350 − 114, à réclamer à la Suisse
    expect(r.ouvreDroitCredit).toBe(true);
  });
});

describe("routage 2042 (post-2047) — notice 2047-NOT rev. 2025, cf. SOURCES §5", () => {
  it("dividende (US, éligible par défaut) → case 2DC", () => {
    const r = calculeLigne({
      pays: ETATS_UNIS,
      type: "dividende",
      netEncaisseCents: eur(85),
      impotEtrangerCents: eur(15),
    });
    expect(r.case2042).toBe("2DC");
  });

  it("intérêt (US) → case 2TR", () => {
    const r = calculeLigne({
      pays: ETATS_UNIS,
      type: "interet",
      netEncaisseCents: eur(100),
      impotEtrangerCents: eur(15),
    });
    expect(r.case2042).toBe("2TR");
  });

  it("dividende non éligible abattement 40 % (ETF distribuant) → case 2TS", () => {
    const r = calculeLigne({
      pays: ETATS_UNIS,
      type: "dividende",
      netEncaisseCents: eur(100),
      impotEtrangerCents: eur(15),
      eligibleAbattement40: false,
    });
    expect(r.case2042).toBe("2TS");
  });

  it("agrégat report2042 : dividende 2DC + intérêt 2TR + ETF 2TS ventilés par case", () => {
    const decl = calculeDeclaration([
      // dividende éligible → 2DC (net 85)
      { pays: ETATS_UNIS, type: "dividende", netEncaisseCents: eur(85), impotEtrangerCents: eur(15) },
      // intérêt → 2TR (net 200)
      { pays: ETATS_UNIS, type: "interet", netEncaisseCents: eur(200), impotEtrangerCents: eur(35) },
      // ETF distribuant non éligible → 2TS (net 50)
      { pays: ETATS_UNIS, type: "dividende", netEncaisseCents: eur(50), impotEtrangerCents: eur(9), eligibleAbattement40: false },
    ]);
    expect(decl.report2042).toEqual({ "2DC": 85, "2TS": 50, "2TR": 200 });
  });

  it("report2042 inclut les revenus n'ouvrant PAS droit à crédit (revenu imposable même sans crédit)", () => {
    // IRLANDE div. = c/ (forfait 0) → aucun crédit, mais le dividende reste imposable → reporté en 2DC.
    const decl = calculeDeclaration([
      { pays: IRLANDE, type: "dividende", netEncaisseCents: eur(120), impotEtrangerCents: 0 },
    ]);
    expect(decl.case8vlEur).toBe(0); // n'ouvre pas droit à crédit
    expect(decl.case8plEur).toBe(0);
    expect(decl.report2042).toEqual({ "2DC": 120, "2TS": 0, "2TR": 0 }); // mais bien reporté
  });
});
