import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URLS, formatRankingScore } from '../utils';
import CubdleLogo from '../components/ui/CubdleLogo';
import VictoryCard from '../components/ui/VictoryCard';
import GameNavCard from '../components/ui/GameNavCard';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import { addGuess, saveDone, getGuesses, getDone, submitScore, refreshFromServer, withDate } from '../utils/localProgress';

/*
 * Devine le classement — version "maj de décembre" :
 * un seul essai, score = écart absolu entre le rang proposé et le vrai rang.
 */

function buildShareTextRankingSingle(_guesses, data) {
  const { challenge, result } = data;
  return [
    '🎯 Cubdle — Devine le Classement 1️⃣',
    `${challenge.ranking_cubeur.name} - ${challenge.ranking_event.name}${challenge.ranking_event.slug !== '333mbf' ? ' - ' + challenge.ranking_result_type : ''}`,
    '',
    result.distance === 0
      ? `Rang exact du premier coup ! 🎯`
      : `Écart : ${result.distance} rang${result.distance > 1 ? 's' : ''}`,
    '',
    'https://cubdle.fr',
  ].join('\n');
}

/** Résultat sauvegardé localement (un seul essai). */
function readSavedResult() {
  const guess = getGuesses('ranking_guesses')[0];
  if (!guess || guess.distance === undefined) return null;
  return guess;
}

function Row({ rank, name, score, eventSlug, highlight, bold }) {
  const bg = highlight === 'answer' ? 'bg-cubdle-green/50' : highlight === 'other' ? 'bg-cubdle-red/75' : '';
  return (
    <div className={`grid grid-cols-3 items-center border-b border-black/10 font-body text-sm ${bg} ${bold ? 'font-bold' : ''}`}>
      <div className="px-3 py-2 text-center font-title font-extrabold">{rank ?? '??'}</div>
      <div className="px-3 py-2">{name}</div>
      <div className="px-3 py-2 text-center">
        {score != null ? formatRankingScore(score, eventSlug) : '??'}
      </div>
    </div>
  );
}

/**
 * Avant le guess : seulement le cubeur recherché, rang et temps masqués.
 * Après : toutes les personnes entre le guess et la bonne réponse (ex æquo compris).
 * Vert = groupe de la bonne réponse, rouge = tous les autres.
 */
function ResultTable({ challenge, result }) {
  const eventSlug = challenge.ranking_event.slug;

  const rows = result?.persons?.length
    ? result.persons.map((p) => ({
        key: p.id,
        rank: p.rank,
        name: p.name,
        score: p.score,
        highlight: p.is_answer_group ? 'answer' : 'other',
        bold: p.is_answer,
      }))
    : [{
        key: 'target',
        rank: result?.target_rank ?? null,
        name: challenge.ranking_cubeur?.name,
        score: result?.target_score ?? null,
        highlight: result ? 'answer' : null,
        bold: true,
      }];

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden bg-white mb-6">
      <div className="grid grid-cols-3 bg-black text-white font-body font-bold text-xs uppercase">
        <div className="px-3 py-2 text-center">Rang</div>
        <div className="px-3 py-2">Cubeur</div>
        <div className="px-3 py-2 text-center">{eventSlug === '333mbf' ? 'Score' : 'Temps'}</div>
      </div>

      {rows.map(({ key, ...row }) => (
        <Row key={key} eventSlug={eventSlug} {...row} />
      ))}
    </div>
  );
}

function Stat({ label, value, className = 'text-cubdle-background' }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-body text-xs text-black/40 uppercase tracking-wide whitespace-nowrap">{label}</span>
      <span className={`font-title font-extrabold text-3xl md:text-4xl whitespace-nowrap ${className}`}>{value}</span>
    </div>
  );
}

