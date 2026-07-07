import { useEffect, useRef, useState } from 'react';
import { API_URLS } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';


function PodiumRow({ medal, cubeur }) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-black/10 font-body text-sm">

      <div className="px-3 py-3 text-center text-xl">
        {medal}
      </div>

      <div className="px-3 py-3 font-bold">
        {cubeur ? cubeur.name : "???"}
      </div>

      <div className="px-3 py-3 text-center font-bold">
        {cubeur ? cubeur.score : "??"}
      </div>

    </div>
  );
}


function GuessRow({ guess }) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-black/10 font-body text-sm bg-cubdle-red/75">

      <div className="px-3 py-2 text-center font-bold">
        ❌
      </div>

      <div className="px-3 py-2 font-bold">
        {guess.name}
      </div>

      <div className="px-3 py-2 text-center">
        {guess.in_final
          ? `Finale : ${guess.position}e`
          : "Pas en finale"}
      </div>

    </div>
  );
}


function PodiumTable({ podium, guesses }) {
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
      <PodiumRow medal="🥇" cubeur={podium[1]} />
      <PodiumRow medal="🥈" cubeur={podium[2]} />
      <PodiumRow medal="🥉" cubeur={podium[3]} />

      {/* MAUVAISES REPONSES */}
      {guesses.map((guess, index) => (
        <GuessRow
          key={index}
          guess={guess}
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

    if (data.correct) {

      setPodium(prev => ({
        ...prev,

        [data.position]: {
          name: data.name,
          score: data.score,
        },

      }));

      setFoundIds(prev => [
        ...prev,
        cubeur.id,
      ]);

      const newPodium = {
        ...podium,
        [data.position]: {
          name: data.name,
          score: data.score,
        },
      };

      if (
        newPodium[1] &&
        newPodium[2] &&
        newPodium[3]
      ) {

        setDone(true);

        setVictory({
          name: "le podium",
        });

      }
    } else {

      setGuesses(prev => [
        {
          name: data.name,
          in_final: data.in_final,
          position: data.position ?? null,
        },
        ...prev,
      ]);
    }

    inputRef.current?.focus();
  };

  if (!challenge) return null;

  return (

    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5">

      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* HEADER */}
        <div className="flex flex-col items-center pt-8">

          <div className="flex items-center justify-center py-2">
            <CubdleLogo size="lg" />
          </div>

          <span className="font-body text-2xl text-white/60 mt-1">
            Devine le podium
          </span>

        </div>

        {/* VICTORY */}
        {victory && (

          <VictoryCard
            label="Bravo ! Tu as trouvé le podium de :"
            name={`${challenge.podium_competition?.name}`}
            guesses={guesses}
          />

        )}

        {/* SEARCH */}
        {!done && (

          <div className="px-5 py-4 flex justify-center">

            <div
              className="w-1/2 relative"
              ref={dropdownRef}
            >

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">
                🔍
              </span>

              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ex : Max Park..."
                autoComplete="off"
                spellCheck={false}
                className="
                  w-full
                  pl-9
                  pr-4
                  py-3
                  bg-white
                  border-2
                  border-black
                  rounded-xl
                  font-body
                  text-sm
                  text-black
                  placeholder:text-black/30
                  outline-none
                  focus:border-cubdle-yellow
                "
              />

              {results.length > 0 && (

                <ul className="
                  absolute
                  top-[calc(100%+4px)]
                  left-0
                  right-0
                  bg-white
                  border-2
                  border-black
                  rounded-xl
                  z-30
                  overflow-hidden
                  list-none
                  m-0
                  p-0
                  shadow-lg
                ">

                  {results.map(c => (

                    <li
                      key={c.id}
                      onMouseDown={() => submitGuess(c)}
                      className="
                        px-4
                        py-2
                        cursor-pointer
                        hover:bg-cubdle-yellow/20
                        font-body
                        text-sm
                        border-b
                        border-black/10
                      "
                    >

                      {c.first_name} {c.last_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* INFOS CHALLENGE */}
        <div className="flex items-center justify-center gap-4">

          <div className="flex flex-col items-center">

            <span className="font-title font-extrabold text-lg text-black">
              {challenge.podium_competition?.name}
            </span>

            <span className="font-body text-sm text-black/60">
              {challenge.podium_event?.name}
            </span>

          </div>
        </div>

        {/* TABLE */}
        <div className="px-5">

          <PodiumTable
            podium={podium}
            guesses={guesses}
          />

        </div>
      </div>
    </div>
  );
}


export default GuessPodium;