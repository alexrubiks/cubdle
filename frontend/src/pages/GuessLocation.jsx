
import { useState } from "react";
import { API_URLS } from "../utils";

function GuessLocation({ daily }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [result, setResult] = useState(null);

  const guess = async () => {
    const res = await fetch(API_URLS.guessLocation, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lng) }),
    });
    setResult(await res.json());
  };

  return (
    <div>
      <h2>Devine la localisation</h2>
      <p>{daily.location_competition_name}</p>
      <input placeholder="latitude" value={lat} onChange={e => setLat(e.target.value)} />
      <input placeholder="longitude" value={lng} onChange={e => setLng(e.target.value)} />
      <button onClick={guess}>Valider</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default GuessLocation;