import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { compareValues, EVENTS_ORDER, EVENTS_SINGLE } from '../../utils';

const TILE_EMOJI = {
  'tile-correct': '🟩',
  'tile-near':    '🟨',
  'tile-partial': '🟧',
  'tile-wrong':   '🟥',
  'tile-none':    '⬜',
};

function buildShareText(guesses, guessCount) {
  const allLines = [...guesses].reverse().map(guess => {
    const c = guess.comparison;

    const cells = [
      compareValues(c.gender.value, c.gender.target),
      compareValues(c.wca_year.value, c.wca_year.target, true),
      compareValues(c.competition_count.value, c.competition_count.target),
      compareValues(c.gold_count.value, c.gold_count.target),
      compareValues(c.silver_count.value, c.silver_count.target),
      compareValues(c.bronze_count.value, c.bronze_count.target),
    ].map(color => TILE_EMOJI[color] ?? '⬜').join('');

    const eventTotal = EVENTS_ORDER.length;
    const eventCorrect = EVENTS_ORDER.filter(slug => {
      const rt = EVENTS_SINGLE.has(slug) ? 'single' : 'average';
      const r = c.rankings?.[`${slug}_${rt}`];
      if (r?.value != null && r?.target != null)
        return compareValues(r.value, r.target) === 'tile-correct';
      if (r?.value == null && r?.target == null) return true;
      return false;
    }).length;

    return `${cells} · ${eventCorrect}/${eventTotal} events`;
  });

  const MAX = 5;
  let lines;
  if (allLines.length <= MAX + 1) {
    lines = allLines;
  } else {
    lines = [
      ...allLines.slice(0, MAX),
      '...',
      allLines[allLines.length - 1],
    ];
  }

  return [
    `🎯 Cubdle — Devine le Cubeur`,
    `Trouvé en ${guessCount} essai${guessCount > 1 ? 's' : ''} !`,
    '',
    ...lines,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function compute() {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    }
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-title font-extrabold text-2xl text-cubdle-background tabular-nums">
      {timeLeft}
    </span>
  );
}

function ShareBlock({ guesses, guessCount }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(guesses, guessCount);

  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="font-body text-xs text-black/40 uppercase tracking-wide">
        Partager
      </span>
      <pre className="font-body text-sm text-black bg-black/5 rounded-xl p-3 whitespace-pre-wrap leading-relaxed flex-1">
        {text}
      </pre>
      <button
        onClick={handleCopy}
        className={`w-full py-2 border-2 border-black rounded-xl font-title font-bold text-sm transition-colors
          ${copied ? 'bg-cubdle-green text-black' : 'bg-white text-black hover:bg-black/5'}`}
      >
        {copied ? '✓ Copié !' : 'Copier'}
      </button>
    </div>
  );
}

export default function VictoryCard({ name, guessCount, guesses, nextTo }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col sm:flex-row gap-6 bg-white border-4 border-black rounded-2xl p-6 mt-4"
    >
      {/* ── GAUCHE : infos victoire ── */}
      <div className="flex flex-col items-center gap-4 flex-1">
        <p className="font-body text-sm text-black/50 text-center">
          Bravo ! Le cubeur à deviner était :
        </p>

        <span className="font-title font-extrabold text-2xl text-black text-center">
          {name}
        </span>

        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-xs text-black/40 uppercase tracking-wide">
            Trouvé en
          </span>
          <span className="font-title font-extrabold text-4xl text-cubdle-background">
            {guessCount} essai{guessCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="w-full h-[2px] bg-black/10 rounded-full" />

        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-xs text-black/40 uppercase tracking-wide">
            Prochain cubeur dans
          </span>
          <Countdown />
          <span className="font-body text-[10px] text-black/30">
            Europe · UTC+2
          </span>
        </div>

        {nextTo && (
          <Link
            to={nextTo}
            className="w-full py-3 bg-cubdle-background border-4 border-black rounded-xl font-title font-extrabold text-white text-center hover:opacity-90 transition-opacity"
          >
            Jeu suivant →
          </Link>
        )}
      </div>

      {/* Divider vertical */}
      <div className="hidden sm:block w-[2px] bg-black/10 rounded-full" />

      {/* ── DROITE : partage ── */}
      <div className="flex-1">
        <ShareBlock guesses={guesses} guessCount={guessCount} />
      </div>
    </div>
  );
}