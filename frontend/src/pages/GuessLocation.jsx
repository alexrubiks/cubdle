import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import { Eye, EyeOff } from 'lucide-react';
import L from 'leaflet';
import { API_URLS, formatDistance } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import GameNavCard from '../components/ui/GameNavCard';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import { saveGuess, saveDone, submitScore, refreshFromServer } from '../utils/localProgress';


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


const otherGuessIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:16px;
      height:16px;
      background:#A78BFA;
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


function LocationSelector({ setPosition, disabled, onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick?.();
      if (disabled) return;
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}


function LocationMap({
    guessPosition,
    setGuessPosition,
    result,
    done,
    otherGuesses,
    showOthers,
    onOtherGuessClick,
  }) {

  const targetPosition = result
    ? [
        result.correct_location.latitude,
        result.correct_location.longitude,
      ]
    : null;


  return (
    <MapContainer center={[46.6, 2.3]} zoom={6} scrollWheelZoom={true} className="w-full h-full rounded-xl">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <LocationSelector
        setPosition={setGuessPosition}
        disabled={done}
        onMapClick={() => onOtherGuessClick(null)}
      />

      {showOthers && targetPosition && otherGuesses.map((g, i) => (
        <Polyline
          key={`line-${i}`}
          positions={[[g.latitude, g.longitude], targetPosition]}
        />
      ))}

      {showOthers && otherGuesses.map((g, i) => (
        <Marker
          key={i}
          position={[g.latitude, g.longitude]}
          icon={otherGuessIcon}
          eventHandlers={{
            click: (e) => {
              onOtherGuessClick({
                pseudo: g.pseudo,
                x: e.originalEvent.clientX,
                y: e.originalEvent.clientY,
              });
            },
          }}
        />
      ))}

      {guessPosition && <Marker position={guessPosition} icon={guessIcon} />}
      {targetPosition && <Marker position={targetPosition} icon={targetIcon} />}
      {guessPosition && targetPosition && <Polyline positions={[guessPosition, targetPosition]} />}
    </MapContainer>
  );
}


function GuessLocation() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [challenge, setChallenge] = useState(null);

  const [guessPosition, setGuessPosition] = useState(null);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);

  const [otherGuesses, setOtherGuesses] = useState([]);
  const [showOthers, setShowOthers] = useState(false);
  const [popup, setPopup] = useState(null); // { pseudo, x, y }

  useEffect(() => {
    if (done) {
      fetch(API_URLS.locationGuesses)
        .then(r => r.json())
        .then(setOtherGuesses);
    }
  }, [done]);

  // CHALLENGE
  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(data => setChallenge(data));
  }, []);

  // SYNCHRO SERVEUR
  useEffect(() => {
    refreshFromServer().then((progress) => {
      const saved = progress.location_guess;

      if (
        saved?.latitude != null &&
        saved?.longitude != null
      ) {
        setGuessPosition([
          saved.latitude,
          saved.longitude,
        ]);
      }

      if (saved?.result) {
        setResult(saved.result);
      }

      setDone(progress.location_done);
    });
  }, []);

  const submitGuess = async () => {
    if (!guessPosition || done) return;

    const res = await fetch(API_URLS.guessLocation, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    submitScore("location", data.score);
  };

  if (!challenge) return null;

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      {popup && (
        <div
          className="fixed z-[9999] rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-nowrap"
          style={{
            left: popup.x,
            top: popup.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          {popup.pseudo}
        </div>
      )}
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[1450px] flex flex-col gap-4">

        <div className="flex flex-col items-center">

          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard
                to="/podium"
                direction="prev"
                color="bg-cubdle-green"
                prefix="Devine le"
                title="PODIUM"
              />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard
                to="/cubeur"
                direction="next"
                color="bg-cubdle-red"
                prefix="Devine le"
                title="CUBEUR"
              />
            </div>
          </div>

          <span className="font-body text-2xl text-white/60 mt-12">
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
            link={`https://www.worldcubeassociation.org/competitions/${challenge.location_competition_id}`}
            onLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {/* COMPETITION */}
        <div className="px-2 md:px-4 py-3 text-center">

          <span className="font-title font-extrabold text-3xl">
            {challenge.location_competition_name}
          </span>

        </div>

        {/* MAP */}
        <div className="mx-auto w-full px-1 md:px-0 flex justify-center">
          <div className="w-full max-w-[900px] flex flex-col">
            <div className="relative w-full aspect-[3/4] md:aspect-[3/2] border-4 border-black rounded-2xl overflow-hidden bg-white">

              <LocationMap
                guessPosition={guessPosition}
                setGuessPosition={setGuessPosition}
                result={result}
                done={done}
                otherGuesses={otherGuesses}
                showOthers={showOthers}
                onOtherGuessClick={setPopup}
              />

              {done && (
                <button
                  onClick={() => setShowOthers(v => !v)}
                  className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-body font-semibold text-black/70 hover:bg-white transition-colors shadow-sm"
                >
                  {showOthers ? (
                    <>
                      <EyeOff size={14} />
                      Masquer les autres
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Afficher les autres
                    </>
                  )}
                </button>
              )}

            </div>

            {!done && (
              <button
                onClick={submitGuess}
                disabled={!guessPosition}
                className="mt-4 w-full py-3 bg-cubdle-yellow border-4 border-black rounded-xl font-title font-extrabold disabled:opacity-40"
              >
                Valider
              </button>
            )}
          </div>
        </div>

        {/* ── BOUTONS ── */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {showLeaderboard && (
          <LeaderboardModal 
            onClose={() => setShowLeaderboard(false)}
            initialGame="location"
          />
        )}
        
        {showHowToPlay && (
          <HowToPlayModal gameKey="location" onClose={() => setShowHowToPlay(false)} />
        )}
        
      </div>
    </div>
  );
}


export default GuessLocation;