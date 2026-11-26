import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS, formatRecordValue } from '../utils';
import { formatDateFr } from '../utils/dates';
import VictoryCard from '../components/ui/VictoryCard';
import CubdleLogo from '../components/ui/CubdleLogo';
import GameNavCard from '../components/ui/GameNavCard';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import {
  addGuess, saveDone, getGuesses, getDone, saveLatestHint, getLatestHint,
  submitScore, refreshFromServer, withDate,
} from '../utils/localProgress';

/*
 * Devine le NR : on donne l'épreuve, la valeur, le type (single/moyenne) et la date
 * d'un record de France (actuel ou ancien) ; il faut trouver qui l'a établi.
 * Une lettre du nom est révélée toutes les 5 erreurs.
 */

function buildShareTextNR(guesses, { nr }) {
  // guesses est trié du plus récent au plus ancien
  const squares = [...guesses].reverse().map((g) => (g.correct ? '🟩' : '🟥')).join('');
  return [
    '🏅 Cubdle — Devine le NR',
    `${nr.event_name} ${nr.record_type === 'average' ? 'moyenne' : 'single'} — ${formatRecordValue(nr.value, nr.event_id, nr.record_type)}`,
    '',
    `Trouvé en ${guesses.length} essai${guesses.length > 1 ? 's' : ''}`,
    squares,
    '',
    'https://cubdle.fr',
  ].join('\n');
}

