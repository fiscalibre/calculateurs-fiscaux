/**
 * Conversion devise & utilitaires de montants pour l'UI du calculateur.
 *
 * RÈGLE D'OR (cf. moteur) : jamais de flottant pour stocker de l'argent côté moteur.
 * On convertit la saisie utilisateur (chaîne en euros) en **centimes entiers**
 * le plus tôt possible via `toCents`.
 *
 * Pour l'instant la conversion de devise est l'identité (on traite tout comme EUR).
 * Le module fx/BCE sera branché plus tard derrière `toCents` sans toucher à l'UI.
 */

export const DEVISE_DEFAUT = "EUR";

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
