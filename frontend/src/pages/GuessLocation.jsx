import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

import { API_URLS } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';


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


// ─────────────────────────────
// Gestion clic carte
// ─────────────────────────────

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
      className="h-[450px] w-full rounded-xl"
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
          positions={[
            guessPosition,
            targetPosition,
          ]}
        />

      )}

    </MapContainer>
  );
}

function LocationResult({ result, competition }) {

  return (
    <div className=" bg-white border-4 border-black rounded-2xl p-6 flex flex-col items-center gap-4 mt-4">

      <span className=" font-body text-sm text-black/50">
        Résultat pour
      </span>

      <span className=" font-title font-extrabold text-2xl text-center">
        {competition}
      </span>

      <div className="flex gap-8">

        <div className="flex flex-col items-center">
          <span className="font-body text-xs text-black/40 uppercase">
            Distance
          </span>

          <span className="font-title font-extrabold text-3xl">
            {result.distance_km} km
          </span>
        </div>

        <div className="flex flex-col items-center">

          <span className="font-body text-xs text-black/40 uppercase">
            Score
          </span>

          <span className="font-title font-extrabold text-3xl text-cubdle-background">
            {result.score}
          </span>

        </div>
      </div>
    </div>
  );
}


function GuessLocation() {
  const [challenge, setChallenge] = useState(null);
  const [guessPosition, setGuessPosition] = useState(null);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);

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

    setResult(data);
    setDone(true);

  };

  if (!challenge) return null;

  return (

    <div className=" min-h-screen bg-cubdle-background flex flex-col items-center px-5">

      <div className=" w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* HEADER */}
        <div className="flex flex-col items-center pt-8">

          <div className="flex items-center justify-center py-2">
            <CubdleLogo size="lg" />
          </div>

          <span className="font-body text-2xl text-white/60 mt-1">
            Devine la localisation
          </span>

        </div>

        {/* COMPETITION */}
        <div className="bg-white border-2 border-black rounded-xl px-4 py-3 text-center">

          <span className="font-title font-extrabold text-lg">
            {challenge.location_competition_name}
          </span>

        </div>

        {/* MAP */}
        <div className="border-4 border-black rounded-2xl overflow-hidden bg-white">

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
            className="w-full py-3 bg-cubdle-yellow border-4 border-black rounded-xl font-title font-extrabold disabled:opacity-40">
            Valider
          </button>

        )}

        {result && (

          <LocationResult
            result={result}
            competition={
              challenge.location_competition_name
            }
          />
        )}
      </div>
    </div>
  );
}


export default GuessLocation;