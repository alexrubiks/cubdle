import { useArchiveDate } from '../utils/archiveContext';
import { useState, useEffect, useRef } from 'react';
import SkipHint from '../components/ui/SkipHint';
import { skippedTotal, HINT_INTERVAL as SKIP_INTERVAL } from '../utils/skips';
import { isLaunched } from '../utils/dates';
import { Link } from 'react-router-dom';
import { API_URLS } from '../utils';
import WordleGrid from '../components/ui/WordleGrid';
import { competColumns } from '../components/games/competColumns';
import VictoryCard from '../components/ui/VictoryCard';
import CubdleLogo from '../components/ui/CubdleLogo';
import { buildShareTextCompet } from '../components/games/competColumns';
import GameNavCard from '../components/ui/GameNavCard';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import { addGuess, saveDone, getGuesses, getDone, saveLatestHint, getLatestHint, getSkips, submitScore, refreshFromServer, withDate } from '../utils/localProgress';


function YesterdayCompet() {
  const [name, setName] = useState(undefined); // undefined = pas encore chargé

  useEffect(() => {
    fetch(withDate(API_URLS.yesterday))
      .then(r => r.json())
      .then(data => setName(data.competition));
  }, []);

  if (name === undefined) return null; // chargement
  if (!name) return null;              // pas de données

  return (
    <div className="flex flex-col items-center gap-1 min-h-[3.75rem]">
      <span className="font-body font-bold text-xs md:text-sm text-black uppercase tracking-wide">
        La compétition d'hier était
      </span>
      <span className="font-title font-extrabold text-lg md:text-xl text-cubdle-green">
        {name}
      </span>
    </div>
  );
}


