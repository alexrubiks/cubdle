import { useState, useEffect, useRef } from 'react';
import { API_URLS } from '../../utils';

/* ================================
   CONSTANTES ÉVÉNEMENTS
================================ */
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

/* ================================
   TRADUCTION STATUT → CLASSE CSS
   Le backend envoie : correct / partial / wrong
   On mappe directement vers les classes rubik-*
================================ */
function statusToColor(status) {
  if (status === 'correct') return 'rubik-ok';
  if (status === 'partial') return 'rubik-hi';
  return 'rubik-no';
}

/* ================================
   CELLULE STICKER (identique GuessCubeur)
================================ */
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

/* ================================
   HELPERS AFFICHAGE
================================ */
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// "avril-mai" → "avr-mai", "2023" → "2023"
function formatSetString(value = '') {
  return value
    .split('-')
    .map(s => s.trim().slice(0, 3))
    .join('-');
}

// Résumé compact pour orgas/délégués
function peopleLabel(list = []) {
  if (!list || list.length === 0) return '—';
  if (list.length === 1) return initials(list[0]);
  return `${list.length}`;
}

/* ================================
   HEADER DE COLONNES
================================ */
function GridHeader() {
  return (
    <div className="guess-row guess-header">
      <div className="col-name header-cell header-name">Compétition</div>

      <div className="col-basic header-cell">
        <span className="header-icon">📅</span>
        <span className="header-label">Mois</span>
      </div>
      <div className="col-basic header-cell">
        <span className="header-icon">📆</span>
        <span className="header-label">Année</span>
      </div>
      <div className="col-comps header-cell">
        <span className="header-icon">👥</span>
        <span className="header-label">Participants</span>
      </div>
      <div className="col-people header-cell">
        <span className="header-icon">🛠️</span>
        <span className="header-label">Orgas</span>
      </div>
      <div className="col-people header-cell">
        <span className="header-icon">🎖️</span>
        <span className="header-label">Délégués</span>
      </div>

      {EVENTS_ORDER.map(slug => (
        <div key={slug} className="col-event header-cell">
          <img
            src={`/icons/events/${slug}.svg`}
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

/* ================================
   LIGNE DE GUESS
================================ */
function GuessRow({ guess }) {
  const c = guess.comparison;

  // events : le backend renvoie { status, value: [...slugs guessés] }
  // On reconstruit une map slug → présent/absent depuis la liste guessée
  const guessedEventSlugs = new Set(c.events?.value || []);

  return (
    <div className="guess-row guess-data">

      {/* Nom */}
      <div className="col-name">
        <div className="cubeur-avatar">{initials(guess.name)}</div>
        <span className="cubeur-name" title={guess.name}>{guess.name}</span>
      </div>

      {/* Mois — peut être "avril" ou "avril-mai" */}
      <div className="col-basic">
        <RubikCell color={statusToColor(c.month.status)}>
          {formatSetString(c.month.value)}
        </RubikCell>
      </div>

      {/* Année — peut être "2023" ou "2022-2023" */}
      <div className="col-basic">
        <RubikCell color={statusToColor(c.year.status)}>
          {formatSetString(c.year.value)}
        </RubikCell>
      </div>

      {/* Participants */}
      <div className="col-comps">
        <RubikCell color={statusToColor(c.participant_count.status)}>
          {c.participant_count.value >= 0 ? c.participant_count.value : '?'}
        </RubikCell>
      </div>

      {/* Organisateurs */}
      <div className="col-people">
        <RubikCell color={statusToColor(c.organizers.status)}>
          <span
            className="people-cell-label"
            title={(c.organizers.value || []).join(', ')}
          >
            {peopleLabel(c.organizers.value)}
          </span>
        </RubikCell>
      </div>

      {/* Délégués */}
      <div className="col-people">
        <RubikCell color={statusToColor(c.delegates.status)}>
          <span
            className="people-cell-label"
            title={(c.delegates.value || []).join(', ')}
          >
            {peopleLabel(c.delegates.value)}
          </span>
        </RubikCell>
      </div>

      {/* Events — une case par event, vert si présent dans le guess ET la target,
          rouge si différent. Le statut global de c.events ne suffit pas ici :
          on affiche case par case donc le backend doit envoyer une map.
          Si le backend envoie seulement { status, value: [...slugs] },
          on affiche ✓ ou ✗ avec la couleur globale en fallback.
          Voir note backend ci-dessous. */}
      {EVENTS_ORDER.map(slug => {
        // Cas idéal : backend envoie c.events comme map { [slug]: { status, value } }
        if (c.events && !Array.isArray(c.events.value) && c.events[slug] !== undefined) {
          const ev = c.events[slug];
          return (
            <div key={slug} className="col-event">
              <RubikCell color={statusToColor(ev.status)}>
                {ev.value ? '✓' : '✗'}
              </RubikCell>
            </div>
          );
        }

        // Fallback : backend envoie { status, value: [...slugs guessés] }
        // On peut juste savoir si le cubeur avait l'event, pas si la target l'a
        const guessedHas = guessedEventSlugs.has(slug);
        return (
          <div key={slug} className="col-event">
            <RubikCell color={guessedHas ? 'rubik-hi' : 'rubik-na'}>
              {guessedHas ? '✓' : '✗'}
            </RubikCell>
          </div>
        );
      })}

    </div>
  );
}

/* ================================
   DOTS TENTATIVES
================================ */
function AttemptDots({ current, max = 6 }) {
  return (
    <div className="attempt-dots">
      {Array.from({ length: max }, (_, i) => {
        const cls =
          i < current   ? 'dot dot-used'  :
          i === current ? 'dot dot-active' :
                          'dot';
        return <span key={i} className={cls} />;
      })}
    </div>
  );
}

/* ================================
   COMPOSANT PRINCIPAL
================================ */
function GuessCompet() {
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

    fetch(`${API_URLS.competitions}search/?q=${encodeURIComponent(query)}`)
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
        !inputRef.current?.contains(e.target)
      ) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Soumettre un guess */
  const submitGuess = async (compet) => {
    setQuery('');
    setResults([]);

    const res = await fetch(API_URLS.guessCompet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition_id: compet.id }),
    });

    const data = await res.json();

    const newGuess = {
      id:         compet.id,
      name:       data.guessed_name,
      comparison: data.comparison,
    };

    setGuesses(prev => {
      const updated = [newGuess, ...prev];

      if (data.correct) {
        setDone(true);
        setBanner({ type: 'won', text: `🎉 Bravo ! C'était ${data.guessed_name}.` });
      } else if (updated.length >= 6) {
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
          <span className="gc-title-sub"> · Compét</span>
        </h2>
        <AttemptDots current={guesses.length} />
        <span className="gc-count">{guesses.length} / 6</span>
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
              placeholder="Tape le nom d'une compétition…"
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
                      {initials(c.name)}
                    </span>
                    <span className="gc-option-name">{c.name}</span>
                    {c.year && (
                      <span className="gc-option-country">{c.year}</span>
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
          <div className="gc-grid gc-grid--compet">
            <GridHeader />
            {guesses.map((g, i) => (
              <GuessRow key={`${g.id}-${i}`} guess={g} />
            ))}
          </div>
        </div>
      )}

      {guesses.length === 0 && !done && (
        <div className="gc-empty">
          <p>Cherche une compétition pour commencer !</p>
        </div>
      )}

    </div>
  );
}

export default GuessCompet;