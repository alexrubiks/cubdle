import { useEffect, useState } from 'react';

// Un défi devient rejouable en archive ARCHIVE_DELAY_DAYS jours après sa date
// (doit rester aligné avec core/dates.py côté backend).
export const ARCHIVE_DELAY_DAYS = 10;

// Lancement officiel de Cubdle : rien d'antérieur n'est accessible (aligné avec le backend).
export const ARCHIVE_START = '2026-08-01';

// Date de lancement de la maj de décembre (aligné avec LAUNCH_DATE côté backend).
// Surchargeable via VITE_LAUNCH_DATE pour tester en avance (ex : preview Vercel).
export const LAUNCH_DATE = import.meta.env.VITE_LAUNCH_DATE || '2026-12-01';

const parisFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date du jour à Paris, au format YYYY-MM-DD. */
export function getParisToday() {
  return parisFormatter.format(new Date());
}

/** True si la maj de décembre est active pour cette date (défaut : aujourd'hui). */
export function isLaunched(date = getParisToday()) {
  return date >= LAUNCH_DATE;
}

/** Ajoute n jours à une date 'YYYY-MM-DD' (n peut être négatif). */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Dernier jour jouable en archive. */
export function getLastArchiveDate(today = getParisToday()) {
  return addDays(today, -ARCHIVE_DELAY_DAYS);
}

/** Un défi est jouable en archive entre ARCHIVE_START et J-10. */
export function isArchivePlayable(date, today = getParisToday()) {
  return isValidDateStr(date) && date >= ARCHIVE_START && date <= getLastArchiveDate(today);
}

export function isValidDateStr(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(Date.parse(value));
}

/** 'YYYY-MM-DD' -> 'lundi 1 décembre 2026' */
export function formatDateFr(dateStr, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { ...options, timeZone: 'UTC' });
}

/**
 * Date du jour à Paris, qui se met à jour toute seule quand on passe minuit
 * (vérification périodique + au retour sur l'onglet / réveil du téléphone).
 */
export function useParisToday() {
  const [today, setToday] = useState(getParisToday);

  useEffect(() => {
    const check = () => {
      const now = getParisToday();
      setToday(prev => (prev === now ? prev : now));
    };

    const interval = setInterval(check, 15_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return today;
}
