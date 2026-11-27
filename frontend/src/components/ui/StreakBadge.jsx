import { useEffect, useRef, useState } from 'react';
import { API_URLS } from '../../utils';
import { getLocalOnTimeDoneByDate } from '../../utils/localProgress';
import { computeLocalStreak, requiredGames } from '../../utils/streak';
import { getParisToday } from '../../utils/dates';

/**
 * 🔥 Streak : jours d'affilée avec tous les jeux du jour terminés.
 * Grisée tant que les jeux d'aujourd'hui ne sont pas tous finis (la série n'est pas perdue avant minuit).
 * Clic : petit texte d'explication.
 */
export default function StreakBadge() {
  const [streak, setStreak] = useState(() => computeLocalStreak(getLocalOnTimeDoneByDate()));
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  // Joueur connecté : la série du serveur fait foi (identique sur tous les appareils)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(API_URLS.progressStreak, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((server) => {
        if (!server) return;
        // Les scores du jour peuvent ne pas être encore envoyés : on garde le meilleur des deux
        setStreak((local) => (local.current > server.current ? local : server));
      })
      .catch(() => {});
  }, []);

  if (!streak.current) return null;

  const count = requiredGames(getParisToday()).length;
  const text = streak.today_done
    ? `Streak de ${streak.current} jour${streak.current > 1 ? 's' : ''} ! Record : ${streak.best}.`
    : `Streak de ${streak.current} jour${streak.current > 1 ? 's' : ''} : termine les ${count} jeux aujourd'hui pour la prolonger. Record : ${streak.best}.`;

  const toggle = () => {
    setOpen((o) => !o);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 4000);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={text}
        className="flex items-center gap-1 font-title text-xl font-extrabold leading-none text-white transition-transform hover:scale-105"
      >
        {/* Flamme grise tant que les jeux du jour ne sont pas tous finis */}
        <span className={streak.today_done ? '' : 'grayscale brightness-110'}>🔥</span>
        <span className={streak.today_done ? '' : 'text-white/60'}>{streak.current}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 rounded-xl border-2 border-black bg-[#FDFBD4] px-3 py-2 font-body text-xs text-black shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
}
