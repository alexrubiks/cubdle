import { setActiveDate } from '../utils/localProgress';

/**
 * Fixe la date du défi joué avant le rendu de la page de jeu.
 * À utiliser avec key={date} : changer de date (minuit, archive…)
 * remonte complètement la page, donc repart d'un état propre.
 */
export default function GameRoute({ date, children }) {
  setActiveDate(date);
  return children;
}
