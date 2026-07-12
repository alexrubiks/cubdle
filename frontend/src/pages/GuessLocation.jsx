import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { API_URLS, formatDistance } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import GameNavCard from '../components/ui/GameNavCard';
import { saveGuess, saveDone, getGuesses, getDone } from '../utils/localProgress';


const guessIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#FACC15;
      border:3px solid black;
      border-radius:50%;
    "></div>
  `,
});


const targetIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#65C466;
      border:3px solid black;
      border-radius:50%;
    "></div>
  `,
});


function buildShareTextLocation(_, shareData) {
  return [
    '🎯 Cubdle — Devine la Localisation 🌍',
    shareData.competition,
    '',
    `📍 ${formatDistance(shareData.distance)}`,
    `🔥 ${shareData.score} / 5000`,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}


function LocationSelector({ setPosition, disabled }) {

  useMapEvents({

    click(e) {
      if (disabled) return;

      setPosition([
        e.latlng.lat,
        e.latlng.lng,
      ]);
    },

  });

  return null;
}


function LocationMap({
  guessPosition,
  setGuessPosition,
  result,
  done,
}) {

  const targetPosition = result
    ? [
        result.correct_location.latitude,
        result.correct_location.longitude,
      ]
    : null;


  return (
    <MapContainer
      center={[46.6, 2.3]}
      zoom={6}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationSelector
        setPosition={setGuessPosition}
        disabled={done}
      />

      {guessPosition && (
        <Marker
          position={guessPosition}
          icon={guessIcon}
        />
      )}

      {targetPosition && (
        <Marker
          position={targetPosition}
          icon={targetIcon}
        />
      )}

      {guessPosition && targetPosition && (
        <Polyline
          positions={[guessPosition, targetPosition]}
        />
      )}
    </MapContainer>
  );
}


function GuessLocation() {
  const [challenge, setChallenge] = useState(null);
  const savedGuess = getGuesses("location_guess");
  const [guessPosition, setGuessPosition] = useState(() => {
    if (!savedGuess?.latitude || !savedGuess?.longitude) return null;

    return [
      savedGuess.latitude,
      savedGuess.longitude,
    ];
  });

  const [result, setResult] = useState(() => {
    if (!savedGuess?.result) return null;

    return savedGuess.result;
  });

  const [done, setDone] = useState(getDone("location_done"));

  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(data => setChallenge(data));
  }, []);

  const submitGuess = async () => {

    if (!guessPosition) return;

    const res = await fetch(API_URLS.guessLocation, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: guessPosition[0],
        longitude: guessPosition[1],
      }),
    });

    const data = await res.json();

    const saved = {
      latitude: guessPosition[0],
      longitude: guessPosition[1],
      result: data,
    };

    saveGuess("location_guess", saved);
    saveDone("location_done");
    setResult(data);
    setDone(true);

  };

  if (!challenge) return null;

  return (

    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5 mb-6">

      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* ── HEADER ── */}
        <div className="flex flex-col items-center pt-8">
          <div className="flex items-center justify-between w-2/3">

            <GameNavCard
              to="/podium"
              direction="prev"
              color="bg-cubdle-green"
              prefix="Devine le"
              title="PODIUM"
            />

            <Link
              to="/"
              className="flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95"
            >
              <CubdleLogo size="lg" />
            </Link>

            <GameNavCard
              to="/cubeur"
              direction="next"
              color="bg-cubdle-red"
              prefix="Devine le"
              title="CUBEUR"
            />
          </div>

          <span className="font-body text-2xl text-white/60 mt-1">
            Devine la localisation
          </span>

        </div>

        {/* RESULTS */}
        {result && (

          <VictoryCard
            label="Bravo ! Tu as trouvé la localisation de :"
            name={challenge.location_competition_name}
            buildShareText={buildShareTextLocation}
            nextTo={"/cubeur"}
            shareData={{
              competition: challenge.location_competition_name,
              distance: result.distance_m,
              score: result.score,
            }}
            stats={
              <div className="flex gap-8">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-body text-xs text-black/40 uppercase tracking-wide">
                    Distance
                  </span>

                  <span className="font-title font-extrabold text-4xl text-cubdle-background">
                    {formatDistance(result.distance_m)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="font-body text-xs text-black/40 uppercase tracking-wide">
                    Score
                  </span>

                  <span className="font-title font-extrabold text-4xl text-cubdle-green">
                    {result.score}
                  </span>
                </div>
              </div>
            }
          />
        )}

        {/* COMPETITION */}
        <div className="px-4 py-3 text-center">

          <span className="font-title font-extrabold text-3xl">
            {challenge.location_competition_name}
          </span>

        </div>

        {/* MAP */}
        <div className="mx-auto max-w-full">
          <div className="h-[calc(100vh-340px)] aspect-[3/2] max-w-full mx-auto border-4 border-black rounded-2xl overflow-hidden bg-white">

            <LocationMap
              guessPosition={guessPosition}
              setGuessPosition={setGuessPosition}
              result={result}
              done={done}
            />
          </div>

          {!done && (

            <button
              onClick={submitGuess}
              disabled={!guessPosition}
              className="mt-4 w-full py-3 bg-cubdle-yellow border-4 border-black rounded-xl font-title font-extrabold disabled:opacity-40">
              Valider
            </button>

          )}
        </div>
      </div>
    </div>
  );
}


export default GuessLocation;