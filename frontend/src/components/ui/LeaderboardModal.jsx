import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { API_URLS } from '../../utils';

const GAMES = [
  { 
    slug: "cubeur", 
    label: "Cubeur", 
    shortLabel: "Cubeur",
    unit: "essais",
    scoreLabels: { 1: "COUP DE BOL", 2: "PERFECT" }
  },
  { 
    slug: "compet", 
    label: "Compétition", 
    shortLabel: "Compet",
    unit: "essais",
    scoreLabels: { 1: "COUP DE BOL", 2: "PERFECT" }
  },
  { 
    slug: "ranking", 
    label: "Classement", 
    shortLabel: "Classmt",
    unit: "essais",
    scoreLabels: { 1: "PERFECT" }
  },
  { 
    slug: "podium", 
    label: "Podium", 
    shortLabel: "Podium",
    unit: "erreur",
    scoreLabels: { 0: "PERFECT" }
  },
  { 
    slug: "location", 
    label: "Localisation", 
    shortLabel: "Local",
    unit: "",
    scoreLabels: { 5000: "PERFECT" }
  },
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
    if (game.scoreLabels?.[score]) {
      return game.scoreLabels[score];
    }

    if (game.slug === "podium") {
      return `${score} ${score > 1 ? "erreurs" : "erreur"}`;
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
          rounded-2xl border-4 border-black bg-[#FDFBD4] 
          p-6 max-[425px]:p-4
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 flex h-8 w-8 max-[425px]:h-7 max-[425px]:w-7
            items-center justify-center rounded-full hover:bg-black/5
          "
        >
          <X size={18} strokeWidth={3} className="max-[425px]:w-[15px] max-[425px]:h-[15px]" />
        </button>

        {/* TITLE */}
        <div className="mt-4 max-[425px]:mt-2 mb-8 max-[425px]:mb-5 flex items-center justify-center gap-2">
          <Trophy
            size={32}
            strokeWidth={3}
            className="fill-cubdle-yellow max-[425px]:w-6 max-[425px]:h-6"
          />
          <h2 className="font-title font-extrabold uppercase text-[clamp(12px,calc(8vw_-_13.6px),24px)]">
            Classements du jour
          </h2>
        </div>

        {/* TABS */}
        <div className="flex flex-col gap-2 max-[425px]:gap-1.5">

          {/* Première ligne : 3 boutons */}
          <div className="grid grid-cols-3 gap-2">
            {GAMES.slice(0, 3).map((g) => (
              <button
                key={g.slug}
                onClick={() => setActiveGame(g.slug)}
                className={`
                  px-3 py-2 max-[425px]:px-2 max-[425px]:py-1.5
                  rounded-xl border-2 border-black
                  font-title font-bold text-sm max-[425px]:text-xs
                  transition-colors
                  ${activeGame === g.slug ? 'bg-cubdle-yellow' : 'bg-white hover:bg-cubdle-yellow/20'}
                `}
              >
                <span className="max-[425px]:hidden">{g.label}</span>
                <span className="hidden max-[425px]:inline">{g.shortLabel}</span>
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
                  px-3 py-2 max-[425px]:px-2 max-[425px]:py-1.5
                  rounded-xl border-2 border-black
                  font-title font-bold text-sm max-[425px]:text-xs
                  transition-colors
                  ${activeGame === g.slug ? 'bg-cubdle-yellow' : 'bg-white hover:bg-cubdle-yellow/20'}
                `}
              >
                {g.label}
              </button>
            ))}
          </div>

        </div>


        {/* LISTE */}
        <div className="mt-5 max-[425px]:mt-3 flex-1 overflow-y-auto">
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
                <div className="flex items-center gap-3 max-[425px]:gap-2">
                  <span className="
                    font-title font-extrabold text-center max-[425px]:text-xs
                  ">
                    {getRank(index)}
                  </span>

                  <span className="font-bold max-[425px]:text-xs">
                    {entry.pseudo}
                  </span>
                </div>

                <span
                  className={`
                    font-body font-bold text-base max-[425px]:text-xs
                    ${formatScore(entry.score, currentGame) === "PERFECT"
                      ? "text-green-500"
                      : formatScore(entry.score, currentGame) === "COUP DE BOL"
                        ? "text-yellow-500"
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