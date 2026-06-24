import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

import { API_URLS } from './utils';
import GuessCubeur from './components/games/GuessCubeur';
import GuessPodium from './components/games/GuessPodium';
import GuessRanking from './components/games/GuessRanking';
import GuessLocation from './components/games/GuessLocation';
import GuessCompet from './components/games/GuessCompet';

export default function App() {
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(setDaily);
  }, []);

  if (!daily) return <p>Chargement...</p>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ padding: 20 }}>
            <h1>Cubdle</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/cubeur">
                <button>Guess Cubeur</button>
              </Link>

              <Link to="/ranking">
                <button>Guess Ranking</button>
              </Link>

              <Link to="/podium">
                <button>Guess Podium</button>
              </Link>

              <Link to="/location">
                <button>Guess Location</button>
              </Link>

              <Link to="/competition">
                <button>Guess Competition</button>
              </Link>
            </div>
          </div>
        }
      />

      <Route path="/cubeur" element={<GuessCubeur />} />
      <Route path="/ranking" element={<GuessRanking daily={daily} />} />
      <Route path="/podium" element={<GuessPodium daily={daily} />} />
      <Route path="/location" element={<GuessLocation daily={daily} />} />
      <Route path="/competition" element={<GuessCompet />} />
    </Routes>
  );
}