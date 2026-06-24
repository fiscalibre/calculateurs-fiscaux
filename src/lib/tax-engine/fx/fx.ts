/**
 * Conversion de change devise → EUR au **cours de référence BCE**.
 *
 * Règle fiscale : un revenu encaissé en devise étrangère se convertit en euros au
 * cours de change du **jour d'encaissement**. Le cours de référence retenu est le
 * taux quotidien publié par la Banque centrale européenne (eurofxref-hist.csv).
 *
 * Module pur : aucune dépendance externe, aucune I/O. Les taux sont embarqués
 * (`ecb-rates.json`). Cohérent avec le reste du moteur : **argent en centimes
 * entiers**, jamais de flottant qui traîne dans le résultat stocké.
 *
 * Cotation BCE : le JSON donne « 1 EUR = N unités de devise ». Donc
 *   montantEUR = montantDevise / N.
 */

import donnees from "./ecb-rates.json";

/** Forme du fichier de taux embarqué (cf. générateur). */
interface DonneesTaux {
  readonly source: string;
  readonly url: string;
  readonly recupereLe: string;
  readonly dateMin: string;
  readonly dateMax: string;
  readonly devises: readonly string[];
  /** date ISO (YYYY-MM-DD) → { DEVISE: "taux décimal en chaîne" }. */
  readonly taux: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

const TAUX = donnees as DonneesTaux;

/** Devises couvertes par le fichier embarqué (hors EUR). */
export const DEVISES_SUPPORTEES: readonly string[] = TAUX.devises;

/** Erreur explicite : la devise n'est pas couverte par le fichier de taux BCE. */
export class DeviseInconnueError extends Error {
  constructor(public readonly devise: string) {
    super(
      `Devise non supportée : « ${devise} ». ` +
        `Devises disponibles : EUR, ${TAUX.devises.join(", ")}.`,
    );
    this.name = "DeviseInconnueError";
  }
}

/** Erreur explicite : la date demandée est hors de l'historique BCE embarqué. */
export class DateHorsHistoriqueError extends Error {
  constructor(public readonly dateISO: string) {
    super(
      `Date « ${dateISO} » hors historique BCE (${TAUX.dateMin} → ${TAUX.dateMax}).`,
    );
    this.name = "DateHorsHistoriqueError";
  }
}

/** Erreur explicite : format de date non valide (attendu YYYY-MM-DD). */
export class DateInvalideError extends Error {
  constructor(public readonly dateISO: string) {
    super(`Date invalide : « ${dateISO} » (format attendu : YYYY-MM-DD).`);
    this.name = "DateInvalideError";
  }
}

const FORMAT_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Retire un jour à une date ISO (calcul calendaire UTC, sans dépendance). */
function jourPrecedent(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Trouve la cotation BCE applicable à `dateISO`.
 *
 * RÈGLE DE REPLI : la BCE ne publie pas les week-ends ni les jours fériés TARGET.
 * On retient donc le **dernier jour ouvré antérieur ou égal** à la date demandée
 * (ex. un dimanche → le vendredi précédent). On remonte jour par jour jusqu'à
 * trouver une cotation, sans jamais sortir de l'historique embarqué.
 *
 * @throws DateHorsHistoriqueError si on remonte avant `dateMin` sans rien trouver
 *         (ex. date strictement antérieure au début de l'historique).
 */
function cotationApplicable(dateISO: string): Readonly<Record<string, string>> {
  let courante = dateISO;
  // Filet de sécurité : un jour ouvré existe toujours à <= ~5 jours de recul,
  // mais on borne explicitement par dateMin pour ne pas boucler à l'infini.
  while (courante >= TAUX.dateMin) {
    const cot = TAUX.taux[courante];
    if (cot !== undefined) return cot;
    courante = jourPrecedent(courante);
  }
  throw new DateHorsHistoriqueError(dateISO);
}

/**
 * Convertit un montant en devise étrangère vers des **centimes d'euro entiers**,
 * au cours de référence BCE du jour d'encaissement (avec repli jour ouvré).
 *
 * @param montantDeviseCents Montant en centimes de la devise source (entier).
 * @param devise            Code ISO 4217 (« USD », « EUR », …).
 * @param dateISO           Jour d'encaissement, format YYYY-MM-DD.
 * @returns Montant en **centimes d'EUR entiers**, arrondi au centime le plus proche.
 *
 * @throws DateInvalideError       si le format de date est incorrect.
 * @throws DeviseInconnueError     si la devise n'est pas couverte.
 * @throws DateHorsHistoriqueError si la date (après repli) précède l'historique BCE,
 *                                 ou si la devise n'est pas cotée ce jour-là.
 */
export function convertirEnEuros(
  montantDeviseCents: number,
  devise: string,
  dateISO: string,
): number {
  if (!Number.isInteger(montantDeviseCents)) {
    throw new TypeError(
      `montantDeviseCents doit être un entier (centimes), reçu : ${montantDeviseCents}.`,
    );
  }
  if (!FORMAT_ISO.test(dateISO) || Number.isNaN(Date.parse(`${dateISO}T00:00:00Z`))) {
    throw new DateInvalideError(dateISO);
  }

  // EUR → EUR : montant inchangé, pas de conversion.
  if (devise === "EUR") return montantDeviseCents;

  if (dateISO > TAUX.dateMax) throw new DateHorsHistoriqueError(dateISO);

  const cotation = cotationApplicable(dateISO);
  const tauxStr = cotation[devise];
  if (tauxStr === undefined) {
    // Devise non gérée du tout, ou non cotée ce jour-là.
    if (!DEVISES_SUPPORTEES.includes(devise)) throw new DeviseInconnueError(devise);
    throw new DateHorsHistoriqueError(dateISO);
  }

  // Cotation BCE : 1 EUR = `taux` unités de devise → EUR = devise / taux.
  // Les centimes de devise et d'euro partageant le même facteur 100, on divise
  // directement les centimes par le taux, puis on arrondit au centime entier.
  const taux = Number(tauxStr);
  const centsEur = montantDeviseCents / taux;
  return Math.round(centsEur);
}
