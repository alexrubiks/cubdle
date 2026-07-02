import { useState, useEffect, useRef } from 'react';
import { API_URLS } from '../utils';
import WordleGrid from '../components/ui/WordleGrid';
import { cubeurColumns } from '../components/games/cubeurColumns';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function GuessCubeur() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [done,    setDone]    = useState(false);
  const [banner,  setBanner]  = useState(null);

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    fetch(`${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}`)
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

  const submitGuess = async (cubeur) => {
    setQuery('');
    setResults([]);

    const res = await fetch(API_URLS.guessCubeur, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeur_id: cubeur.id }),
    });

    const data = await res.json();
    const newGuess = { id: cubeur.id, name: data.guessed_name, comparison: data.comparison };

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
    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5">
      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* ── HEADER ── */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <h1 className="font-title font-extrabold text-4xl text-white">Cubdle</h1>
          <span className="font-body text-sm text-white/60 mt-1">Devine le cubeur</span>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 pointer-events-none">
                🔍
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tape un prénom ou un nom…"
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors"
              />

              {results.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-30 overflow-hidden list-none m-0 p-0 shadow-lg"
                >
                  {results.map(c => (
                    <li
                      key={c.id}
                      role="option"
                      onMouseDown={() => submitGuess(c)}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-black/10 last:border-b-0 hover:bg-cubdle-yellow/20 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center font-title font-bold text-[10px] text-black/40 shrink-0">
                        {initials(`${c.first_name} ${c.last_name}`)}
                      </span>
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
          <div className="px-5">
            <WordleGrid columns={cubeurColumns} guesses={guesses} />
          </div>
        )}

        {/* ── ÉTAT VIDE ── */}
        {guesses.length === 0 && !done && (
          <div className="flex-1 flex items-center justify-center font-body text-sm text-white/40">
            Cherche un cubeur pour commencer !
          </div>
        )}
      </div>
    </div>
  );
}

export default GuessCubeur;