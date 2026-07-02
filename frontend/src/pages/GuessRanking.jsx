import { useState } from "react";
import { API_URLS } from "../utils";

function GuessRanking({ daily }) {
  const [rank, setRank] = useState('');
  const [result, setResult] = useState(null);

  const guess = async () => {
    const res = await fetch(API_URLS.guessRanking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rank: parseInt(rank) }),
    });
    setResult(await res.json());
  };

  return (
    <div>
      <h2>Devine le classement</h2>
      {daily.ranking_cubeur && (
        <p>{daily.ranking_cubeur.name} - {daily.ranking_event.name}</p>
      )}
      <input type="number" min="1" max="100" value={rank} onChange={e => setRank(e.target.value)} />
      <button onClick={guess}>Valider</button>
      {result && (
        <pre style={{ background: result.correct ? 'lightgreen' : '#fdd', padding: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default GuessRanking;