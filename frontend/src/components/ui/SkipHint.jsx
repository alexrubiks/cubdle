import { useState } from 'react';
import { SkipForward } from 'lucide-react';
import Modal from './Modal';
import { API_URLS } from '../../utils';
import { addSkip, getSkips, withDate } from '../../utils/localProgress';
import { skipCount, skippedTotal } from '../../utils/skips';

/**
 * Bouton « Passer à l'indice » (icône sobre dans le champ) + modale de confirmation.
 * Ajoute les erreurs manquantes pour atteindre le prochain palier d'indice,
 * demande l'indice au serveur et le renvoie via onHint(data).
 *
 * - errors      : erreurs actuelles (passages compris)
 * - guessCount  : nombre d'essais réellement faits (position du passage)
 * - previousIds : identifiants des essais déjà faits (compteur serveur juste)
 */
export default function SkipHint({ game, errors, guessCount, previousIds, onHint, className = '' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const n = skipCount(errors);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const skipped = skippedTotal(getSkips(game)) + n;
      const res = await fetch(withDate(API_URLS.hintAfterSkip(game)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ previous_ids: previousIds, skipped }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const skips = addSkip(game, { at: guessCount, n, to: errors + n });
      onHint(data, skips);
      setOpen(false);
    } catch (e) {
      console.error('Passer à l’indice :', e);
      setError("Impossible de passer à l'indice pour le moment, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Passer à l'indice suivant"
        aria-label="Passer à l'indice suivant"
        className={`text-black/40 hover:text-black transition-colors cursor-pointer ${className}`}
      >
        <SkipForward size={20} strokeWidth={2.5} />
      </button>

      {open && (
        <Modal title="Passer à l'indice ?" onClose={() => !loading && setOpen(false)}>
          <p>
            Ça ajoute <strong>{n} erreur{n > 1 ? 's' : ''}</strong> d'un coup : tu passes
            de {errors} à {errors + n} erreurs et tu débloques la lettre suivante.
          </p>
          <p className="mt-2">Ces erreurs comptent dans ton score.</p>
          {error && <p className="mt-3 text-cubdle-red font-bold">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-4 py-2 rounded-xl border-2 border-black bg-white font-title font-bold text-black hover:scale-[1.03] transition-transform cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={loading}
              className={`px-4 py-2 rounded-xl border-2 border-black bg-cubdle-yellow font-title font-bold text-black hover:scale-[1.03] transition-transform cursor-pointer ${loading ? 'opacity-50' : ''}`}
            >
              Passer
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
