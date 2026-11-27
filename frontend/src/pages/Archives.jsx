import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import CornerRibbon from '../components/ui/CornerRibbon';
import { loadProgress } from '../utils/localProgress';
import { doneLabel } from '../utils/scoreLabels';
import CubdleLogo from '../components/ui/CubdleLogo';
import { API_URLS } from '../utils';
import { ARCHIVE_START, ARCHIVE_DELAY_DAYS, addDays, formatDateFr, getLastArchiveDate, getParisToday } from '../utils/dates';
import { archiveGames, archivePath } from '../utils/games';
import { getLocalDoneByDate } from '../utils/localProgress';

/*
 * Anciens défis : calendrier continu (une ligne = une semaine), scrollable,
 * du 1er août 2026 jusqu'à la semaine du premier jour pas encore disponible.
 * Couleur d'une case : rouge = rien fait, orange = au moins un jeu,
 * jaune = il en manque un, vert = tout fait, gris + cadenas = pas encore disponible.
 * Les parties jouées ici sont "en décalé" : hors classement.
 */

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_SHORT = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

function weekdayIndex(date) {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // lundi = 0
}

/** Semaines (lundi -> dimanche) du lundi de `start` au dimanche de `end`. */
function buildWeeks(start, end) {
  const weeks = [];
  let day = addDays(start, -weekdayIndex(start));
  const last = addDays(end, 6 - weekdayIndex(end));
  while (day <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
    day = addDays(day, 7);
  }
  return weeks;
}

function cellColor(done, total) {
  if (done >= total) return 'bg-cubdle-green';
  if (done === total - 1) return 'bg-cubdle-yellow';
  if (done > 0) return 'bg-cubdle-orange';
  return 'bg-cubdle-red';
}

export default function Archives() {
  const today = getParisToday();
  const lastPlayable = getLastArchiveDate(today);
  // On s'arrête à la fin de la semaine du premier jour pas encore disponible
  const weeks = useMemo(() => buildWeeks(ARCHIVE_START, addDays(lastPlayable, 1)), [lastPlayable]);

  const [selected, setSelected] = useState(lastPlayable);
  const [doneByDate, setDoneByDate] = useState(() => getLocalDoneByDate());
  const scrollRef = useRef(null);

  // On arrive en bas du calendrier (les jours les plus récents)
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Joueur connecté : on complète avec la progression enregistrée sur le serveur
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(API_URLS.progressSummary, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((server) => {
        setDoneByDate((local) => {
          const merged = { ...local };
          for (const [date, games] of Object.entries(server)) {
            merged[date] = [...new Set([...(merged[date] ?? []), ...games])];
          }
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  const isPlayable = (d) => d >= ARCHIVE_START && d <= lastPlayable;
  const selectedGames = archiveGames(selected);

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="w-full max-w-md flex flex-col gap-4">
        <Link to="/" className="mx-auto flex items-center justify-center py-2 transition-transform hover:scale-105 active:scale-95">
          <CubdleLogo className="text-[4em] md:text-[5em]" />
        </Link>

        <div className="text-center">
          <h1 className="font-title font-extrabold text-2xl text-white uppercase">Anciens défis</h1>
          <p className="font-body text-sm text-white/70 mt-1">
            Les défis deviennent rejouables {ARCHIVE_DELAY_DAYS} jours après leur date, hors classement.
          </p>
        </div>

        {/* ── CALENDRIER (continu, scrollable) ── */}
        <div className="rounded-2xl border-4 border-black bg-[#FDFBD4] px-3 pb-3">
          <div className="grid grid-cols-[2.75rem_repeat(7,1fr)] gap-1.5 border-b-2 border-black/10 py-2 text-center font-body text-[0.6875rem] font-bold text-black/40">
            <div />
            {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
          </div>

          <div ref={scrollRef} className="max-h-[min(55vh,420px)] overflow-y-auto px-1 pt-2 pb-3">
            <div className="flex flex-col gap-1.5">
              {weeks.map((week) => {
                // Libellé du mois sur la ligne qui contient le 1er du mois
                const first = week.find((d) => d.endsWith('-01') && d >= ARCHIVE_START);
                return (
                  <div key={week[0]} className="grid grid-cols-[2.75rem_repeat(7,1fr)] items-center gap-1.5">
                    <span className="font-title text-[0.625rem] font-extrabold text-black/50">
                      {first ? MONTHS_SHORT[Number(first.slice(5, 7)) - 1] : ''}
                    </span>

                    {week.map((d) => {
                      if (d < ARCHIVE_START) return <div key={d} />;

                      const label = formatDateFr(d, { weekday: 'long', day: 'numeric', month: 'long' });
                      if (!isPlayable(d)) {
                        return (
                          <div
                            key={d}
                            title={`${label} — disponible le ${formatDateFr(addDays(d, ARCHIVE_DELAY_DAYS), { day: 'numeric', month: 'long' })}`}
                            className="mx-auto flex aspect-square w-[88%] items-center justify-center rounded-md bg-black/10 text-black/30"
                          >
                            <Lock size={12} strokeWidth={2.5} />
                          </div>
                        );
                      }

                      const games = archiveGames(d);
                      const done = games.filter((g) => doneByDate[d]?.includes(g.slug)).length;
                      return (
                        <button
                          key={d}
                          onClick={() => setSelected(d)}
                          title={`${label} — ${done}/${games.length} jeux terminés`}
                          className={`mx-auto aspect-square w-[88%] rounded-md transition-transform hover:scale-110
                            ${cellColor(done, games.length)}
                            ${d === selected ? 'scale-110 ring-2 ring-black ring-offset-2 ring-offset-[#FDFBD4]' : ''}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── JEUX DU JOUR SÉLECTIONNÉ ── */}
        {isPlayable(selected) && (
          <div className="flex flex-col gap-2">
            <h2 className="text-center font-body font-bold text-white first-letter:uppercase">
              {formatDateFr(selected)}
            </h2>
            {selectedGames.map((g) => {
              const done = doneByDate[selected]?.includes(g.slug);
              // Score depuis la progression locale ; à défaut (terminé sur un autre appareil) : "TERMINÉ"
              const ribbon = done ? doneLabel(g.slug, loadProgress(selected), selected) ?? 'TERMINÉ' : null;
              return (
                <Link
                  key={g.slug}
                  to={archivePath(selected, g.slug)}
                  className={`relative overflow-hidden flex items-center gap-3 rounded-xl border-4 border-black ${g.color} px-3 py-2 transition-transform hover:scale-[1.02] active:scale-95`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white">
                    <img src={g.icon} alt="" className="h-6 w-6" />
                  </span>
                  <span className="flex-1 font-title font-extrabold text-sm">
                    {g.prefix.toUpperCase()} {g.title}
                  </span>
                  <CornerRibbon label={ribbon} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
