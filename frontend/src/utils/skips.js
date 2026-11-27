/*
 * « Passer à l'indice » : ajoute volontairement des erreurs pour atteindre
 * directement le prochain palier d'indice (une lettre toutes les 5 erreurs).
 * Un passage = { at, n, to } : après `at` essais, +`n` erreurs, total d'erreurs `to`.
 * Les erreurs passées comptent dans le score.
 */

export const HINT_INTERVAL = 5;
export const SKIP_GAMES = ['cubeur', 'compet', 'podium', 'nr'];

export function skippedTotal(skips) {
  return (Array.isArray(skips) ? skips : []).reduce((sum, s) => sum + (Number(s?.n) > 0 ? Number(s.n) : 0), 0);
}

/** Nombre d'erreurs à ajouter pour atteindre le prochain palier (2 -> 3, 5 -> 5, 0 -> 5). */
export function skipCount(errors) {
  return HINT_INTERVAL - (errors % HINT_INTERVAL);
}

/** Union de deux listes de passages (même passage = même total `to`). */
export function mergeSkipLists(a, b) {
  const byTo = new Map();
  for (const s of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (s && Number(s.n) > 0 && !byTo.has(Number(s.to))) byTo.set(Number(s.to), { at: Number(s.at), n: Number(s.n), to: Number(s.to) });
  }
  return [...byTo.values()].sort((x, y) => x.to - y.to);
}

/**
 * Texte de partage : insère une ligne `skipLine(n)` à l'endroit de chaque passage.
 * `lines` est dans l'ordre chronologique (un élément par essai).
 */
export function interleaveSkips(lines, skips, skipLine) {
  const out = [];
  const sorted = mergeSkipLists(skips, []);
  let k = 0;
  for (let i = 0; i <= lines.length; i++) {
    while (k < sorted.length && sorted[k].at <= i) out.push(skipLine(sorted[k++].n));
    if (i < lines.length) out.push(lines[i]);
  }
  return out;
}
