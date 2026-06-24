import { useState, useEffect } from 'react';
import { API_URLS } from '../../utils';

const EVENTS_SINGLE = new Set(['333bf', '444bf', '555bf', '333mbf']);

const EVENTS_ORDER = [
  '333','222','444','555','666','777',
  '333bf','333fm','333oh','clock','minx',
  'pyram','skewb','sq1','444bf','555bf','333mbf'
];

/* =========================
   LOGIQUE COULEURS UNIQUE
========================= */
function compareValues(userValue, targetValue, isYear = false) {
  console.log("---- compareValues ----");
  console.log("userValue:", userValue, typeof userValue);
  console.log("targetValue:", targetValue, typeof targetValue);
  console.log("isYear:", isYear);

  const emptyUser = userValue === null || userValue === undefined || userValue === '';
  const emptyTarget = targetValue === null || targetValue === undefined || targetValue === '';

  console.log("emptyUser:", emptyUser, "emptyTarget:", emptyTarget);

  // rouge : un vide et pas l'autre
  if (emptyUser !== emptyTarget) {
    console.log("RESULT: rubik-no (empty mismatch)");
    return 'rubik-no';
  }

  // vert : identique
  if (userValue === targetValue) {
    console.log("RESULT: rubik-ok (strict equal)");
    return 'rubik-ok';
  }

  const u = Number(userValue);
  const t = Number(targetValue);

  console.log("converted u:", u, "converted t:", t);

  if (Number.isNaN(u) || Number.isNaN(t)) {
    console.log("RESULT: rubik-no (NaN detected)");
    return 'rubik-no';
  }

  const diff = Math.abs(u - t);
  const threshold = isYear ? 1 : 5;

  console.log("diff:", diff, "threshold:", threshold);

  if (diff <= threshold) {
    console.log("RESULT: rubik-hi (close match)");
    return 'rubik-hi';
  }

  console.log("RESULT: rubik-lo (far match)");
  return 'rubik-lo';
}

/* =========================
   CELLULE VISUELLE UNIQUE
========================= */
function RubikCell({ color, children }) {
  return (
    <div className={`rubik-base ${color}`}>
      {children}
    </div>
  );
}

function genderLabel(v) {
  if (v === 'm') return 'Homme';
  if (v === 'f') return 'Femme';
  if (v === 'o') return '-';
  return v;
}

function arrowLabel(value) {
  return value;
}

/* =========================
   COMPONENT PRINCIPAL
========================= */
function GuessCubeur() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [done, setDone] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    fetch(`${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data =>
        setResults(data.filter(c => !guesses.find(g => g.id === c.id)))
      );
  }, [query, guesses]);

  const submitGuess = async (cubeur) => {
    const res = await fetch(API_URLS.guessCubeur, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeur_id: cubeur.id }),
    });

    const data = await res.json();

    setGuesses(prev => [
      {
        id: cubeur.id,
        name: data.guessed_name,
        comparison: data.comparison,
      },
      ...prev
    ]);

    setQuery('');
    setResults([]);

    if (data.correct) {
      setDone(true);
      setBanner({ type: 'won', text: `Bravo ! C'était ${data.guessed_name}.` });
    } else if (guesses.length + 1 >= 6) {
      setDone(true);
      setBanner({ type: 'lost', text: `Perdu ! Réessaie demain.` });
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">Devine le cubeur</h2>
        <span className="ml-auto text-sm text-gray-500">
          {guesses.length} / 6
        </span>
      </div>

      {/* INPUT */}
      {!done && (
        <div className="relative mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tape un prénom ou un nom..."
            className="w-full border rounded-md px-3 py-2"
          />

          {results.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow">
              {results.map(c => (
                <div
                  key={c.id}
                  onClick={() => submitGuess(c)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                >
                  {c.first_name} {c.last_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BANNER */}
      {banner && (
        <div
          className={`p-3 rounded-md mb-4 ${
            banner.type === 'won'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* GUESSES TABLE */}
      <div className="space-y-3 overflow-x-auto">

        {guesses.map((g, i) => {
          const c = g.comparison;

          return (
            <div
              key={i}
              className="grid gap-2 min-w-[900px]"
              style={{
                gridTemplateColumns: `
                  160px
                  repeat(2, 38px)
                  48px
                  repeat(2, 38px)
                  48px
                  repeat(${EVENTS_ORDER.length}, 38px)
                `
              }}
            >
              {/* EMPTY TOP-LEFT (name column) */}
              <div />

              {/* BASIC STATS ICONS */}
              <div className="flex items-center justify-center">
                <img src="/icons/gender.svg" className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-center">
                <img src="/icons/year.svg" className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-center">
                <img src="/icons/competition.svg" className="w-5 h-5" />
              </div>

              {/* MEDALS ICONS */}
              <div className="flex items-center justify-center">
                <img src="/icons/gold.svg" className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-center">
                <img src="/icons/silver.svg" className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-center">
                <img src="/icons/bronze.svg" className="w-5 h-5" />
              </div>

              {/* EVENTS ICONS */}
              {EVENTS_ORDER.map(slug => (
                <div key={slug} className="flex items-center justify-center">
                  <img
                    src={`/icons/events/${slug}.svg`}
                    className="w-4 h-4"
                  />
                </div>
              ))}

              {/* NAME */}
              <div className="flex items-center px-2 font-medium">
                {g.name}
              </div>

              {/* BASIC STATS */}
              <RubikCell color={compareValues(c.gender.value, c.gender.target)}>
                {genderLabel(c.gender.value)}
              </RubikCell>

              <RubikCell color={compareValues(c.wca_year.value, c.wca_year.target, true)}>
                {c.wca_year.value}
              </RubikCell>

              <RubikCell color={compareValues(c.competition_count.value, c.competition_count.target)}>
                {arrowLabel(c.competition_count.value)}
              </RubikCell>

              <RubikCell color={compareValues(c.gold_count.value, c.gold_count.target)}>
                {arrowLabel(c.gold_count.value)}
              </RubikCell>

              <RubikCell color={compareValues(c.silver_count.value, c.silver_count.target)}>
                {arrowLabel(c.silver_count.value)}
              </RubikCell>

              <RubikCell color={compareValues(c.bronze_count.value, c.bronze_count.target)}>
                {arrowLabel(c.bronze_count.value)}
              </RubikCell>

              {/* EVENTS */}
              {EVENTS_ORDER.map(slug => {
                const rt = EVENTS_SINGLE.has(slug) ? 'single' : 'average';
                const r = c.rankings?.[`${slug}_${rt}`];

                if (!r || r.value === null) {
                  return (
                    <div key={slug} className="rubik-base rubik-na">
                      —
                    </div>
                  );
                }

                return (
                  <RubikCell
                    key={slug}
                    color={compareValues(r.value, r.target)}
                  >
                    {r.value}
                  </RubikCell>
                );
              })}

            </div>
          );
        })}

      </div>
    </div>
  );
}

export default GuessCubeur;