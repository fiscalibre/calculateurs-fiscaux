import { useEffect, useMemo, useState } from "react";
import { calculeDeclaration, PAYS_2025 } from "../lib/tax-engine";
import type { Ligne, Pays } from "../lib/tax-engine";
import type { LigneSaisie } from "./types";
import { DEVISE_DEFAUT, convertitVersEur } from "./fx";
import LigneFormulaire from "./LigneFormulaire";
import Resultats from "./Resultats";

/**
 * Calculateur de crédit d'impôt 2047 (FR) — îlot React autonome.
 *
 * Saisie multi-lignes (pays, type, montant brut|net + devise,
 * date d'encaissement, impôt étranger), calcul via le moteur `tax-engine`,
 * et restitution case par case (205/206/207, excédent) + agrégats 8VL/8PL copiables.
 *
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

/** Index pays par code pour résoudre rapidement la saisie → objet Pays du moteur. */
const PAYS_PAR_CODE: ReadonlyMap<string, Pays> = new Map(PAYS_2025.map((p) => [p.code, p]));

let compteurId = 0;
function nouvelId(): string {
  compteurId += 1;
  return `ligne-${compteurId}`;
}

function ligneVide(): LigneSaisie {
  return {
    id: nouvelId(),
    paysCode: PAYS_2025[0]?.code ?? "",
    type: "dividende",
    montant: "",
    mode: "net",
    devise: DEVISE_DEFAUT,
    dateEncaissement: "",
    impotEtranger: "",
    eligibleAbattement40: true,
  };
}

/** Résultat de la conversion d'une saisie en `Ligne` moteur (ou erreurs de validation). */
interface ConversionLigne {
  readonly ligne: Ligne | null;
  readonly erreurs: readonly string[];
  /** Libellé descriptif pour l'affichage des résultats. */
  readonly libelle: string;
}

/**
 * Convertit une ligne saisie en `Ligne` du moteur.
 * - montant ET impôt étranger sont convertis en EUR au cours BCE du jour
 *   d'encaissement (la retenue étrangère est libellée dans la devise source) ;
 * - si mode « brut » : net = brut − impôt étranger, APRÈS conversion en centimes EUR ;
 * - validation : nombres ≥ 0, conversion possible, net non négatif.
 */
function convertitLigne(saisie: LigneSaisie): ConversionLigne {
  const erreurs: string[] = [];
  const pays = PAYS_PAR_CODE.get(saisie.paysCode);
  const libelle = pays ? `${pays.nom} · ${saisie.type === "dividende" ? "Dividende" : "Intérêt"}` : "Ligne";

  if (!pays) {
    erreurs.push("Pays inconnu.");
  }

  // Montant : converti dans la devise/date saisies.
  const montant = convertitVersEur(saisie.montant, saisie.devise, saisie.dateEncaissement);
  let montantCents: number | null = null;
  if ("cents" in montant) {
    montantCents = montant.cents;
  } else {
    erreurs.push(montant.erreur);
  }

  // Impôt étranger : libellé dans la même devise, donc converti à la même date.
  // Vide → 0 EUR, pas de conversion ni d'exigence de date.
  let impotCents: number | null = 0;
  if (saisie.impotEtranger.trim() !== "") {
    const impot = convertitVersEur(saisie.impotEtranger, saisie.devise, saisie.dateEncaissement);
    if ("cents" in impot) {
      impotCents = impot.cents;
    } else {
      impotCents = null;
      erreurs.push(`Impôt étranger : ${impot.erreur}`);
    }
  }

  if (pays === undefined || montantCents === null || impotCents === null) {
    return { ligne: null, erreurs, libelle };
  }

  // Brut → net : le moteur attend le net encaissé (en centimes EUR).
  const netEncaisseCents = saisie.mode === "brut" ? montantCents - impotCents : montantCents;
  if (netEncaisseCents < 0) {
    erreurs.push("Le net (brut − impôt étranger) est négatif : vérifiez les montants.");
    return { ligne: null, erreurs, libelle };
  }

  return {
    ligne: {
      pays,
      type: saisie.type,
      netEncaisseCents,
      impotEtrangerCents: impotCents,
      // Pertinent uniquement pour les dividendes ; défaut éligible (→ 2DC).
      eligibleAbattement40: saisie.eligibleAbattement40 ?? true,
    },
    erreurs,
    libelle,
  };
}

