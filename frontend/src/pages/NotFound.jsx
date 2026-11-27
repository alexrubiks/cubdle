import { useState } from 'react';
import { Link } from 'react-router-dom';
import CubdleLogo from '../components/ui/CubdleLogo';

/*
 * Page 404… et easter egg.
 * Une grille 3×3 toute rouge avec « 4 0 4 » sur la ligne du milieu.
 * Rien ne dit que c'est un jeu : cliquer une case la retourne avec ses voisines
 * (principe du « Lights Out »). But : tout passer au vert.
 * Le résultat est gardé dans le navigateur pour de futurs succès.
 */

export const EASTER_404_KEY = 'cubdle_easter_404';

const SIZE = 3;
const START = Array(SIZE * SIZE).fill(false); // false = rouge, true = vert
const DIGITS = { 3: '4', 4: '0', 5: '4' };

function neighbours(i) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out = [i];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}

// Nombre minimal de coups (512 combinaisons possibles : on les essaie toutes)
function optimalMoves(start) {
  let best = Infinity;
  for (let mask = 0; mask < 1 << (SIZE * SIZE); mask++) {
    const grid = [...start];
    let presses = 0;
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (mask & (1 << i)) {
        presses++;
        neighbours(i).forEach((n) => { grid[n] = !grid[n]; });
      }
    }
    if (grid.every(Boolean)) best = Math.min(best, presses);
  }
  return best;
}

const OPTIMAL = optimalMoves(START);

function saveResult(moves) {
  try {
    const prev = JSON.parse(localStorage.getItem(EASTER_404_KEY) || '{}');
    localStorage.setItem(EASTER_404_KEY, JSON.stringify({
      solved: true,
      best: Math.min(prev.best ?? Infinity, moves),
      optimal: Boolean(prev.optimal) || moves <= OPTIMAL,
      first_solved_at: prev.first_solved_at ?? new Date().toISOString(),
    }));
  } catch {
    // stockage indisponible (navigation privée…) : tant pis, c'est un easter egg
  }
}

export default function NotFound() {
  const [grid, setGrid] = useState(START);
  const [flips, setFlips] = useState(() => Array(SIZE * SIZE).fill(0));
  const [moves, setMoves] = useState(0);
  const solved = grid.every(Boolean);

  function press(i) {
    if (solved) return;
    const touched = neighbours(i);
    const next = [...grid];
    touched.forEach((n) => { next[n] = !next[n]; });
    setGrid(next);
    setFlips((f) => f.map((v, k) => (touched.includes(k) ? v + 1 : v)));
    const count = moves + 1;
    setMoves(count);
    if (next.every(Boolean)) saveResult(count);
  }

  function replay() {
    setGrid(START);
    setFlips((f) => f.map((v) => v + 1));
    setMoves(0);
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center px-4 pt-6 pb-8">
      <Link to="/" className="flex justify-center mb-10 hover:scale-105 transition-transform">
        <CubdleLogo className="text-[4em] md:text-[6em]" />
      </Link>

      <div className="grid grid-cols-3 gap-2 md:gap-3" role="grid" aria-label="Erreur 404 : page introuvable">
        {grid.map((green, i) => (
          <button
            key={i}
            type="button"
            onClick={() => press(i)}
            disabled={solved}
            aria-label={moves === 0 && DIGITS[i] ? DIGITS[i] : undefined}
            className={`w-20 h-20 md:w-24 md:h-24 bg-black rounded-2xl p-1.5 ${solved ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div
              key={flips[i]}
              className={`tile-flip w-full h-full rounded-xl flex items-center justify-center font-title font-extrabold text-4xl md:text-5xl text-black
                ${flips[i] > 0 ? 'tile-flip-run' : 'tile-flip-intro'}
                ${green ? 'bg-cubdle-green' : 'bg-cubdle-red'}`}
              style={flips[i] > 0 ? undefined : { animationDelay: `${(i % SIZE) * 120 + Math.floor(i / SIZE) * 60}ms` }}
            >
              {moves === 0 && DIGITS[i]}
            </div>
          </button>
        ))}
      </div>

      <div className="h-12 mt-6 flex flex-col items-center justify-center font-body text-sm">
        {solved && (
          <>
            <span className="font-title font-bold text-white">
              {moves <= OPTIMAL ? 'Parfait !' : `${moves} coups (optimal : ${OPTIMAL})`}
            </span>
            <button type="button" onClick={replay} className="text-white/70 underline hover:text-white cursor-pointer">
              Rejouer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
