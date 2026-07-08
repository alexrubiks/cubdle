import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import { formatRankingScore } from '../utils';

function buildShareTextPodium(guesses, challenge) {
  return [
    '🎯 Cubdle — Devine le Podium 🥇🥈🏅',
    `${challenge.podium_competition_name} - ${challenge.podium_event?.name}`,
        '',
    `Trouvé en ${guesses.length - 3} erreur${guesses.length - 3 > 1 ? 's' : ''} !`,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}

function PodiumRow({ medal, cubeur, eventSlug, color }) {
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
        {cubeur ? cubeur.name : "???"}
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
        {guess.score
          ? formatRankingScore(guess.score, eventSlug)
          : "—"}
      </div>

    </div>
  );
}


function PodiumTable({ podium, guesses, eventSlug }) {
  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white mb-6">

      {/* HEADER */}
      <div className="grid grid-cols-3 bg-black text-white font-body font-bold text-xs uppercase">

        <div className="px-3 py-2 text-center">
          Place
        </div>

        <div className="px-3 py-2">
          Cubeur
        </div>

        <div className="px-3 py-2 text-center">
          Temps
        </div>

      </div>

      {/* PODIUM */}
      <PodiumRow medal="🥇" cubeur={podium[1]} eventSlug={eventSlug} color="bg-yellow-300/50" />
      <PodiumRow medal="🥈" cubeur={podium[2]} eventSlug={eventSlug} color="bg-gray-300/70" />
      <PodiumRow medal="🥉" cubeur={podium[3]} eventSlug={eventSlug} color="bg-orange-300/50" />

      {/* MAUVAISES REPONSES */}
      {[...guesses]
        .filter(guess => !guess.correct)
        .sort((a, b) => {
          // Ceux qui ont un classement passent avant
          if (a.position && !b.position) return -1;
          if (!a.position && b.position) return 1;

          // Si les deux ont un classement, tri croissant
          if (a.position && b.position) {
            return a.position - b.position;
          }

          // Les deux sans classement restent à la fin
          return 0;
        })
        .map((guess, index) => (
          <GuessRow
            key={index}
            guess={guess}
            eventSlug={eventSlug}
          />
        ))}

    </div>
  );
}


function GuessPodium() {
  const [challenge, setChallenge] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [podium, setPodium] = useState({
    1: null,
    2: null,
    3: null,
  });
  const [guesses, setGuesses] = useState([]);
  const [foundIds, setFoundIds] = useState([]);
  const [done, setDone] = useState(false);
  const [victory, setVictory] = useState(null);
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
    if (query.length < 2) {
      setResults([]);
      return;
    }

    fetch(`${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data =>
        setResults(
          data.filter(c => !foundIds.includes(c.id))
        )
      );

  }, [query, foundIds]);

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

  const submitGuess = async (cubeur) => {
    const res = await fetch(API_URLS.guessPodium, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cubeur_id: cubeur.id,
      }),

    });

    const data = await res.json();

    setQuery('');
    setResults([]);
    setSelectedIndex(-1);

    setGuesses(prev => [
      {
        name: data.name,
        correct: data.correct,
        position: data.position ?? null,
        score: data.score ?? null,
        in_final: data.in_final,
      },
      ...prev,
    ]);

    setFoundIds(prev => [
      ...prev,
      cubeur.id,
    ]);

    if (data.correct) {

      setPodium(prev => {

        const updated = {
          ...prev,
          [data.position]: {
            name: data.name,
            score: data.score,
          },
        };

        if (
          updated[1] &&
          updated[2] &&
          updated[3]
        ) {
          setDone(true);

          setVictory({
            name: "le podium",
          });
        }

        return updated;

      });
    }

    inputRef.current?.focus();
  };

  if (!challenge) return null;

  return (

    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5">

      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* HEADER */}
        <div className="flex flex-col items-center pt-8">

          <Link
            to="/"
            className="flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95"
          >
            <CubdleLogo size="lg" />
          </Link>

          <span className="font-body text-2xl text-white/60 mt-1">
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
          />

        )}

        {/* SEARCH */}
        {!done && (

          <div className="px-5 py-4 flex justify-center">

            <div
              className="w-1/2 relative"
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

                  } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();

                    submitGuess(results[selectedIndex]);
                  }
                }}

                className=" w-full pl-9 pr-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow" />

              {results.length > 0 && (

                <ul role="listbox" className=" absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-black rounded-xl z-30 overflow-hidden list-none m-0 p-0 shadow-lg">

                  {results.map((c, i) => (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onMouseDown={() => submitGuess(c)}
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
        <div className="px-5">

          <PodiumTable
            podium={podium}
            guesses={guesses}
            eventSlug={challenge.podium_event?.slug}
          />

        </div>
      </div>
    </div>
  );
}


export default GuessPodium;