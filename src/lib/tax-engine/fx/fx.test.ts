import { describe, it, expect } from "vitest";
import {
  convertirEnEuros,
  DeviseInconnueError,
  DateHorsHistoriqueError,
  DateInvalideError,
  DEVISES_SUPPORTEES,
} from "./fx";

/**
 * Valeurs de référence prises directement dans eurofxref-hist.csv (BCE) :
 *   2010-02-10 (mercredi) : 1 EUR = 1.374 USD
 *   1999-01-08 (vendredi) : 1 EUR = 1.1659 USD ; le 1999-01-10 est un dimanche (non publié)
 */

describe("convertirEnEuros — change BCE", () => {
  it("USD → EUR à une date connue (2010-02-10, 1 EUR = 1.374 USD)", () => {
    // 100,00 USD = 10000 cents ; 10000 / 1.374 = 7278,02… → 7278 cents (72,78 €)
    expect(convertirEnEuros(10_000, "USD", "2010-02-10")).toBe(7278);
  });

  it("EUR → EUR : montant strictement inchangé, sans lecture de taux", () => {
    expect(convertirEnEuros(123_45, "EUR", "2010-02-10")).toBe(12_345);
    // EUR fonctionne même hors historique (aucune conversion) :
    expect(convertirEnEuros(999, "EUR", "2099-12-31")).toBe(999);
  });

  it("repli week-end : un dimanche prend le vendredi précédent", () => {
    // 1999-01-10 = dimanche (non publié) → cours du vendredi 1999-01-08 (1.1659).
    const dimanche = convertirEnEuros(100_000, "USD", "1999-01-10");
    const vendredi = convertirEnEuros(100_000, "USD", "1999-01-08");
    expect(dimanche).toBe(vendredi);
    // 100000 / 1.1659 = 85770,6… → 85771 cents.
    expect(dimanche).toBe(85_771);
  });

  it("devise inconnue → DeviseInconnueError", () => {
    expect(() => convertirEnEuros(10_000, "XYZ", "2010-02-10")).toThrow(
      DeviseInconnueError,
    );
    // Une devise BCE non retenue dans le périmètre FR doit aussi échouer proprement.
    expect(() => convertirEnEuros(10_000, "BRL", "2010-02-10")).toThrow(
      DeviseInconnueError,
    );
  });

  it("date hors historique → DateHorsHistoriqueError", () => {
    expect(() => convertirEnEuros(10_000, "USD", "2099-01-01")).toThrow(
      DateHorsHistoriqueError,
    );
    expect(() => convertirEnEuros(10_000, "USD", "1990-01-01")).toThrow(
      DateHorsHistoriqueError,
    );
  });

  it("format de date invalide → DateInvalideError", () => {
    expect(() => convertirEnEuros(10_000, "USD", "10/02/2010")).toThrow(
      DateInvalideError,
    );
    expect(() => convertirEnEuros(10_000, "USD", "2010-13-99")).toThrow(
      DateInvalideError,
    );
  });

  it("montant non entier (centimes) → TypeError", () => {
    expect(() => convertirEnEuros(100.5, "USD", "2010-02-10")).toThrow(TypeError);
  });

  it("le résultat est toujours un entier de centimes (pas de flottant qui traîne)", () => {
    for (const devise of DEVISES_SUPPORTEES) {
      const c = convertirEnEuros(33_333, devise, "2010-02-10");
      expect(Number.isInteger(c)).toBe(true);
    }
  });
});