function GuessCompet() {
  const archiveDate = useArchiveDate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const [guesses, setGuesses] = useState(() => getGuesses("compet_guesses"));
  const [done, setDone] = useState(() => getDone("compet_done"));
  const [submitting, setSubmitting] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [victory, setVictory] = useState(null);

  const [latestHint, setLatestHint] = useState(() => getLatestHint("compet"));
  const [revealedHint, setRevealedHint] = useState(null);
  // « Passer à l'indice » : erreurs ajoutées volontairement (comptent dans le score)
  const [skips, setSkips] = useState(() => getSkips("compet"));
  const skipped = skippedTotal(skips);
  const [revealedTiers, setRevealedTiers] = useState(0);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const HINT_INTERVAL = 5;
  const unlockedTiers = Math.floor((guesses.length + skipped) / HINT_INTERVAL);
  const hintAvailable = unlockedTiers > revealedTiers;


  // SYNCHRO SERVEUR
  useEffect(() => {
    refreshFromServer().then((progress) => {
      setGuesses(progress.compet_guesses);
      setDone(progress.compet_done);
      setLatestHint(progress.compet_latest_hint ?? null);
      setSkips(progress.skips?.compet ?? []);

      const previousVictory = progress.compet_guesses.find(
        g => g.correct
      );

      if (!previousVictory) return;

      fetch(API_URLS.competitionDetail(previousVictory.id))
        .then(r => r.json())
        .then(data => {
          setVictory({
            name: data.name,
            wca_id: data.wca_id,
          });
        });
    });
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

    const excludeIds = guesses
      .map(g => g.id)
      .join(',');

    fetch(
      `${API_URLS.competitions}search/?q=${encodeURIComponent(query)}&exclude_ids=${excludeIds}`,
      {
        signal: controller.signal
      }
    )
      .then(r => r.json())
      .then(data => setResults(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });

    return () => controller.abort();

  }, [query, guesses, done]);

  // RESET SELECTION
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // CLICK OUTSIDE
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setResults([]);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

  }, []);

  const submitGuess = async (compet) => {
    if (done || submitting) return;

    setSubmitting(true);

    setQuery('');
    setResults([]);

    try {
      const res = await fetch(withDate(API_URLS.guessCompet), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          competition_id: compet.id,
          // essais déjà faits (éventuellement sur un autre appareil) : compteur d'indices juste
          previous_ids: guesses.map((g) => g.id),
          skipped,
        }),
      });

      const data = await res.json();

      if (data.hint !== undefined) {
        setLatestHint(data.hint);
        saveLatestHint(
          "compet",
          data.hint
        );
      }

      const newGuess = {
        id: compet.id,
        name: data.guessed_name,
        comparison: data.comparison,
        correct: data.correct,
      };

      const updated = [
        newGuess,
        ...guesses
      ];

      setGuesses(updated);

      addGuess(
        "compet_guesses",
        newGuess
      );

      if (data.correct) {
        saveDone("compet_done");
        setDone(true);

        setVictory({
          name: data.guessed_name,
          wca_id: compet.wca_id,
        });

        submitScore("compet", updated.length + skipped);
      }

    } catch (error) {
      console.error("Erreur pendant le guess compétition :", error);

    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  // « Passer à l'indice » : l'indice arrive directement révélé
  const onSkipHint = (data, newSkips) => {
    setSkips(newSkips);
    setLatestHint(data.hint);
    saveLatestHint("compet", data.hint);
    setRevealedHint(data.hint);
    setRevealedTiers(Math.floor((guesses.length + skippedTotal(newSkips)) / SKIP_INTERVAL));
  };
  const canSkip = isLaunched() && !done && !hintAvailable;

  const revealHint = () => {
    if (!hintAvailable) return;

    setRevealedHint(latestHint);
    setRevealedTiers(unlockedTiers);
  };

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[90.625rem] flex flex-col gap-4">

        <div className="flex flex-col items-center">

          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard
                to="/cubeur"
                direction="prev"
                color="bg-cubdle-red"
                prefix="Devine le"
                title="CUBEUR"
              />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] max-[360px]:text-[3.3em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard
                to="/ranking"
                direction="next"
                color="bg-cubdle-yellow"
                prefix="Devine le"
                title="CLASSEMENT"
              />
            </div>
          </div>

          <span className="font-body text-2xl max-[360px]:text-xl text-white/80 mt-12">Devine la compétition</span>
        </div>

        {/* ── VICTORY ── */}
        {victory && (
          <VictoryCard
            label="Bravo ! La compétition à deviner était :"
            name={victory.name}
            guesses={guesses}
            nextTo="/ranking"
            buildShareText={buildShareTextCompet}
            link={`https://www.worldcubeassociation.org/competitions/${victory.wca_id}`}
            onLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {/* ── INPUT ── */}
        {!done && (
          <div className="px-2 md:px-5 py-4 flex flex-col items-center gap-2">

            {revealedHint && (
              <div className="w-full md:w-1/2 text-center">
                <span className="font-body text-sm text-white/70">
                  Indice : <span className="font-bold text-cubdle-yellow">{revealedHint}...</span>
                </span>
              </div>
            )}

            <div className="w-full md:w-1/2 relative" ref={dropdownRef}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 pointer-events-none">
                  🔍
                </span>

                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ex : Chevry Miel 2025…"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex(i => Math.max(i - 1, -1));
                    } else if (e.key === 'Enter' && selectedIndex >= 0) {
                      e.preventDefault();
                      submitGuess(results[selectedIndex]);
                    }
                  }}
                  className={`${submitting ? "opacity-50" : ""} w-full pl-9 ${
                    hintAvailable || canSkip ? "pr-12" : "pr-4"
                  } py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors`}
                />

                {hintAvailable && (
                  <button
                    type="button"
                    onClick={revealHint}
                    title="Révéler un indice"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-cubdle-yellow transition-all hover:scale-110 cursor-pointer"
                  >
                    💡
                  </button>
                )}

                {canSkip && (
                  <SkipHint
                    game="compet"
                    errors={guesses.length + skipped}
                    guessCount={guesses.length}
                    previousIds={guesses.map((g) => g.id)}
                    onHint={onSkipHint}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  />
                )}
              </div>

              {results.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-50 overflow-hidden list-none m-0 p-0 shadow-lg"
                >
                  {results.map((c, i) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onMouseDown={() => !submitting && submitGuess(c)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-black/10 last:border-b-0 transition-colors
                        ${i === selectedIndex ? 'bg-cubdle-yellow/40' : 'hover:bg-cubdle-yellow/20'}`}
                    >
                      <span className="font-body text-sm font-medium flex-1 text-black">
                        {c.name}
                      </span>

                      {c.year && (
                        <span className="font-body text-xs text-black/40">
                          {c.year}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── GRILLE ── */}
        {guesses.length > 0 && (
          <div className="px-1 md:px-5">
            <WordleGrid columns={competColumns} guesses={guesses} />
          </div>
        )}

        {/* ── COMPÉT D'HIER ── */}
        {/* Pas en archive : la réponse de la veille pourrait être un autre défi encore à jouer */}
        {!archiveDate && <YesterdayCompet />}

        {/* ── BOUTONS ── */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {showLeaderboard && (
          <LeaderboardModal 
            onClose={() => setShowLeaderboard(false)}
            initialGame="compet"
          />
        )}

        {showHowToPlay && (
          <HowToPlayModal gameKey="compet" onClose={() => setShowHowToPlay(false)} />
        )}
      </div>
    </div>
  );
}

export default GuessCompet;