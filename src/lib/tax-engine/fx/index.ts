/**
 * Point d'entrée public du module de change BCE.
 * Cours de référence fiscal : taux de change BCE du jour d'encaissement.
 */
export {
  convertirEnEuros,
  DEVISES_SUPPORTEES,
  DeviseInconnueError,
  DateHorsHistoriqueError,
  DateInvalideError,
} from "./fx";
