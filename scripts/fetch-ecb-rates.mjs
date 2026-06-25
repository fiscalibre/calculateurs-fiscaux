#!/usr/bin/env node
/**
 * Régénère src/lib/tax-engine/fx/ecb-rates.json depuis le CSV historique BCE.
 *
 * - Télécharge eurofxref-hist.zip (fetch global de node 22, repli curl) puis en
 *   extrait eurofxref-hist.csv via zlib (déflate, modules built-in uniquement).
 *   NB : l'endpoint .csv « brut » de la BCE peut renvoyer une version tronquée
 *   selon le CDN ; le .zip sert l'historique complet et à jour.
 * - Parse le CSV (1ère colonne « Date », puis une colonne par devise, dates ISO).
 * - Ne garde que les 11 devises retenues, omet les cellules « N/A » / vides.
 * - Ne conserve que les ANNEES dernières années (les déclarations courantes et
 *   rectificatives n'ont pas besoin de l'historique 1999-2014 → fichier ~5× plus léger).
 * - Format COLONNAIRE numérique : `dates[]` (croissant) + `taux[devise][i]` aligné sur
 *   `dates[i]` (number, ou null si non coté ce jour-là). ~2× plus compact qu'un objet
 *   par jour avec les clés devise répétées. cf. fx.ts pour la lecture.
 *
 * Node pur, aucune dépendance npm.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";

// L'archive ZIP contient l'historique complet ; on l'utilise en priorité.
const URL_ZIP = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip";
// URL « brute » publiée dans le JSON (référence officielle du jeu de données).
const URL_CSV =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.csv";

const DEVISES = [
  "USD", "GBP", "CHF", "CAD", "AUD", "JPY",
  "SEK", "NOK", "DKK", "HKD", "SGD",
];

// Nombre d'années d'historique conservées (année courante incluse). Couvre largement
// la déclaration de l'année N-1 et le droit de réclamation (≈ N+2/N+3).
const ANNEES = 11;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SORTIE = resolve(__dirname, "../src/lib/tax-engine/fx/ecb-rates.json");

async function telechargerZip() {
  try {
    const reponse = await fetch(URL_ZIP);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return Buffer.from(await reponse.arrayBuffer());
  } catch (err) {
    console.warn(`fetch a échoué (${err.message}), repli sur curl…`);
    return execFileSync(
      "curl",
      ["-sS", "--max-time", "120", "-o", "-", URL_ZIP],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );
  }
}

/**
 * Extrait la première entrée de l'archive ZIP (un seul CSV attendu) en pur
 * built-in. On lit l'entête local (signature 0x04034b50), on saute nom + extra,
 * puis on inflate les données (méthode 8 = deflate, sinon stored).
 */
function extraireCsvDuZip(buf) {
  const SIG_LOCAL = 0x04034b50;
  if (buf.readUInt32LE(0) !== SIG_LOCAL) {
    throw new Error("Archive ZIP invalide (signature d'entête absente).");
  }
  const methode = buf.readUInt16LE(8);
  const tailleCompressee = buf.readUInt32LE(18);
  const longueurNom = buf.readUInt16LE(26);
  const longueurExtra = buf.readUInt16LE(28);
  const debut = 30 + longueurNom + longueurExtra;
  const donnees = buf.subarray(debut, debut + tailleCompressee);

  if (methode === 0) return donnees.toString("utf8"); // stored
  if (methode === 8) return inflateRawSync(donnees).toString("utf8"); // deflate
  throw new Error(`Méthode de compression ZIP non gérée : ${methode}.`);
}

async function telechargerCsv() {
  const zip = await telechargerZip();
  return extraireCsvDuZip(zip);
}

function parserCsv(texte) {
  // Le CSV BCE peut avoir des fins de ligne CRLF et une virgule finale.
  const lignes = texte
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  const entete = lignes[0].split(",").map((c) => c.trim());
  // Index de chaque devise voulue dans l'entête.
  const indexDevise = new Map();
  for (const dev of DEVISES) {
    const idx = entete.indexOf(dev);
    if (idx === -1) throw new Error(`Devise absente du CSV : ${dev}`);
    indexDevise.set(dev, idx);
  }

  const taux = {};
  for (let i = 1; i < lignes.length; i++) {
    const cellules = lignes[i].split(",");
    const date = cellules[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const jour = {};
    for (const dev of DEVISES) {
      const brut = (cellules[indexDevise.get(dev)] ?? "").trim();
      // Omettre N/A et cellules vides : fx.ts attend l'absence de clé.
      if (brut === "" || brut === "N/A") continue;
      jour[dev] = brut;
    }
    taux[date] = jour;
  }
  return taux;
}

async function principal() {
  const csv = await telechargerCsv();
  const tauxParJour = parserCsv(csv);

  // Fenêtre temporelle : on ne garde que les ANNEES dernières années.
  const anneeCourante = new Date().getUTCFullYear();
  const seuil = `${anneeCourante - ANNEES + 1}-01-01`;

  const dates = Object.keys(tauxParJour)
    .filter((d) => d >= seuil)
    .sort(); // croissant
  if (dates.length === 0) throw new Error("Aucune date parsée depuis le CSV.");
  const dateMin = dates[0];
  const dateMax = dates[dates.length - 1];

  // Format colonnaire : une série numérique par devise, alignée sur `dates`.
  // null = devise non cotée ce jour-là (rare pour les majors retenues).
  const taux = {};
  for (const dev of DEVISES) {
    taux[dev] = dates.map((d) => {
      const brut = tauxParJour[d]?.[dev];
      return brut === undefined ? null : Number(brut);
    });
  }

  const sortie = {
    source:
      "European Central Bank — eurofxref-hist.csv (taux de référence quotidiens)",
    url: URL_CSV,
    recupereLe: new Date().toISOString().slice(0, 10),
    description:
      "1 EUR = N unités de devise (cotation BCE). Convertir devise→EUR = montant / taux. " +
      "Format colonnaire : taux[devise][i] correspond à dates[i] (null = non coté).",
    devises: DEVISES,
    dateMin,
    dateMax,
    dates,
    taux,
  };

  writeFileSync(SORTIE, JSON.stringify(sortie), "utf8");
  console.log(
    `Écrit ${SORTIE}\n  dateMin=${dateMin} dateMax=${dateMax} nbDates=${dates.length} (fenêtre ${ANNEES} ans)`,
  );
}

principal().catch((err) => {
  console.error(err);
  process.exit(1);
});
