import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS } from '../utils';
import WordleGrid from '../components/ui/WordleGrid';
import { competColumns } from '../components/games/competColumns';
import VictoryCard from '../components/ui/VictoryCard';
import CubdleLogo from '../components/ui/CubdleLogo';
import { buildShareTextCompet } from '../components/games/competColumns';

function YesterdayCompet() {
  const [name, setName] = useState(undefined);

  useEffect(() => {
    fetch(API_URLS.yesterday)
      .then(r => r.json())
      .then(data => setName(data.competition));
  }, []);

  if (name === undefined) return null;
  if (!name) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-body font-bold text-xs text-black uppercase tracking-wide">
        La compétition d'hier était
      </span>
      <span className="font-title font-extrabold text-lg text-cubdle-green">
        {name}
      </span>
    </div>
  );
}

export default function GuessCompet() {
  const [query,         setQuery]         = useState('');
  const [results,       setResults]       = useState([]);
  const [guesses,       setGuesses]       = useState([]);
  const [done,          setDone]          = useState(false);
  const [victory,       setVictory]       = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
      fetch(`${API_URLS.competitions}search/?q=${encodeURIComponent(query)}&exclude_count=${guesses.length}`)
        .then(r => r.json())
        .then(data => setResults(data.filter(c => !guesses.find(g => g.id === c.id)).slice(0, 10)));
    }, [query, guesses]);

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

  const submitGuess = async (compet) => {
    setQuery('');
    setResults([]);

    const res  = await fetch(API_URLS.guessCompet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition_id: compet.id }),
    });
    const data = await res.json();

    const newGuess = { id: compet.id, name: data.guessed_name, comparison: data.comparison };

    setGuesses(prev => {
      const updated = [newGuess, ...prev];
      if (data.correct) {
        setDone(true);
        setVictory({ name: data.guessed_name });
      }
      return updated;
    });

    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5">
      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* ── HEADER ── */}
        <div className="flex flex-col items-center pt-8">
          <Link
            to="/"
            className="flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95"
          >
            <CubdleLogo size="lg" />
          </Link>
          <span className="font-body text-2xl text-white/60 mt-1">Devine la compétition</span>
        </div>

        {/* ── VICTORY ── */}
        {victory && (
          <VictoryCard
            label="Bravo ! La compétition à deviner était :"
            name={victory.name}
            guesses={guesses}
            nextTo="/ranking"
            buildShareText={buildShareTextCompet}
          />
        )}

        {/* ── INPUT ── */}
        {!done && (
          <div className="px-5 py-4 flex justify-center">
            <div className="w-1/2 relative" ref={dropdownRef}>
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
          <div className="px-5">
            <WordleGrid columns={competColumns} guesses={guesses} />
          </div>
        )}

        {/* ── COMPÉT D'HIER ── */}
        <YesterdayCompet />

      </div>
    </div>
  );
}