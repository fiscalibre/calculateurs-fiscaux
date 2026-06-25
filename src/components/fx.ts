/**
 * Conversion devise & utilitaires de montants pour l'UI du calculateur.
 *
 * RÈGLE D'OR (cf. moteur) : jamais de flottant pour stocker de l'argent côté moteur.
 * On convertit la saisie utilisateur (chaîne en euros) en **centimes entiers**
 * le plus tôt possible via `toCents`.
 *
 * La conversion de devise est déléguée au moteur fx/BCE (`convertirEnEuros`) :
 * `toCents` parse la saisie en centimes de la devise source, puis `convertitVersEur`
 * applique le cours BCE du jour d'encaissement.
 */

import {
  convertirEnEuros,
  DEVISES_SUPPORTEES,
  DeviseInconnueError,
  DateInvalideError,
  DateHorsHistoriqueError,
} from "../lib/tax-engine/fx";

export const DEVISE_DEFAUT = "EUR";

/** Réexport pour l'UI : EUR + devises couvertes par l'historique BCE embarqué. */
export { DEVISES_SUPPORTEES };

/** Résultat de conversion : soit des centimes EUR, soit un message d'erreur FR. */
export type ConversionEur = { readonly cents: number } | { readonly erreur: string };

/**
 * Convertit une saisie utilisateur en euros (chaîne, ex. "1 234,56" ou "1234.56")
 * en centimes entiers. Renvoie `null` si la saisie n'est pas un nombre ≥ 0 valide.
 *
 * Point d'extension : quand le module BCE arrivera, on lui passera ici la devise
 * et la date d'encaissement pour convertir vers EUR avant l'arrondi en centimes.
 */
export function toCents(saisieEuros: string): number | null {
  const brut = saisieEuros.trim();
  if (brut === "") return null;
  // On tolère l'espace (séparateur de milliers FR) et la virgule décimale.
  const normalise = brut.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,})?$/.test(normalise)) return null;
  const valeur = Number(normalise);
  if (!Number.isFinite(valeur) || valeur < 0) return null;
  // Arrondi au centime le plus proche pour éviter les artefacts flottants (ex. 0,1 + 0,2).
  return Math.round(valeur * 100);
}

/** Vrai si la devise saisie nécessitera une conversion BCE (≠ EUR). */
export function devisErangere(devise: string): boolean {
  return devise.trim().toUpperCase() !== DEVISE_DEFAUT;
}

/**
 * Convertit une saisie utilisateur (chaîne) exprimée dans `devise` vers des
 * centimes d'EUR, au cours BCE du jour d'encaissement `dateISO`.
 *
 * - parse en centimes de la devise source via `toCents` (même normalisation) ;
 * - si EUR : centimes inchangés, la date n'est pas requise ;
 * - sinon : la date est obligatoire, puis on délègue à `convertirEnEuros` et on
 *   mappe les erreurs du moteur en messages FR lisibles (déjà en FR dans `.message`).
 *
 * Renvoie `{ cents }` en cas de succès, sinon `{ erreur }`.
 */
export function convertitVersEur(
  saisieMontant: string,
  devise: string,
  dateISO: string,
): ConversionEur {
  const centsDevise = toCents(saisieMontant);
  if (centsDevise === null) {
    return { erreur: "Montant invalide (nombre ≥ 0 attendu)." };
  }

  const dev = devise.trim().toUpperCase();
  if (dev === DEVISE_DEFAUT) {
    return { cents: centsDevise };
  }

  if (dateISO.trim() === "") {
    return { erreur: `Date d'encaissement requise pour convertir depuis ${dev}.` };
  }

  try {
    return { cents: convertirEnEuros(centsDevise, dev, dateISO) };
  } catch (e) {
    if (
      e instanceof DeviseInconnueError ||
      e instanceof DateInvalideError ||
      e instanceof DateHorsHistoriqueError
    ) {
      return { erreur: e.message };
    }
    // Garde-fou : toute autre erreur (ex. TypeError) reste lisible côté UI.
    return { erreur: e instanceof Error ? e.message : "Conversion impossible." };
  }
}

const formatteurEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formate des centimes entiers en euros lisibles (fr-FR), ex. 123456 → "1 234,56 €". */
export function formateCents(cents: number): string {
  return formatteurEuros.format(cents / 100);
}

/** Formate un montant déjà en euros entiers (valeurs des cases du moteur). */
export function formateEurosEntiers(euros: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(euros);
}
