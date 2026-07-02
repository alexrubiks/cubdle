import { useState, useEffect } from "react";
import { API_URLS } from "../utils";

function GuessPodium({ daily }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);

  useEffect(() => {
    if (query.length < 2) return setResults([]);
    fetch(`${API_URLS.cubeurs}search/?q=${query}`).then(r => r.json()).then(setResults);
  }, [query]);

  const guess = async (cubeurId, name) => {
    const res = await fetch(API_URLS.guessPodium, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeur_id: cubeurId }),
    });
    const data = await res.json();
    setGuesses(prev => [...prev, { name, ...data }]);
    setQuery('');
    setResults([]);
  };

  return (
    <div>
      <h2>Devine le podium</h2>
      <p>{daily.podium_year} - {daily.podium_event?.name}</p>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tape un nom..." />
      {results.map(c => (
        <div key={c.id} onClick={() => guess(c.id, `${c.first_name} ${c.last_name}`)} style={{ cursor: 'pointer', background: '#eee', padding: 4 }}>
          {c.first_name} {c.last_name}
        </div>
      ))}
      {guesses.map((g, i) => (
        <pre key={i} style={{ background: g.correct ? 'lightgreen' : '#fdd', padding: 8 }}>
          {JSON.stringify(g, null, 2)}
        </pre>
      ))}
    </div>
  );
}

export default GuessPodium;