// utiliser le hook daily.js

import { useState, useEffect, useRef } from 'react';
import { API_URLS } from '../../utils';

const EVENTS_SINGLE = new Set(['333bf', '444bf', '555bf', '333mbf']);

const EVENTS_ORDER = [
  '333', '222', '444', '555', '666', '777',
  '333bf', '333fm', '333oh', 'clock', 'minx',
  'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf',
];

const EVENT_LABEL = {
  '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5',
  '666': '6x6', '777': '7x7', '333bf': '3BLD', '333fm': 'FMC',
  '333oh': 'OH', 'clock': 'Clock', 'minx': 'Mega', 'pyram': 'Pyra',
  'skewb': 'Skewb', 'sq1': 'SQ1', '444bf': '4BLD', '555bf': '5BLD',
  '333mbf': 'MBLD',
};

function compareValues(userValue, targetValue, isYear = false) {
  const emptyUser   = userValue  === null || userValue  === undefined || userValue  === '';
  const emptyTarget = targetValue === null || targetValue === undefined || targetValue === '';

  if (emptyUser !== emptyTarget) return 'rubik-no';
  if (userValue === targetValue)  return 'rubik-ok';

  const u = Number(userValue);
  const t = Number(targetValue);

  if (Number.isNaN(u) || Number.isNaN(t)) return 'rubik-no';

  const diff      = Math.abs(u - t);
  const threshold = isYear ? 1 : 5;

  if (diff <= threshold) return 'rubik-hi';
  return 'rubik-lo';
}

function RubikCell({ color, children }) {
  return (
    <div className={`rubik-base ${color}`}>
      <div className="rubik-sticker-inner">
        {children}
      </div>
    </div>
  );
}

function RubikNA() {
  return (
    <div className="rubik-base rubik-na">
      <div className="rubik-sticker-inner">—</div>
    </div>
  );
}

function genderLabel(v) {
  if (v === 'm') return '♂';
  if (v === 'f') return '♀';
  return '?';
}