function RecordInfos({ nr }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <img
        src={`/events-icons/${nr.event_id}.svg`}
        alt={nr.event_name}
        className="w-12 h-12 object-contain"
      />
      <div className="flex flex-col">
        <span className="font-title font-extrabold text-lg text-black uppercase">
          {formatRecordValue(nr.value, nr.event_id, nr.record_type)}
        </span>
        <span className="font-body text-sm text-black">
          {nr.event_name} · {nr.record_type === 'average' ? 'moyenne' : 'single'} ·{' '}
          {formatDateFr(nr.date, { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

/**
 * Même construction que le tableau du Podium : la ligne de la réponse en haut
 * (??? puis l'indice, verte une fois trouvée), puis les mauvais essais en rouge.
 */
function NRTable({ guesses, hint }) {
  const victory = guesses.find((g) => g.correct);
  const wrong = [...guesses].filter((g) => !g.correct).reverse(); // ordre chronologique

  const row = 'grid grid-cols-[3rem_1fr_3rem] items-center border-b border-black/10 font-body';

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white mb-6">
      <div className="grid grid-cols-[3rem_1fr_3rem] bg-black text-white font-body font-bold text-xs uppercase">
        <div />
        <div className="px-3 py-2 text-center">Cubeur</div>
        <div />
      </div>

      <div className={`${row} ${victory ? 'bg-cubdle-green/50' : ''}`}>
        <div className="py-3 text-center text-xl">🏅</div>
        <div className="px-3 py-3 text-center font-bold text-base md:text-lg">
          {victory ? victory.name : hint ? `${hint}...` : '???'}
        </div>
        <div />
      </div>

      {wrong.map((guess) => (
        <div key={guess.wca_id} className={`${row} bg-cubdle-red/75`}>
          <div className="py-2 text-center">❌</div>
          <div className="px-3 py-2 text-center font-bold text-base md:text-lg">{guess.name}</div>
          <div />
        </div>
      ))}
    </div>
  );
}

export default function GuessNR() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [nr, setNr] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [guesses, setGuesses] = useState(() => getGuesses('nr_guesses'));
  const [done, setDone] = useState(() => getDone('nr_done'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [latestHint, setLatestHint] = useState(() => getLatestHint('nr'));

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const victory = guesses.find((g) => g.correct);

  // SYNCHRO SERVEUR
  useEffect(() => {
    refreshFromServer().then((progress) => {
      setGuesses(progress.nr_guesses ?? []);
      setDone(progress.nr_done ?? false);
      setLatestHint(progress.nr_latest_hint ?? null);
    });
  }, []);

  // CHALLENGE
  useEffect(() => {
    fetch(withDate(API_URLS.daily))
      .then((r) => r.json())
      .then((data) => setNr(data.nr ?? null));
  }, []);

  // SEARCH
  useEffect(() => {
    if (done || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const exclude = guesses.map((g) => g.wca_id).join(',');

    fetch(`${API_URLS.nrSearch}?q=${encodeURIComponent(query)}&exclude_ids=${exclude}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setResults(data))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitGuess = async (person) => {
    if (done || submitting) return;

    setSubmitting(true);
    setError(null);
    setQuery('');
    setResults([]);

    try {
      const res = await fetch(withDate(API_URLS.guessNr), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wca_id: person.wca_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }

      const newGuess = {
        wca_id: data.wca_id,
        name: data.guessed_name,
        correct: data.correct,
        ...(data.correct ? { answer: data.answer } : {}),
      };

      const updated = [newGuess, ...guesses];
      setGuesses(updated);
      addGuess('nr_guesses', newGuess);

      if (data.hint) {
        setLatestHint(data.hint);
        saveLatestHint('nr', data.hint);
      }

      if (data.correct) {
        saveDone('nr_done');
        setDone(true);
        submitScore('nr', updated.length);
      }

      inputRef.current?.focus();
    } catch (err) {
      console.error('Erreur pendant le guess NR :', err);
      setError('Impossible de joindre le serveur, réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[1450px] flex flex-col gap-4">

        <div className="flex flex-col items-center">
          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard to="/podium" direction="prev" color="bg-cubdle-green" prefix="Devine le" title="PODIUM" />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard to="/location" direction="next" color="bg-cubdle-purple" prefix="Devine la" title="LOCALISATION" />
            </div>
          </div>

          <span className="font-body text-2xl text-white/60 mt-12">Devine le NR</span>
        </div>

        {/* ── VICTOIRE ── */}
        {victory && nr && (
          <VictoryCard
            label="Bravo ! Ce record de France est celui de :"
            name={victory.name}
            guesses={guesses}
            nextTo="/location"
            shareData={{ nr }}
            buildShareText={buildShareTextNR}
            link={`https://www.worldcubeassociation.org/persons/${victory.wca_id}`}
            onLeaderboard={() => setShowLeaderboard(true)}
            stats={
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-title font-extrabold text-3xl md:text-4xl text-cubdle-background">
                  {guesses.length} essai{guesses.length > 1 ? 's' : ''}
                </span>
                {victory.answer?.competition_name && (
                  <span className="font-body text-sm text-black/60">
                    à {victory.answer.competition_name}
                  </span>
                )}
              </div>
            }
          />
        )}

        {/* ── INPUT ── */}
        {nr && !done && (
          <div className="px-2 md:px-5 py-4 flex flex-col items-center gap-2">
            <div className="w-full md:w-1/2 relative" ref={dropdownRef}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 pointer-events-none">🔍</span>

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Qui a établi ce record ?"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex((i) => Math.max(i - 1, -1));
                    } else if (e.key === 'Enter' && selectedIndex >= 0) {
                      e.preventDefault();
                      submitGuess(results[selectedIndex]);
                    }
                  }}
                  className={`${submitting ? 'opacity-50' : ''} w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors`}
                />

              </div>

              {results.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-50 overflow-hidden list-none m-0 p-0 shadow-lg"
                >
                  {results.map((p, i) => (
                    <li
                      key={p.wca_id}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onMouseDown={() => !submitting && submitGuess(p)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-black/10 last:border-b-0 transition-colors
                        ${i === selectedIndex ? 'bg-cubdle-yellow/40' : 'hover:bg-cubdle-yellow/20'}`}
                    >
                      <span className="font-body text-sm font-medium flex-1 text-black">{p.name}</span>
                      <span className="font-body text-xs text-black/40">{p.wca_id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <span className="font-body text-sm text-cubdle-red">{error}</span>}
          </div>
        )}

        {/* ── INFOS DU RECORD ── */}
        {nr && <RecordInfos nr={nr} />}
        {nr === null && (
          <p className="text-center font-body text-white/70">Pas de NR à deviner pour cette date.</p>
        )}

        {/* ── TABLEAU ── */}
        {nr && (
          <div className="px-1 md:px-5">
            <NRTable guesses={guesses} hint={latestHint} />
          </div>
        )}

        {/* ── BOUTONS ── */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} initialGame="nr" />}
        {showHowToPlay && <HowToPlayModal gameKey="nr" onClose={() => setShowHowToPlay(false)} />}
      </div>
    </div>
  );
}
