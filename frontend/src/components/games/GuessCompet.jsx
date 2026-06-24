import { useState, useEffect } from "react";
import { API_URLS } from "../../utils";

function GuessCompet() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [guesses, setGuesses] = useState([]);

  useEffect(() => {
    if (query.length < 2) return setResults([]);
    fetch(`${API_URLS.competitions}search/?q=${query}`).then(r => r.json()).then(setResults);
  }, [query]);

  const guess = async (compId, name) => {
    const res = await fetch(API_URLS.guessCompet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition_id: compId }),
    });
    const data = await res.json();
    setGuesses(prev => [...prev, { name, ...data }]);
    setQuery('');
    setResults([]);
  };

  return (
    <div>
      <h2>Devine la compet</h2>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tape un nom..." />
      {results.map(c => (
        <div key={c.id} onClick={() => guess(c.id, c.name)} style={{ cursor: 'pointer', background: '#eee', padding: 4 }}>
          {c.name}
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

export default GuessCompet;