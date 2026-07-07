import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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

function ShareBlock({ guesses, buildShareText }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(guesses);

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

export default function VictoryCard({ name, label, guesses, nextTo, buildShareText }) {
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
          {label ?? 'Bravo ! La réponse était :'}
        </p>

        <span className="font-title font-extrabold text-2xl text-black text-center">
          {name}
        </span>

        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-xs text-black/40 uppercase tracking-wide">
            Trouvé en
          </span>
          <span className="font-title font-extrabold text-4xl text-cubdle-background">
            {guesses.length} essai{guesses.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="w-full h-[2px] bg-black/10 rounded-full" />

        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-xs text-black/40 uppercase tracking-wide">
            Prochain défi dans
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
        {buildShareText
          ? <ShareBlock guesses={guesses} buildShareText={buildShareText} />
          : null
        }
      </div>
    </div>
  );
}