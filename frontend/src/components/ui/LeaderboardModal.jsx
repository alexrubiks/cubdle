import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { API_URLS } from '../../utils';

const GAMES = [
  { slug: "cubeur", label: "Cubeur", unit: "essais" },
  { slug: "compet", label: "Compétition", unit: "essais" },
  { slug: "ranking", label: "Classement", unit: "essais" },
  { slug: "podium", label: "Podium", unit: "erreurs" },
  { slug: "location", label: "Localisation", unit: "" },
];

export default function LeaderboardModal({ 
    onClose,
    initialGame = "cubeur",
  }) {
  const [activeGame, setActiveGame] = useState(initialGame);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetch(`${API_URLS.leaderboard}?game=${activeGame}`)
      .then((res) => res.json())
      .then((data) => setScores(data))
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [activeGame]);

  const currentGame = GAMES.find((g) => g.slug === activeGame);

  function getRank(index) {
    if (index === 0) return 1;

    if (scores[index].score === scores[index - 1].score) {
      return getRank(index - 1);
    }

    return index + 1;
  }

  function formatScore(score, game) {
    if (game.slug === "location" && score === 5000) {
      return "PERFECT";
    }

    if (game.slug !== "location" && score === 1) {
      return "PERFECT";
    }

    return `${score} ${game.unit}`;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 px-5 py-5"
      onMouseDown={onClose}
    >
      <div
        className="
          relative mx-auto flex h-full w-full max-w-md flex-col
          rounded-2xl border-4 border-black bg-[#FDFBD4] p-6
        "
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 flex h-8 w-8 items-center justify-center
            rounded-full bg-[#FDFBD4]
            hover:bg-black/5
          "
        >
          <X size={18} strokeWidth={3} />
        </button>


        {/* TITLE */}
        <div className="mt-4 mb-8 flex items-center justify-center gap-2">
          <Trophy
            size={32}
            strokeWidth={3}
            className="fill-cubdle-yellow"
          />

          <h2 className="
            font-title text-2xl font-extrabold uppercase
          ">
            Classements du jour
          </h2>
        </div>

        {/* TABS */}
        <div className="flex flex-col gap-2">

          {/* Première ligne : 3 boutons */}
          <div className="grid grid-cols-3 gap-2">
            {GAMES.slice(0, 3).map((g) => (
              <button
                key={g.slug}
                onClick={() => setActiveGame(g.slug)}
                className={`
                  px-3 py-2 rounded-xl border-2 border-black
                  font-title font-bold text-sm
                  transition-colors

                  ${
                    activeGame === g.slug
                      ? 'bg-cubdle-yellow'
                      : 'bg-white hover:bg-cubdle-yellow/20'
                  }
                `}
              >
                {g.label}
              </button>
            ))}
          </div>


          {/* Deuxième ligne : 2 boutons */}
          <div className="grid grid-cols-2 gap-2">
            {GAMES.slice(3).map((g) => (
              <button
                key={g.slug}
                onClick={() => setActiveGame(g.slug)}
                className={`
                  px-3 py-2 rounded-xl border-2 border-black
                  font-title font-bold text-sm
                  transition-colors

                  ${
                    activeGame === g.slug
                      ? 'bg-cubdle-yellow'
                      : 'bg-white hover:bg-cubdle-yellow/20'
                  }
                `}
              >
                {g.label}
              </button>
            ))}
          </div>

        </div>


        {/* LISTE */}
        <div className="mt-5 flex-1 overflow-y-auto">
          {loading ? (
            <p className="font-body text-sm text-black/50 text-center py-4">
              Chargement...
            </p>

          ) : scores.length === 0 ? (

            <p className="font-body text-sm text-black/50 text-center py-4">
              Aucun score enregistré aujourd'hui.
            </p>

          ) : (

            scores.map((entry, index) => (
              <div
                key={index}
                className="
                  flex items-center justify-between
                  px-4 py-2 mb-2
                  rounded-lg bg-black/5
                  font-body text-base
                "
              >
                <div className="flex items-center gap-3">
                  <span className="
                    font-title font-extrabold w-4 text-center
                  ">
                    {getRank(index)}
                  </span>

                  <span className="font-bold">
                    {entry.pseudo}
                  </span>
                </div>

                <span
                  className={`
                    font-body font-bold text-base
                    ${formatScore(entry.score, currentGame) === "PERFECT"
                      ? "text-green-500"
                      : "text-sky-500"
                    }
                  `}
                >
                  {formatScore(entry.score, currentGame)}
                </span>
              </div>
            ))

          )}
        </div>

      </div>
    </div>
  );
}