import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS } from '../utils';
import WordleGrid from '../components/ui/WordleGrid';
import { cubeurColumns } from '../components/games/cubeurColumns';
import VictoryCard from '../components/ui/VictoryCard';
import CubdleLogo from '../components/ui/CubdleLogo';
import { buildShareTextCubeur } from '../components/games/cubeurColumns';
import GameNavCard from '../components/ui/GameNavCard';
import { addGuess, saveDone, getGuesses, getDone } from '../utils/localProgress';


function YesterdayCubeur() {
  const [name, setName] = useState(undefined); // undefined = pas encore chargé

  useEffect(() => {
    fetch(API_URLS.yesterday)
      .then(r => r.json())
      .then(data => setName(data.cubeur));
  }, []);

  if (name === undefined) return null; // chargement
  if (!name) return null;              // pas de données

  return (
    <div className="flex flex-col items-center gap-1 h-[160px]">
      <span className="font-body font-bold text-xs text-black uppercase tracking-wide">
        Le cubeur d'hier était
      </span>
      <span className="font-title font-extrabold text-lg text-cubdle-green">
        {name}
      </span>
    </div>
  );
}


function GuessCubeur() {
  const [query,          setQuery]   = useState('');
  const [results,        setResults] = useState([]);
  const [guesses,        setGuesses] = useState(getGuesses("cubeur_guesses"));
  const [done,           setDone]    = useState(getDone("cubeur_done"));
  const [selectedIndex,  setSelectedIndex] = useState(-1);
  const [victory,        setVictory] = useState(() => {
    const previousVictory = getGuesses("cubeur_guesses")
      .find(g => g.correct);

    if (!previousVictory) return null;

    return {
      name: previousVictory.name,
      photoUrl: previousVictory.photoUrl ?? null,
    };
  });
  
  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (done) {
      setResults([]);
      return;
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    fetch(`${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data =>
        setResults(
          data.filter(c => !guesses.find(g => g.id === c.id))
        )
      );

  }, [query, guesses, done]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) setResults([]);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitGuess = async (cubeur) => {
    setQuery('');
    setResults([]);

    if (done) return;

    const res = await fetch(API_URLS.guessCubeur, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeur_id: cubeur.id }),
    });

    const data = await res.json();
    const newGuess = { id: cubeur.id, name: data.guessed_name, comparison: data.comparison };
    const updated = [newGuess, ...guesses];

    setGuesses(updated);

    if (data.correct) {
      saveDone("cubeur_done");
      setDone(true);
      setVictory({
        name: data.guessed_name,
        photoUrl: data.photo_url ?? null,
      });
    }

    addGuess(
      "cubeur_guesses",
      {
        id: cubeur.id,
        name: data.guessed_name,
        comparison: data.comparison,
        correct: data.correct,
      }
    );

    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[1450px] flex flex-col gap-4">

        <div className="flex flex-col items-center">

          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard
                to="/location"
                direction="prev"
                color="bg-cubdle-blue"
                prefix="Devine la"
                title="LOCALISATION"
              />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard
                to="/competition"
                direction="next"
                color="bg-cubdle-orange"
                prefix="Devine la"
                title="COMPETITION"
              />
            </div>
          </div>

          <span className="font-body text-2xl text-white/60 mt-8">Devine le cubeur</span>
        </div>

        {/* ── VICTORY ── */}
        {victory && (
          <VictoryCard
            label="Bravo ! Le cubeur à deviner était :"
            name={victory.name}
            guesses={guesses}
            nextTo="/competition"
            buildShareText={buildShareTextCubeur}
          />
        )}

        {/* ── INPUT ── */}
        {!done && (
          <div className="px-2 md:px-5 py-4 flex justify-center">
            <div className="w-full md:w-1/2 relative" ref={dropdownRef}>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 pointer-events-none">
                🔍
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ex : Jonathan Dammann…"
                autoComplete="off"
                spellCheck={false}
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
                className="w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors"
              />

              {results.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-30 overflow-hidden list-none m-0 p-0 shadow-lg"
                >
                  {results.map((c, i) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onMouseDown={() => submitGuess(c)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-black/10 last:border-b-0 transition-colors
                        ${i === selectedIndex ? 'bg-cubdle-yellow/40' : 'hover:bg-cubdle-yellow/20'}`}
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

        {/* ── GRILLE ── */}
        {guesses.length > 0 && (
          <div className="px-1 md:px-5">
            <WordleGrid columns={cubeurColumns} guesses={guesses} />
          </div>
        )}

        {/* ── CUBEUR D'HIER ── */}
        <YesterdayCubeur />
      </div>
    </div>
  );
}

export default GuessCubeur;