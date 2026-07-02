import { useState, useEffect, useRef } from 'react';
import { API_URLS } from '../utils';
import WordleGrid from '../components/ui/WordleGrid';
import { competColumns } from '../components/games/competColumns';

export default function GuessCompet() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [done,    setDone]    = useState(false);
  const [banner,  setBanner]  = useState(null);

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    fetch(`${API_URLS.competitions}search/?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => setResults(data.filter(c => !guesses.find(g => g.id === c.id))));
  }, [query, guesses]);

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
        setBanner({ type: 'won', text: `🎉 Bravo ! C'était ${data.guessed_name}.` });
      } else if (updated.length >= 20) {
        setDone(true);
        setBanner({ type: 'lost', text: `Perdu… Réessaie demain.` });
      }
      return updated;
    });

    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-cubdle-background flex flex-col">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 bg-cubdle-background flex items-center gap-4 px-5 py-4 border-b-2 border-black">
        <h2 className="font-title font-extrabold text-xl text-white">
          Devine la <span className="text-cubdle-orange">Compétition</span>
        </h2>
        <span className="ml-auto font-body text-sm text-white/60 tabular-nums">
          {guesses.length} / 20
        </span>
      </div>

      {/* ── BANNER ── */}
      {banner && (
        <div className={`mx-5 mt-3 px-4 py-3 rounded-xl border-2 border-black font-body font-medium text-sm
          ${banner.type === 'won'
            ? 'bg-cubdle-green text-black'
            : 'bg-cubdle-red text-white'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* ── INPUT ── */}
      {!done && (
        <div className="px-5 py-4">
          <div className="relative" ref={dropdownRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
              🔍
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tape un nom de compétition…"
              className="w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors"
              autoComplete="off"
              spellCheck={false}
            />

            {results.length > 0 && (
              <ul className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-30 overflow-hidden shadow-lg list-none m-0 p-0">
                {results.map(c => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-black/10 last:border-b-0 hover:bg-cubdle-yellow/20 transition-colors"
                    onMouseDown={() => submitGuess(c)}
                  >
                    <span className="font-body text-sm font-medium flex-1">{c.name}</span>
                    {c.year && (
                      <span className="font-body text-xs text-black/40">{c.year}</span>
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

      {/* ── ÉTAT VIDE ── */}
      {guesses.length === 0 && !done && (
        <div className="flex-1 flex items-center justify-center font-body text-sm text-white/40">
          Cherche une compétition pour commencer !
        </div>
      )}

    </div>
  );
}