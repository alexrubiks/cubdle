import { isLaunched } from './dates';

/*
 * Registre des jeux, dans l'ordre du parcours (maj de décembre).
 * Sert à la navigation dans les archives (flèches, "Jeu suivant", calendrier).
 */
export const GAMES = [
  { slug: 'cubeur', path: '/cubeur', prefix: 'Devine le', title: 'CUBEUR', color: 'bg-cubdle-red', icon: '/events-icons/333.svg' },
  { slug: 'compet', path: '/competition', prefix: 'Devine la', title: 'COMPÉTITION', color: 'bg-cubdle-orange', icon: '/events-icons/pyram.svg' },
  { slug: 'ranking', path: '/ranking', prefix: 'Devine le', title: 'CLASSEMENT', color: 'bg-cubdle-yellow', icon: '/events-icons/minx.svg', noArchive: true },
  { slug: 'podium', path: '/podium', prefix: 'Devine le', title: 'PODIUM', color: 'bg-cubdle-green', icon: '/events-icons/333bf.svg' },
  { slug: 'nr', path: '/nr', prefix: 'Devine le', title: 'NR', color: 'bg-cubdle-blue', icon: '/events-icons/fto.svg', launchOnly: true },
  { slug: 'location', path: '/location', prefix: 'Devine la', title: 'LOCALISATION', color: 'bg-cubdle-purple', icon: '/events-icons/skewb.svg' },
];

export function gameBySlug(slug) {
  return GAMES.find((g) => g.slug === slug);
}

export function gameByPath(path) {
  return GAMES.find((g) => g.path === path);
}

/** Jeux rejouables en archive pour cette date (pas de Classement, NR seulement après le lancement). */
export function archiveGames(date) {
  return GAMES.filter((g) => !g.noArchive && (!g.launchOnly || isLaunched(date)));
}

export function archivePath(date, slug) {
  return `/archives/${date}/${slug}`;
}

/**
 * En archive : à partir d'un lien "normal" (ex : '/ranking' depuis la Compét),
 * renvoie le jeu d'archive correspondant, en sautant les jeux indisponibles
 * dans la direction de navigation (le parcours boucle).
 */
export function resolveArchiveLink(date, path, direction = 'next') {
  const available = archiveGames(date);
  let index = GAMES.findIndex((g) => g.path === path);
  if (index === -1) return null;

  const step = direction === 'prev' ? -1 : 1;
  for (let i = 0; i < GAMES.length; i++) {
    const game = GAMES[(index + i * step + GAMES.length * 2) % GAMES.length];
    if (available.includes(game)) return { ...game, to: archivePath(date, game.slug) };
  }
  return null;
}