export default function Calculateur() {
  const [lignes, setLignes] = useState<LigneSaisie[]>(() => [ligneVide()]);

  // Au montage, on repart d'une saisie vierge. Les <input> sont contrôlés par
  // React, mais certains navigateurs (Firefox) RESTAURENT la valeur visuelle
  // des champs lors d'un rafraîchissement, sans déclencher d'onChange : le DOM
  // afficherait alors d'anciens montants que React croit vides → résultats non
  // recalculés. Régénérer la ligne (nouvel id) force le remontage des champs et
  // réécrit leur valeur à vide. Cohérent avec « aucune donnée conservée » : un
  // refresh = formulaire propre. Voir aussi autoComplete="off" sur les champs.
  useEffect(() => {
    setLignes([ligneVide()]);
  }, []);

  function modifierLigne(id: string, champs: Partial<LigneSaisie>) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...champs } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, ligneVide()]);
  }

  function supprimerLigne(id: string) {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  // Conversion + validation de toutes les lignes (mémoïsé sur la saisie).
  const conversions = useMemo(() => lignes.map(convertitLigne), [lignes]);

  // Une ligne est « prête » si elle a un montant renseigné et aucune erreur bloquante.
  const lignesPretes = conversions.filter(
    (c, i) => c.ligne !== null && lignes[i]!.montant.trim() !== "",
  );

  const declaration = useMemo(() => {
    const lignesMoteur = lignesPretes.map((c) => c.ligne!);
    return lignesMoteur.length > 0 ? calculeDeclaration(lignesMoteur) : null;
  }, [lignesPretes]);

  const libellesPrets = lignesPretes.map((c) => c.libelle);

  // Pays présents dans la saisie qui n'ouvrent pas droit à crédit (forfait = 0).
  const paysSansCredit = useMemo(() => {
    const codes = new Set<string>();
    for (const l of lignes) {
      const p = PAYS_PAR_CODE.get(l.paysCode);
      if (p && p.forfaitSurNetBp === 0) codes.add(p.nom);
    }
    return [...codes];
  }, [lignes]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Calculateur de crédit d'impôt 2047</h1>
        <p className="mt-1 text-sm text-slate-600">
          Saisissez vos revenus mobiliers étrangers. Calcul effectué localement dans votre navigateur (aucune donnée collectée).
        </p>
      </header>

      {/* Saisie */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Saisie</h2>
          <button
            type="button"
            onClick={ajouterLigne}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Ajouter une ligne
          </button>
        </div>

        {lignes.map((ligne, i) => (
          <LigneFormulaire
            key={ligne.id}
            ligne={ligne}
            index={i}
            suppressionImpossible={lignes.length === 1}
            onChange={modifierLigne}
            onSupprimer={supprimerLigne}
          />
        ))}
      </section>

      {/* Garde-fou : pays sans crédit */}
      {paysSansCredit.length > 0 && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {paysSansCredit.join(", ")} n'ouvre{paysSansCredit.length > 1 ? "nt" : ""} pas droit à
          crédit d'impôt (forfait notice 2047 = 0 %) : ces lignes ne sont pas reportées en 8VL/8PL.
        </p>
      )}

      {/* Résultats ou état vide */}
      {declaration ? (
        <Resultats declaration={declaration} libellesLignes={libellesPrets} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez au moins un montant valide pour afficher les résultats.
        </div>
      )}

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal.
      </p>
    </div>
  );
}
