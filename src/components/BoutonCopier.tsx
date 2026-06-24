import { useState } from "react";

/**
 * Petit bouton « copier » s'appuyant sur navigator.clipboard.
 * Affiche un retour visuel temporaire (« Copié ! ») après succès.
 */
interface BoutonCopierProps {
  /** Valeur à copier dans le presse-papiers. */
  readonly valeur: string;
  /** Libellé accessible (ex. « Copier la case 8VL »). */
  readonly libelle: string;
}

export default function BoutonCopier({ valeur, libelle }: BoutonCopierProps) {
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(false);

  async function copier() {
    setErreur(false);
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1500);
    } catch {
      setErreur(true);
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-label={libelle}
      title={libelle}
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {erreur ? "Échec" : copie ? "Copié !" : "Copier"}
    </button>
  );
}
