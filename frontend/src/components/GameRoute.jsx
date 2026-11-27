import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { setActiveDate } from '../utils/localProgress';
import { formatDateFr } from '../utils/dates';
import { ArchiveContext } from '../utils/archiveContext';

/**
 * Fixe la date du défi joué avant le rendu de la page de jeu.
 * À utiliser avec key={date} : changer de date (minuit, archive…)
 * remonte complètement la page, donc repart d'un état propre.
 * En archive (archive=true) : bandeau d'info + liens réécrits vers les jeux du même jour.
 */
export default function GameRoute({ date, archive = false, children }) {
  setActiveDate(date);

  if (!archive) return children;

  return (
    <ArchiveContext.Provider value={date}>
      <div className="flex justify-center px-5 pt-3">
        <Link
          to="/archives"
          className="flex items-center gap-2 rounded-xl border-2 border-black bg-white/90 px-3 py-1.5 font-body text-xs text-black hover:bg-white"
        >
          <CalendarDays size={14} strokeWidth={2.5} className="shrink-0" />
          <span>
            Défi du <strong>{formatDateFr(date)}</strong>, joué en décalé (hors classement)
          </span>
        </Link>
      </div>
      {children}
    </ArchiveContext.Provider>
  );
}
