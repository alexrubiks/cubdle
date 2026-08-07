import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import { formatRankingScore } from '../utils';
import GameNavCard from '../components/ui/GameNavCard';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import { addGuess, getDone, saveDone, getGuesses, saveLatestHint, getLatestHint, submitScore, refreshFromServer } from '../utils/localProgress';

function buildShareTextPodium(guesses, challenge) {
  return [
    '🎯 Cubdle — Devine le Podium 🥇🥈🏅',
    `${challenge.podium_competition_name} - ${challenge.podium_event?.name}`,
    '',
    `Trouvé en ${guesses.length - 3} erreur${guesses.length - 3 > 1 ? 's' : ''} !`,
    '',
    'https://cubdle.fr',
  ].join('\n');
}

function PodiumRow({ medal, cubeur, eventSlug, color, hint }) {
  return (
    <div
      className={`grid grid-cols-3 items-center border-b border-black/10 font-body text-sm ${
        cubeur ? color : ''
      }`}
    >
      <div className="px-3 py-3 text-center text-xl">
        {medal}
      </div>

      <div className="px-3 py-3 font-bold">
        {cubeur
          ? cubeur.name
          : (hint ? `${hint}...` : "???")}
      </div>

      <div className="px-3 py-3 text-center font-bold">
        {cubeur
          ? formatRankingScore(cubeur.score, eventSlug)
          : "??"}
      </div>
    </div>
  );
}


function GuessRow({ guess, eventSlug }) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-black/10 font-body text-sm bg-cubdle-red/75">

      <div className="px-3 py-2 text-center font-bold">
        {guess.in_final
          ? `${guess.position}e`
          : "❌"}
      </div>

      <div className="px-3 py-2 font-bold">
        {guess.name}
      </div>

      <div className="px-3 py-2 text-center">
        {guess.score != null
          ? formatRankingScore(guess.score, eventSlug)
          : "—"}
      </div>

    </div>
  );
}


function PodiumTable({ podium, guesses, eventSlug, hints }) {
  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white mb-6">
      <div className="grid grid-cols-3 bg-black text-white font-body font-bold text-xs uppercase">
        <div className="px-3 py-2 text-center">Place</div>
        <div className="px-3 py-2">Cubeur</div>
        <div className="px-3 py-2 text-center">Temps</div>
      </div>

      <PodiumRow medal="🥇" cubeur={podium[1]} eventSlug={eventSlug} color="bg-yellow-300/50" hint={hints[1]} />
      <PodiumRow medal="🥈" cubeur={podium[2]} eventSlug={eventSlug} color="bg-gray-300/70" hint={hints[2]} />
      <PodiumRow medal="🥉" cubeur={podium[3]} eventSlug={eventSlug} color="bg-orange-300/50" hint={hints[3]} />

      {/* MAUVAISES REPONSES */}
      {[...guesses]
        .filter(guess => !guess.correct)
        .sort((a, b) => {
          if (a.position && !b.position) return -1;
          if (!a.position && b.position) return 1;
          if (a.position && b.position) return a.position - b.position;
          return 0;
        })
        .map((guess, index) => (
          <GuessRow key={index} guess={guess} eventSlug={eventSlug} />
        ))}
    </div>
  );
}


