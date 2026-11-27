import { isLaunched } from './dates';

/*
 * Libellé court du score d'un jeu terminé (bandeau "terminé" de l'accueil et des archives),
 * calculé depuis la progression locale. null si le jeu n'est pas terminé.
 */

function plural(n, word) {
  return `${n} ${word}${n > 1 ? 'S' : ''}`;
}

export function doneLabel(slug, progress, date) {
  if (!progress?.[`${slug}_done`]) return null;

  switch (slug) {
    case 'cubeur':
    case 'compet': {
      const n = progress[`${slug}_guesses`]?.length ?? 0;
      if (!n) return 'TERMINÉ';
      if (n === 1) return 'COUP DE BOL';
      if (n === 2) return 'PERFECT';
      return plural(n, 'ESSAI');
    }
    case 'ranking': {
      const guesses = progress.ranking_guesses ?? [];
      if (isLaunched(date)) {
        const distance = guesses[0]?.distance;
        if (distance == null) return 'TERMINÉ';
        return distance === 0 ? 'PERFECT' : `${distance} D'ÉCART`;
      }
      if (!guesses.length) return 'TERMINÉ';
      return guesses.length === 1 ? 'PERFECT' : plural(guesses.length, 'ESSAI');
    }
    case 'podium': {
      const guesses = progress.podium_guesses ?? [];
      if (!guesses.length) return 'TERMINÉ';
      // erreurs = mauvaises réponses (le podium peut avoir plus de 3 lignes en cas d'ex æquo)
      const errors = guesses.filter((g) => !g.correct).length;
      return errors === 0 ? 'PERFECT' : plural(errors, 'ERREUR');
    }
    case 'nr': {
      const n = progress.nr_guesses?.length ?? 0;
      if (!n) return 'TERMINÉ';
      return n === 1 ? 'PERFECT' : plural(n, 'ESSAI');
    }
    case 'location': {
      const score = progress.location_guess?.result?.score;
      if (score == null) return 'TERMINÉ';
      return score >= 5000 ? 'PERFECT' : `${score.toLocaleString('fr-FR')} PTS`;
    }
    default:
      return 'TERMINÉ';
  }
}