export default function GuessRankingSingle() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [challenge, setChallenge] = useState(null);
  const [rank, setRank] = useState('');
  const [result, setResult] = useState(readSavedResult);
  const [done, setDone] = useState(() => getDone('ranking_done'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);

  // SYNCHRO SERVEUR
  useEffect(() => {
    refreshFromServer().then((progress) => {
      setDone(progress.ranking_done);
      setResult(readSavedResult());
    });
  }, []);

  // CHALLENGE
  useEffect(() => {
    fetch(withDate(API_URLS.daily))
      .then((r) => r.json())
      .then((data) => setChallenge(data));
  }, []);

  const submitGuess = async () => {
    if (done || submitting) return;

    const value = Number(rank);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setError('Propose un nombre entier entre 1 et 100.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(withDate(API_URLS.guessRanking), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank: value }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }

      const saved = {
        rank: value,
        persons: data.persons ?? [],
        distance: data.distance,
        target_rank: data.rank,
        target_score: data.score,
      };

      addGuess('ranking_guesses', saved);
      saveDone('ranking_done');
      setResult(saved);
      setDone(true);

      await submitScore('ranking', data.distance);
    } catch (err) {
      console.error('Erreur pendant le guess ranking :', err);
      setError('Impossible de joindre le serveur, réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) return null;

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-sm md:w-3/4 md:max-w-[1450px] flex flex-col gap-4">

        <div className="flex flex-col items-center">
          {/* ── HEADER ── */}
          <div className="relative flex items-center w-full max-w-md md:max-w-2xl pt-6 md:pt-8 h-14 md:h-16">
            <div className="absolute left-1 md:left-4">
              <GameNavCard to="/competition" direction="prev" color="bg-cubdle-orange" prefix="Devine la" title="COMPÉTITION" />
            </div>

            <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
              <CubdleLogo className="text-[4em] md:text-[6em]" />
            </Link>

            <div className="absolute right-1 md:right-4">
              <GameNavCard to="/podium" direction="next" color="bg-cubdle-green" prefix="Devine le" title="PODIUM" />
            </div>
          </div>

          <span className="font-body text-2xl text-white/60 mt-12">Devine le classement</span>
        </div>

        {/* ── RÉSULTAT ── */}
        {done && result && (
          <VictoryCard
            label="Le classement de :"
            name={challenge.ranking_cubeur.name}
            guesses={[]}
            nextTo="/podium"
            shareData={{ challenge, result }}
            buildShareText={buildShareTextRankingSingle}
            link={`https://www.worldcubeassociation.org/persons/${challenge.ranking_cubeur.wca_id}`}
            onLeaderboard={() => setShowLeaderboard(true)}
            stats={
              <div className="flex gap-5 md:gap-8">
                <Stat label="Ton rang" value={result.rank} />
                <Stat label="Vrai rang" value={result.target_rank ?? '?'} />
                <Stat
                  label="Écart"
                  value={result.distance === 0 ? '0 🎯' : result.distance}
                  className={result.distance === 0 ? 'text-cubdle-green' : 'text-cubdle-background'}
                />
              </div>
            }
          />
        )}

        {/* ── INPUT ── */}
        {!done && (
          <div className="px-2 md:px-5 py-4 flex flex-col items-center gap-2">
            <span className="font-body text-sm text-white/70">
              ⚠️ Un seul essai : vise juste !
            </span>

            <div className="w-full md:w-1/2 flex gap-2">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="100"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) submitGuess();
                }}
                placeholder="un nombre entre 1 et 100..."
                disabled={submitting}
                className={`flex-1 px-4 py-3 bg-white border-2 border-black rounded-xl font-body text-sm text-black placeholder:text-black/30 outline-none focus:border-cubdle-yellow transition-colors ${submitting ? 'opacity-50' : ''}`}
              />
              <button
                onClick={submitGuess}
                disabled={submitting || !rank}
                className="px-5 py-3 bg-cubdle-yellow border-2 border-black rounded-xl font-title font-extrabold text-sm text-black uppercase transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                Valider
              </button>
            </div>

            {error && <span className="font-body text-sm text-cubdle-red">{error}</span>}
          </div>
        )}

        {/* INFOS CHALLENGE */}
        <div className="flex items-center justify-center gap-4">
          <img
            src={`/events-icons/${challenge.ranking_event?.slug}.svg`}
            alt={challenge.ranking_event?.name}
            className="w-12 h-12 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-title font-extrabold text-lg text-black uppercase">{challenge.ranking_result_type}</span>
            <span className="font-body text-xs text-black/60 tracking-wide">{challenge.ranking_event?.name}</span>
          </div>
        </div>

        {/* ── TABLEAU ── */}
        <div className="px-1 md:px-5">
          <ResultTable challenge={challenge} result={done ? result : null} />
        </div>

        {/* ── BOUTONS ── */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {showLeaderboard && (
          <LeaderboardModal onClose={() => setShowLeaderboard(false)} initialGame="ranking" />
        )}

        {showHowToPlay && (
          <HowToPlayModal gameKey="ranking" onClose={() => setShowHowToPlay(false)} />
        )}
      </div>
    </div>
  );
}