function GuessPodium() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [challenge, setChallenge] = useState(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [victory, setVictory] = useState(null);

  const [guesses, setGuesses] = useState(
    () => getGuesses("podium_guesses")
  );

  const [foundIds, setFoundIds] = useState(
    () => getGuesses("podium_guesses").map(g => g.id)
  );

  const [done, setDone] = useState(
    () => getDone("podium_done")
  );

  const [podium, setPodium] = useState(() => {
    const saved = getGuesses("podium_guesses") ?? [];

    return {
      1: saved.find(g => g.position === 1) ?? null,
      2: saved.find(g => g.position === 2) ?? null,
      3: saved.find(g => g.position === 3) ?? null,
    };
  });

  const [hints, setHints] = useState(
    () => getLatestHint("podium") ?? {}
  );

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // CHALLENGE
  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(data => setChallenge(data));
  }, []);

  // SEARCH
  useEffect(() => {
    if (done) {
      setResults([]);
      return;
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const excludeIds = foundIds.join(',');

    fetch(
      `${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}&exclude_ids=${excludeIds}&active_only=false`,
      {
        signal: controller.signal
      }
    )
      .then(r => r.json())
      .then(data => setResults(data))
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      });

    return () => controller.abort();

  }, [query, foundIds, done]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // SYNCHRO SERVEUR
  useEffect(() => {
    refreshFromServer().then((progress) => {
      const savedGuesses = progress.podium_guesses ?? [];

      setGuesses(savedGuesses);
      setFoundIds(savedGuesses.map(g => g.id));

      setHints(
        progress.podium_latest_hint ?? {}
      );


      const newPodium = {
        1: savedGuesses.find(g => g.position === 1) ?? null,
        2: savedGuesses.find(g => g.position === 2) ?? null,
        3: savedGuesses.find(g => g.position === 3) ?? null,
      };

      setPodium(newPodium);


      const finished =
        progress.podium_done ||
        (
          newPodium[1] &&
          newPodium[2] &&
          newPodium[3]
        );


      setDone(!!finished);


      if (finished) {
        setVictory({
          name: "le podium",
        });
      }
    });

  }, []);

  const submitGuess = async (cubeur) => {
    if (done || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch(API_URLS.guessPodium, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cubeur_id: cubeur.id,
        }),
      });

      const data = await res.json();

      setQuery("");
      setResults([]);
      setSelectedIndex(-1);

      if (data.hints !== undefined) {
        setHints(data.hints);
        saveLatestHint(
          "podium",
          data.hints
        );
      }

      const newGuess = {
        id: cubeur.id,
        name: data.name,
        correct: data.correct,
        position: data.position ?? null,
        score: data.score ?? null,
        in_final: data.in_final,
      };

      const updatedGuesses = [
        newGuess,
        ...guesses,
      ];

      setGuesses(updatedGuesses);

      addGuess(
        "podium_guesses",
        newGuess
      );

      setFoundIds(prev => [
        ...prev,
        cubeur.id,
      ]);

      if (data.correct) {

        const newPodium = {
          ...podium,
          [data.position]: {
            id: cubeur.id,
            name: data.name,
            score: data.score,
            position: data.position,
          },
        };

        setPodium(newPodium);

        if (
          newPodium[1] &&
          newPodium[2] &&
          newPodium[3]
        ) {
          saveDone("podium_done");

          setDone(true);

          setVictory({
            name: "le podium",
          });

          submitScore(
            "podium",
            updatedGuesses.length - 3
          );
        }
      }

    } catch (error) {
      console.error("Erreur pendant le guess podium :", error);

    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  if (!challenge) return null;

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[1450px] flex flex-col gap-4">

        <div className="flex flex-col items-center">

          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard
                to="/ranking"
                direction="prev"
                color="bg-cubdle-yellow"
                prefix="Devine le"
                title="CLASSEMENT"
              />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard
                to="/location"
                direction="next"
                color="bg-cubdle-blue"
                prefix="Devine la"
                title="LOCALISATION"
              />
            </div>
          </div>

          <span className="font-body text-2xl text-white/60 mt-12">
            Devine le podium
          </span>

        </div>

        {/* VICTORY */}
        {victory && (

          <VictoryCard
            label="Bravo ! Tu as trouvé le podium de :"
            name={
              <>
                <div>{challenge.podium_event?.name}</div>
                <div>{challenge.podium_competition_name}</div>
              </>
            }
            guesses={guesses}
            nextTo="/location"
            shareData={challenge}
            buildShareText={buildShareTextPodium}
            link={`https://www.worldcubeassociation.org/competitions/${challenge.podium_competition_id}/results/all?event=${challenge.podium_event?.slug}`}
            onLeaderboard={() => setShowLeaderboard(true)}
          />

        )}

        {/* SEARCH */}
        {!done && (

          <div className="px-2 md:px-5 py-4 flex justify-center">

            <div
              className="w-full md:w-1/2 relative"
              ref={dropdownRef}
            >

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 pointer-events-none">
                🔍
              </span>

              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ex : Max Park..."
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();

                    setSelectedIndex(i =>
                      Math.min(i + 1, results.length - 1)
                    );

                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();

                    setSelectedIndex(i =>
                      Math.max(i - 1, -1)
                    );

                  } else if (
                    e.key === 'Enter' &&
                    selectedIndex >= 0 &&
                    !submitting
                  ) {
                    e.preventDefault();

                    submitGuess(results[selectedIndex]);
                  }
                }}

                className={`w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors ${submitting ? "opacity-50" : ""}`}
              />

              {results.length > 0 && (

                <ul role="listbox" className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-50 overflow-hidden list-none m-0 p-0 shadow-lg">

                  {results.map((c, i) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onMouseDown={() => {
                        if (!submitting) {
                          submitGuess(c);
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-black/10 last:border-b-0 transition-colors font-body text-sm
                        ${
                          i === selectedIndex
                            ? 'bg-cubdle-yellow/40'
                            : 'hover:bg-cubdle-yellow/20'
                        }
                      `}
                    >

                      <span className="font-body text-sm font-medium flex-1 text-black">
                        {c.first_name} {c.last_name}
                      </span>

                      {c.country_iso2 && (
                        <span className="font-body text-xs text-black/40">
                          {c.country_iso2}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* INFOS CHALLENGE */}
        <div className="flex items-center justify-center gap-4">

          <img
            src={`/events-icons/${challenge.podium_event?.slug}.svg`}
            alt={challenge.podium_event?.name}
            className="w-12 h-12 object-contain"
          />

          <div className="flex flex-col">

            <span className="font-title font-extrabold text-lg text-black uppercase">
              {challenge.podium_competition_name}
            </span>

            <span className="font-body text-sm text-black">
              {challenge.podium_event?.name}
            </span>

          </div>
        </div>

        {/* TABLE */}
        <div className="px-1 md:px-5">

          <PodiumTable
            podium={podium}
            guesses={guesses}
            eventSlug={challenge.podium_event?.slug}
            hints={hints}
          />

        </div>

        {/* ── BOUTONS ── */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {showLeaderboard && (
          <LeaderboardModal 
            onClose={() => setShowLeaderboard(false)}
            initialGame="podium"
          />
        )}

        {showHowToPlay && (
          <HowToPlayModal gameKey="podium" onClose={() => setShowHowToPlay(false)} />
        )}

      </div>
    </div>
  );
}


export default GuessPodium;