function initials(name = '') {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function GridHeader() {
  return (
    <div className="guess-row guess-header">
      {/* Nom */}
      <div className="col-name header-cell header-name">Cubeur</div>

      {/* Stats de base : texte car ambigu en icône */}
      <div className="col-basic header-cell">
        <span className="header-icon">⚥</span>
        <span className="header-label">Genre</span>
      </div>
      <div className="col-basic header-cell">
        <span className="header-icon">📅</span>
        <span className="header-label">Début</span>
      </div>
      <div className="col-comps header-cell">
        <span className="header-icon">#</span>
        <span className="header-label">Compét.</span>
      </div>

      {/* Médailles */}
      <div className="col-medal header-cell">🥇</div>
      <div className="col-medal header-cell">🥈</div>
      <div className="col-medal header-cell">🥉</div>

      {/* Événements */}
      {EVENTS_ORDER.map(slug => (
        <div key={slug} className="col-event header-cell">
          <img
            src={`src/assets/icons/${slug}.svg`}
            alt={EVENT_LABEL[slug]}
            title={EVENT_LABEL[slug]}
            className="event-icon"
          />
          <span className="header-label">{EVENT_LABEL[slug]}</span>
        </div>
      ))}
    </div>
  );
}

function GuessRow({ guess }) {
  const c = guess.comparison;

  return (
    <div className="guess-row guess-data">
      {/* Nom */}
      <div className="col-name">
        <span className="cubeur-name">{guess.name}</span>
      </div>

      {/* Genre */}
      <div className="col-basic">
        <RubikCell color={compareValues(c.gender.value, c.gender.target)}>
          {genderLabel(c.gender.value)}
        </RubikCell>
      </div>

      {/* Année WCA */}
      <div className="col-basic">
        <RubikCell color={compareValues(c.wca_year.value, c.wca_year.target, true)}>
          {c.wca_year.value}
        </RubikCell>
      </div>

      {/* Nombre de compétitions */}
      <div className="col-comps">
        <RubikCell color={compareValues(c.competition_count.value, c.competition_count.target)}>
          {c.competition_count.value}
        </RubikCell>
      </div>

      {/* Médailles */}
      <div className="col-medal">
        <RubikCell color={compareValues(c.gold_count.value, c.gold_count.target)}>
          {c.gold_count.value}
        </RubikCell>
      </div>
      <div className="col-medal">
        <RubikCell color={compareValues(c.silver_count.value, c.silver_count.target)}>
          {c.silver_count.value}
        </RubikCell>
      </div>
      <div className="col-medal">
        <RubikCell color={compareValues(c.bronze_count.value, c.bronze_count.target)}>
          {c.bronze_count.value}
        </RubikCell>
      </div>

      {/* Événements */}
      {EVENTS_ORDER.map(slug => {
        const rt = EVENTS_SINGLE.has(slug) ? 'single' : 'average';
        const r  = c.rankings?.[`${slug}_${rt}`];

        if (!r || r.value === null) {
          return (
            <div key={slug} className="col-event">
              <RubikNA />
            </div>
          );
        }

        return (
          <div key={slug} className="col-event">
            <RubikCell color={compareValues(r.value, r.target)}>
              {r.value}
            </RubikCell>
          </div>
        );
      })}
    </div>
  );
}

function GuessCubeur() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [done,    setDone]    = useState(false);
  const [banner,  setBanner]  = useState(null);

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  /* Recherche autocomplete */
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }

    fetch(`${API_URLS.cubeurs}search/?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data =>
        setResults(data.filter(c => !guesses.find(g => g.id === c.id)))
      );
  }, [query, guesses]);

  /* Ferme le dropdown au clic extérieur */
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Soumettre un guess */
  const submitGuess = async (cubeur) => {
    setQuery('');
    setResults([]);

    const res = await fetch(API_URLS.guessCubeur, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeur_id: cubeur.id }),
    });

    const data = await res.json();

    const newGuess = {
      id:         cubeur.id,
      name:       data.guessed_name,
      comparison: data.comparison,
    };

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
    <div className="guess-cubeur">

      {/* ── HEADER ── */}
      <div className="gc-header">
        <h2 className="gc-title">
          Cub<span className="gc-title-accent">dle</span>
        </h2>
        <span className="gc-count">{guesses.length} / 20</span>
      </div>

      {/* ── BANNER ── */}
      {banner && (
        <div className={`gc-banner gc-banner--${banner.type}`}>
          {banner.text}
        </div>
      )}

      {/* ── INPUT ── */}
      {!done && (
        <div className="gc-input-zone">
          <div className="gc-input-wrap" ref={dropdownRef}>
            <span className="gc-input-icon" aria-hidden="true">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tape un prénom ou un nom…"
              className="gc-input"
              autoComplete="off"
              spellCheck={false}
            />

            {results.length > 0 && (
              <ul className="gc-dropdown" role="listbox">
                {results.map(c => (
                  <li
                    key={c.id}
                    role="option"
                    className="gc-option"
                    onMouseDown={() => submitGuess(c)}
                  >
                    <span className="gc-option-avatar">
                      {initials(`${c.first_name} ${c.last_name}`)}
                    </span>
                    <span className="gc-option-name">
                      {c.first_name} {c.last_name}
                    </span>
                    {c.country_iso2 && (
                      <span className="gc-option-country">{c.country_iso2}</span>
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
        <div className="gc-grid-scroll">
          <div className="gc-grid">
            <GridHeader />
            {guesses.map((g, i) => (
              <GuessRow key={`${g.id}-${i}`} guess={g} />
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {guesses.length === 0 && !done && (
        <div className="gc-empty">
          <p>Cherche un cubeur pour commencer !</p>
        </div>
      )}

    </div>
  );
}

export default GuessCubeur;