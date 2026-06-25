import { describe, it, expect } from "vitest";
import {
  convertirEnEuros,
  DeviseInconnueError,
  DateHorsHistoriqueError,
  DateInvalideError,
  DEVISES_SUPPORTEES,
} from "./fx";

/**
 * Valeurs de référence prises directement dans eurofxref-hist (BCE), dans la fenêtre
 * d'historique embarquée (≈ 11 dernières années) :
 *   2024-01-02 (mardi)    : 1 EUR = 1.0956 USD
 *   2024-01-05 (vendredi) : 1 EUR = 1.0921 USD ; le 2024-01-07 est un dimanche (non publié)
 */

describe("convertirEnEuros — change BCE", () => {
  it("USD → EUR à une date connue (2024-01-02, 1 EUR = 1.0956 USD)", () => {
    // 100,00 USD = 10000 cents ; 10000 / 1.0956 = 9127,4… → 9127 cents (91,27 €)
    expect(convertirEnEuros(10_000, "USD", "2024-01-02")).toBe(9127);
  });

  it("EUR → EUR : montant strictement inchangé, sans lecture de taux", () => {
    expect(convertirEnEuros(123_45, "EUR", "2024-01-02")).toBe(12_345);
    // EUR fonctionne même hors historique (aucune conversion) :
    expect(convertirEnEuros(999, "EUR", "2099-12-31")).toBe(999);
  });

  it("repli week-end : un dimanche prend le vendredi précédent", () => {
    // 2024-01-07 = dimanche (non publié) → cours du vendredi 2024-01-05 (1.0921).
    const dimanche = convertirEnEuros(100_000, "USD", "2024-01-07");
    const vendredi = convertirEnEuros(100_000, "USD", "2024-01-05");
    expect(dimanche).toBe(vendredi);
    // 100000 / 1.0921 = 91566,7… → 91567 cents.
    expect(dimanche).toBe(91_567);
  });

  it("devise inconnue → DeviseInconnueError", () => {
    expect(() => convertirEnEuros(10_000, "XYZ", "2024-01-02")).toThrow(
      DeviseInconnueError,
    );
    // Une devise BCE non retenue dans le périmètre FR doit aussi échouer proprement.
    expect(() => convertirEnEuros(10_000, "BRL", "2024-01-02")).toThrow(
      DeviseInconnueError,
    );
  });

  it("date hors historique → DateHorsHistoriqueError", () => {
    expect(() => convertirEnEuros(10_000, "USD", "2099-01-01")).toThrow(
      DateHorsHistoriqueError,
    );
    // Date antérieure à la fenêtre embarquée (historique tronqué aux ~11 dernières années).
    expect(() => convertirEnEuros(10_000, "USD", "1990-01-01")).toThrow(
      DateHorsHistoriqueError,
    );
  });

  it("format de date invalide → DateInvalideError", () => {
    expect(() => convertirEnEuros(10_000, "USD", "02/01/2024")).toThrow(
      DateInvalideError,
    );
    expect(() => convertirEnEuros(10_000, "USD", "2024-13-99")).toThrow(
      DateInvalideError,
    );
  });

  it("montant non entier (centimes) → TypeError", () => {
    expect(() => convertirEnEuros(100.5, "USD", "2024-01-02")).toThrow(TypeError);
  });

  it("le résultat est toujours un entier de centimes (pas de flottant qui traîne)", () => {
    for (const devise of DEVISES_SUPPORTEES) {
      const c = convertirEnEuros(33_333, devise, "2024-01-02");
      expect(Number.isInteger(c)).toBe(true);
    }
  });
});
