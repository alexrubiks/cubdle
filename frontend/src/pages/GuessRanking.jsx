import { useEffect, useState, useRef } from 'react';
import { API_URLS } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import { formatRankingScore } from '../utils';

function buildShareTextRanking(guesses, challenge) {
  return [
    '🎯 Cubdle — Devine le Classement 1️⃣',
    `${challenge.ranking_cubeur.name} - ${challenge.ranking_event.name} ${challenge.ranking_event.slug != "333mbf" ? '- ' + challenge.ranking_result_type : ''}`,
        '',
    `Trouvé en ${guesses.length} essai${guesses.length > 1 ? 's' : ''} !`,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}

function TargetRow({ challenge, solution }) {
  const solved = solution !== null;

  return (
    <div
      className={`grid grid-cols-3 items-center border-b border-black/10 font-body text-sm ${
        solved ? "bg-cubdle-green/50" : ""
      }`}
    >
      <div className={`px-3 py-2 text-center font-title font-extrabold ${
          solved ? "text-black" : "text-cubdle-red"
        }`}
      >
        {solved ? solution.rank : "??"}
      </div>

      <div className="px-3 py-2 font-bold">
        {challenge.ranking_cubeur?.name}
      </div>

      
      <div className="px-3 py-2 text-center font-bold">
        {solved
          ? formatRankingScore(solution.score, challenge.ranking_event?.slug)
          : "??"}
      </div>
    </div>
  );
}

function GuessRow({ person, eventSlug }) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-black/10 font-body text-sm bg-cubdle-red/75">

      <div className="px-3 py-2 text-center font-bold">
        {person.rank}
      </div>

      <div className="px-3 py-2">
        {person.name}
      </div>

      <div className="px-3 py-2 text-center">
        {formatRankingScore(
          person.score,
          eventSlug
        )}
      </div>

    </div>
  );
}

function RankingTable({ challenge, guesses, solution }) {
  if (!challenge) return null;

  const higherRows = guesses
    .filter(g => g.direction === "needs_higher")
    .flatMap(g => g.persons)
    .sort((a, b) => a.rank - b.rank);

  const lowerRows = guesses
    .filter(g => g.direction === "needs_lower")
    .flatMap(g => g.persons)
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white mb-6">

      {/* HEADER */}
      <div className="grid grid-cols-3 bg-black text-white font-body font-bold text-xs uppercase">
        <div className="px-3 py-2 text-center">
          Rang
        </div>

        <div className="px-3 py-2">
          Cubeur
        </div>

        <div className="px-3 py-2 text-center">
          {challenge.ranking_event.slug == "333mbf" ? "Score" : "Temps"}
        </div>
      </div>

      {/* PARTIE HAUTE */}
      {higherRows.map((person, i) => (
        <GuessRow
          key={`high-${i}`}
          person={person}
          eventSlug={challenge.ranking_event.slug}
        />
      ))}

      {/* CIBLE */}
      <TargetRow
        challenge={challenge}
        solution={solution}
      />

      {/* PARTIE BASSE */}
      {lowerRows.map((person, i) => (
        <GuessRow
          key={`low-${i}`}
          person={person}
          eventSlug={challenge.ranking_event.slug}
        />
      ))}
    </div>
  );
}

function GuessRanking() {

  const [challenge, setChallenge] = useState(null);
  const [rank, setRank] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [done, setDone] = useState(false);
  const [solution, setSolution] = useState(null);
  const [victory, setVictory] = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(data => setChallenge(data));
  }, []);

  const submitGuess = async () => {
    const value = Number(rank);

    if (!value || value < 1 || value > 100) {
      return;
    }

    const res = await fetch(API_URLS.guessRanking, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rank: value,
      }),
    });

    const data = await res.json();


    setGuesses(prev => [
      {
        rank: value,
        persons: data.correct
          ? []
          : data.persons_at_rank ?? [],
        direction: data.direction,
        correct: data.correct,
      },
      ...prev,
    ]);


    if (data.correct) {
      setDone(true);

      setSolution({
        rank: data.rank,
        score: data.score,
      });

      setVictory({
        name: challenge.ranking_cubeur.name,
      });
    }


    setRank('');

    inputRef.current?.focus();
  };

  if (!challenge) return null;

  return (
    <div className="min-h-screen bg-cubdle-background flex flex-col items-center px-5">

      <div className="w-2/3 min-w-[320px] flex flex-col gap-4">

        {/* ── HEADER ── */}
        <div className="flex flex-col items-center pt-8">

          <div className="flex items-center justify-center py-2">
            <CubdleLogo size="lg" />
          </div>

          <span className="font-body text-2xl text-white/60 mt-1">
            Devine le classement
          </span>

        </div>

        {/* ── VICTORY ── */}
        {victory && (
          <VictoryCard
            label="Bravo ! Tu as trouvé le classement de :"
            name={victory.name}
            guesses={guesses}
            nextTo="/podium"
            shareData={challenge}
            buildShareText={buildShareTextRanking}
          />
        )}

        {/* ── INPUT ── */}
        {!done && (
          <div className="px-5 py-4 flex justify-center">

            <div className="w-1/2">

              <input
                ref={inputRef}
                type="number"
                min="1"
                max="100"
                value={rank}
                onChange={e => setRank(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    submitGuess();
                  }
                }}
                placeholder="un nombre entre 1 et 100..."
                className="
                  w-full
                  px-4
                  py-3
                  bg-white
                  border-2
                  border-black
                  rounded-xl
                  font-body
                  text-sm
                  text-black
                  placeholder:text-black/30
                  outline-none
                  focus:border-cubdle-yellow
                  transition-colors
                "
              />
            </div>
          </div>
        )}

        {/* INFOS CHALLENGE */}
        <div className="flex items-center justify-center gap-4 border-black">

          <img
            src={`/events-icons/${challenge.ranking_event?.slug}.svg`}
            alt={challenge.ranking_event?.name}
            className="w-12 h-12 object-contain"
          />

          <div className="flex flex-col">

            <span className="font-title font-extrabold text-lg text-black uppercase">
              {challenge.ranking_result_type}
            </span>

            <span className="font-body text-xs text-black/60 tracking-wide">
              {challenge.ranking_event?.name}
            </span>

          </div>

        </div>

        {/* ── GRILLE ── */}
        <div className="px-5">

          <RankingTable
            challenge={challenge}
            guesses={guesses}
            solution={solution}
          />

        </div>
      </div>
    </div>
  );
}


export default GuessRanking;