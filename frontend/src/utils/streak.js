import { addDays, getParisToday, isLaunched } from './dates';

/** Jeux à terminer ce jour-là pour prolonger la série (le NR n'existe qu'après le lancement). */
export function requiredGames(date) {
  const games = ['cubeur', 'compet', 'ranking', 'podium', 'location'];
  return isLaunched(date) ? [...games, 'nr'] : games;
}

/**
 * Série 🔥 calculée depuis la progression locale (joueurs non connectés).
 * Même règle que le serveur (core/leaderboards.py, streak_for_user).
 */
export function computeLocalStreak(doneByDate, today = getParisToday()) {
  const complete = (d) => requiredGames(d).every((g) => doneByDate[d]?.includes(g));

  const todayDone = complete(today);
  let current = 0;
  let day = todayDone ? today : addDays(today, -1);
  while (complete(day)) {
    current += 1;
    day = addDays(day, -1);
  }

  let best = 0;
  let run = 0;
  let previous = null;
  for (const d of Object.keys(doneByDate).filter(complete).sort()) {
    run = previous && addDays(previous, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    previous = d;
  }

  return { current, best: Math.max(best, current), today_done: todayDone };
}
