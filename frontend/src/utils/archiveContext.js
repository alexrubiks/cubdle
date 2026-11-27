import { createContext, useContext } from 'react';
import { resolveArchiveLink } from './games';

/** Date du défi d'archive en cours (fournie par <GameRoute archive>), null sinon. */
export const ArchiveContext = createContext(null);

export function useArchiveDate() {
  return useContext(ArchiveContext);
}

/**
 * Lien vers un autre jeu : null hors archive ; en archive, le jeu du même jour
 * réellement visé (en sautant ceux qui ne sont pas rejouables).
 */
export function useGameLink(to, direction = 'next') {
  const archiveDate = useArchiveDate();
  if (!archiveDate || !to) return null;
  return resolveArchiveLink(archiveDate, to, direction);
}
