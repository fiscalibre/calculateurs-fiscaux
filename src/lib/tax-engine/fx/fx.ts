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

/**
 * Forme du fichier de taux embarqué (cf. scripts/fetch-ecb-rates.mjs).
 *
 * Format COLONNAIRE pour la compacité : au lieu d'un objet par jour (qui répète les
 * clés devise des milliers de fois), on stocke `dates[]` (croissant) et une série
 * numérique par devise, `taux[devise][i]` étant le cours du jour `dates[i]`
 * (null = devise non cotée ce jour-là). ~5× plus léger que l'ancien format.
 */
interface DonneesTaux {
  readonly source: string;
  readonly url: string;
  readonly recupereLe: string;
  readonly dateMin: string;
  readonly dateMax: string;
  readonly devises: readonly string[];
  /** Dates ISO (YYYY-MM-DD) triées par ordre croissant. */
  readonly dates: readonly string[];
  /** DEVISE → série de taux alignée sur `dates` (null = non coté ce jour-là). */
  readonly taux: Readonly<Record<string, readonly (number | null)[]>>;
}

const TAUX = donnees as DonneesTaux;

/** Index date ISO → position dans `dates`, pour une résolution O(1) (avec repli). */
const INDEX_PAR_DATE: ReadonlyMap<string, number> = new Map(
  TAUX.dates.map((d, i) => [d, i]),
);

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
 * Index dans `dates` de la cotation BCE applicable à `dateISO`.
 *
 * RÈGLE DE REPLI : la BCE ne publie pas les week-ends ni les jours fériés TARGET.
 * On retient donc le **dernier jour ouvré antérieur ou égal** à la date demandée
 * (ex. un dimanche → le vendredi précédent). On remonte jour par jour jusqu'à
 * trouver une cotation, sans jamais sortir de l'historique embarqué.
 *
 * @throws DateHorsHistoriqueError si on remonte avant `dateMin` sans rien trouver
 *         (ex. date strictement antérieure au début de l'historique).
 */
function indexApplicable(dateISO: string): number {
  let courante = dateISO;
  // Filet de sécurité : un jour ouvré existe toujours à <= ~5 jours de recul,
  // mais on borne explicitement par dateMin pour ne pas boucler à l'infini.
  while (courante >= TAUX.dateMin) {
    const idx = INDEX_PAR_DATE.get(courante);
    if (idx !== undefined) return idx;
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

  // Devise hors périmètre : on tranche avant de chercher une date.
  const serie = TAUX.taux[devise];
  if (serie === undefined) throw new DeviseInconnueError(devise);

  if (dateISO > TAUX.dateMax) throw new DateHorsHistoriqueError(dateISO);

  const taux = serie[indexApplicable(dateISO)];
  // Devise non cotée ce jour-là (rare pour les majors) : pas de cours exploitable.
  if (taux === null || taux === undefined) throw new DateHorsHistoriqueError(dateISO);

  // Cotation BCE : 1 EUR = `taux` unités de devise → EUR = devise / taux.
  // Les centimes de devise et d'euro partageant le même facteur 100, on divise
  // directement les centimes par le taux, puis on arrondit au centime entier.
  const centsEur = montantDeviseCents / taux;
  return Math.round(centsEur);
}
