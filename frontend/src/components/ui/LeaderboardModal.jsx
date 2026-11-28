import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Trophy, Lock, ChevronLeft, ChevronRight, History, Coins } from 'lucide-react';
import { API_URLS } from '../../utils';
import { isLaunched, getParisToday, addDays, formatDateFr, ARCHIVE_START } from '../../utils/dates';
import { loadProgress } from '../../utils/localProgress';
import LeaderboardModalLegacy from './LeaderboardModalLegacy';
import SupporterBadge from './SupporterBadge';
import { useArchiveDate } from '../../utils/archiveContext';

/*
 * Classements : par jeu (avec rang et points) et général (jour / semaine / mois).
 * - On peut naviguer dans les jours passés (pas dans le futur).
 * - Le jour même, le classement d'un jeu est verrouillé tant qu'on n'y a pas joué.
 * - Options en icônes (mémorisées) : points par jeu, joueurs en décalé
 *   (intercalés selon leur score, en opacité réduite et sans rang).
 * Calcul des points : voir core/leaderboards.py.
 */

const GAMES = [
  {
    slug: "cubeur",
    color: "bg-cubdle-red",
    label: "Cubeur",
    shortLabel: "Cubeur",
    to: "/cubeur",
    unit: "essais",
    scoreLabels: { 1: "COUP DE BOL", 2: "PERFECT" },
  },
  {
    slug: "compet",
    color: "bg-cubdle-orange",
    label: "Compétition",
    shortLabel: "Compet",
    to: "/competition",
    unit: "essais",
    scoreLabels: { 1: "COUP DE BOL", 2: "PERFECT" },
  },
  {
    slug: "ranking",
    color: "bg-cubdle-yellow",
    label: "Classement",
    shortLabel: "Classmt",
    to: "/ranking",
    unit: "essais",
    scoreLabels: { 1: "PERFECT" },
  },
  {
    slug: "podium",
    color: "bg-cubdle-green",
    label: "Podium",
    shortLabel: "Podium",
    to: "/podium",
    unit: "erreur",
    scoreLabels: { 0: "PERFECT" },
  },
  {
    slug: "nr",
    color: "bg-cubdle-blue",
    label: "NR",
    shortLabel: "NR",
    to: "/nr",
    unit: "essais",
    scoreLabels: { 1: "PERFECT" },
    launchOnly: true,
  },
  {
    slug: "location",
    color: "bg-cubdle-purple",
    label: "Localisation",
    shortLabel: "Local",
    to: "/location",
    unit: "",
    scoreLabels: { 5000: "PERFECT" },
  },
];

const PERIODS = [
  { slug: "day", label: "Jour" },
  { slug: "week", label: "Semaine" },
  { slug: "month", label: "Mois" },
];

const GENERAL = "general";

/** Jeux existant à cette date (le NR n'existe qu'à partir du lancement). */
function getGames(date) {
  return GAMES.filter((g) => !g.launchOnly || isLaunched(date));
}

function formatScore(score, game, date) {
  // Maj de décembre : le classement se joue en un seul essai, score = écart de rangs
  if (game.slug === "ranking" && isLaunched(date)) {
    return score === 0 ? "PERFECT" : `${score} d'écart`;
  }
  if (game.scoreLabels?.[score]) return game.scoreLabels[score];
  if (game.slug === "podium") return `${score} ${score > 1 ? "erreurs" : "erreur"}`;
  return `${score} ${game.unit}`.trim();
}

function scoreColor(label) {
  if (label === "PERFECT") return "text-green-500";
  if (label === "COUP DE BOL") return "text-yellow-500";
  return "text-sky-500";
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Lundi de la semaine qui contient `date`. */
function weekStart(date) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

function addMonths(date, n) {
  const [y, m] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
}

function monthEnd(date) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Bornes de la période qui contient `date`. */
function periodBounds(period, date) {
  if (period === "week") {
    const start = weekStart(date);
    return [start, addDays(start, 6)];
  }
  if (period === "month") return [`${date.slice(0, 7)}-01`, monthEnd(date)];
  return [date, date];
}

function shortDate(date) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Libellé du sélecteur : Aujourd'hui / Hier / dim. 15 nov. — Cette semaine / 16/11 – 22/11 — Novembre. */
function periodLabel(period, date, today) {
  const [start, end] = periodBounds(period, date);
  const current = start <= today && today <= end;
  if (period === "week") return current ? "Cette semaine" : `${shortDate(start)} – ${shortDate(end)}`;
  if (period === "month") {
    const name = MONTHS[Number(date.slice(5, 7)) - 1];
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return date.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${date.slice(0, 4)}`;
  }
  if (date === today) return "Aujourd'hui";
  if (date === addDays(today, -1)) return "Hier";
  return formatDateFr(date, { weekday: "short", day: "numeric", month: "short" });
}


function readPref(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // stockage indisponible : la préférence ne sera pas mémorisée
  }
}

/**
 * Icône on/off : grisée si désactivée, pleine opacité si activée.
 * Survol (PC) : info-bulle. Appui long (mobile) ou clic droit : explication.
 */
function IconToggle({ icon: Icon, active, onToggle, help, onHelp }) {
  const timer = useRef(null);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onHelp(help);
    }, 500);
  };
  const cancelPress = () => clearTimeout(timer.current);

  return (
    <button
      type="button"
      title={help}
      aria-label={help}
      aria-pressed={active}
      onClick={() => {
        if (longPressed.current) return; // l'appui long ne bascule pas
        onToggle();
      }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onHelp(help);
      }}
      className={`flex h-7 w-7 items-center justify-center transition-opacity select-none
        ${active ? "opacity-100" : "opacity-30 hover:opacity-55"}`}
    >
      <Icon size={20} strokeWidth={2.5} />
    </button>
  );
}

function TabButton({ active, onClick, children, locked }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center gap-1
        px-3 py-2 max-[425px]:px-2 max-[425px]:py-1.5
        rounded-xl border-2 border-black
        font-title font-bold text-sm max-[425px]:text-xs
        transition-colors
        ${active ? "bg-cubdle-yellow" : "bg-white hover:bg-cubdle-yellow/20"}
      `}
    >
      {locked && <Lock size={12} strokeWidth={3} className="shrink-0" />}
      {children}
    </button>
  );
}

/** 👑 Gagnant de la semaine dernière : clic = petit texte d'explication. */
function CrownBadge() {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setOpen(false), 2000);
        }}
        aria-label="Gagnant de la semaine dernière"
        className="leading-none transition-transform hover:scale-110"
      >
        👑
      </button>
      {open && (
        <span className="absolute left-[calc(100%+6px)] top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-lg bg-black px-2 py-1 font-body text-[0.6875rem] font-bold text-white">
          Gagnant de la semaine dernière
        </span>
      )}
    </span>
  );
}

function Row({ rank, pseudo, right, sub, isMe, faded, crowned, supporter }) {
  return (
    <div
      className={`
        flex items-center justify-between gap-3
        px-4 py-2 mb-2 max-[425px]:px-3
        rounded-lg font-body text-base
        ${isMe ? "bg-cubdle-yellow/50 ring-2 ring-black" : "bg-black/5"}
        ${faded ? "opacity-45" : ""}
      `}
    >
      <div className="flex items-center gap-3 max-[425px]:gap-2 min-w-0">
        <span className="font-title font-extrabold w-6 text-center shrink-0 max-[425px]:text-xs">
          {rank ?? "–"}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-1 min-w-0 font-bold max-[425px]:text-xs">
            {crowned && <CrownBadge />}
            <span className="truncate">{pseudo}</span>
            {supporter && <SupporterBadge />}
          </span>
          {sub && (typeof sub === "string"
            ? <span className="text-xs text-black/50 truncate max-[425px]:text-[0.625rem]">{sub}</span>
            : sub)}
        </div>
      </div>
      <div className="shrink-0 text-right">{right}</div>
    </div>
  );
}

/** Nouvelle modale à partir du lancement (1er décembre), ancienne avant. */
export default function LeaderboardModal(props) {
  return isLaunched() ? <LeaderboardModalV2 {...props} /> : <LeaderboardModalLegacy {...props} />;
}

function LeaderboardModalV2({ onClose, initialGame = GENERAL }) {
  const today = getParisToday();
  // Ouvert depuis un jeu en archive : on affiche directement le jour du défi
  const archiveDate = useArchiveDate();
  // Date de référence : jour affiché, ou un jour de la semaine / du mois affiché
  const [date, setDate] = useState(archiveDate ?? today);
  const [activeTab, setActiveTab] = useState(initialGame);
  const [period, setPeriod] = useState("day");
  const [showLate, setShowLate] = useState(() => readPref("cubdle_lb_late"));
  const [showPoints, setShowPoints] = useState(() => readPref("cubdle_lb_points"));
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const showFlash = (text) => {
    setFlash(text);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2000);
  };

  const toggleLate = () => {
    const next = !showLate;
    setShowLate(next);
    writePref("cubdle_lb_late", next);
    showFlash(next ? "Joueurs en décalé affichés" : "Joueurs en décalé masqués");
  };

  const togglePoints = () => {
    const next = !showPoints;
    setShowPoints(next);
    writePref("cubdle_lb_points", next);
    showFlash(next ? "Points affichés" : "Points masqués");
  };

  const games = getGames(date);
  const isToday = date === today;
  const todayProgress = loadProgress(today);
  const [periodStart, periodEnd] = periodBounds(period, date);
  const provisional = periodEnd >= today;

  // Seul le classement "Jour" d'aujourd'hui d'un jeu pas encore joué est verrouillé
  const isLocked = (slug) => period === "day" && isToday && !todayProgress[`${slug}_done`];

  // Si le jeu actif n'existe pas à cette date (NR avant le lancement), retour au général
  const currentGame = games.find((g) => g.slug === activeTab);
  const tab = activeTab === GENERAL || currentGame ? activeTab : GENERAL;
  const locked = tab !== GENERAL && isLocked(tab);

  // Classement d'un jeu sur un jour (scores) ; sinon somme des points (général ou un jeu)
  const isDayGame = tab !== GENERAL && period === "day";
  const pointsMode = !isDayGame;

  const step = (direction) => {
    let next;
    if (period === "week") next = addDays(date, 7 * direction);
    else if (period === "month") next = addMonths(date, direction);
    else next = addDays(date, direction);
    if (next > today) next = today;
    if (next < ARCHIVE_START) next = ARCHIVE_START;
    setDate(next);
  };

  useEffect(() => {
    if (locked) return;

    const url = isDayGame
      ? `${API_URLS.leaderboard}?game=${tab}&date=${date}${showLate && date !== today ? "&include_late=1" : ""}`
      : `${API_URLS.leaderboardGeneral}?period=${period}&date=${date}${tab !== GENERAL ? `&game=${tab}` : ""}`;
    const key = `${tab}|${period}`;

    const controller = new AbortController();
    setLoading(true);
    fetch(url, { headers: authHeaders(), signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setData({ key, json }))
      .catch((err) => {
        if (err.name !== "AbortError") setData({ key, json: null });
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tab, date, period, showLate, locked, today, isDayGame]);

  // On n'affiche que des données correspondant à l'onglet et à la période courants
  const json = data?.key === `${tab}|${period}` ? data.json : null;
  const pointRows = pointsMode ? json?.rows ?? [] : [];
  const gameRows = isDayGame && Array.isArray(json) ? json : [];
  const isEmpty = pointsMode ? pointRows.length === 0 : gameRows.length === 0;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 px-5 py-5" onMouseDown={onClose}>
      <div
        className="
          relative mx-auto flex h-full w-full max-w-md flex-col
          rounded-2xl border-4 border-black bg-[#FDFBD4]
          p-6 max-[425px]:p-4
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 max-[425px]:h-7 max-[425px]:w-7 items-center justify-center rounded-full hover:bg-black/5"
        >
          <X size={18} strokeWidth={3} className="max-[425px]:w-[15px] max-[425px]:h-[15px]" />
        </button>

        {/* TITLE */}
        <div className="mt-4 mb-5 max-[425px]:mt-2 max-[425px]:mb-3 flex items-center justify-center gap-2">
          <Trophy size={32} strokeWidth={3} className="fill-cubdle-yellow max-[425px]:w-6 max-[425px]:h-6" />
          <h2 className="font-title font-extrabold uppercase text-[clamp(12px,calc(8vw_-_13.6px),24px)]">
            Classements
          </h2>
        </div>

        {/* TABS */}
        <div className="flex flex-col gap-2 max-[425px]:gap-1.5">
          <TabButton active={tab === GENERAL} onClick={() => setActiveTab(GENERAL)}>
            Général
          </TabButton>

          {[games.slice(0, 3), games.slice(3)].map((line, i) => (
            <div key={i} className={`grid ${line.length > 2 ? "grid-cols-3" : "grid-cols-2"} gap-2 max-[425px]:gap-1.5`}>
              {line.map((g) => (
                <TabButton
                  key={g.slug}
                  active={tab === g.slug}
                  onClick={() => setActiveTab(g.slug)}
                  locked={isLocked(g.slug)}
                >
                  <span className="max-[425px]:hidden">{g.label}</span>
                  <span className="hidden max-[425px]:inline">{g.shortLabel}</span>
                </TabButton>
              ))}
            </div>
          ))}
        </div>

        {/* PÉRIODE + SÉLECTEUR (communs à tous les onglets) */}
        <div className="mt-4 max-[425px]:mt-3 flex flex-col items-center gap-2">
          <div className="flex rounded-xl border-2 border-black overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.slug}
                onClick={() => setPeriod(p.slug)}
                className={`px-4 py-1 max-[425px]:px-3 font-body font-bold text-xs border-r-2 border-black last:border-r-0
                  ${period === p.slug ? "bg-black text-white" : "bg-white hover:bg-cubdle-yellow/20"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => step(-1)}
              disabled={periodStart <= ARCHIVE_START}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white hover:bg-cubdle-yellow/30 disabled:opacity-30 disabled:hover:bg-white"
              title="Période précédente"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <div className="flex min-w-[10rem] flex-col items-center">
              <span className="font-body font-bold text-sm text-center first-letter:uppercase">
                {periodLabel(period, date, today)}
              </span>
              {provisional && (
                <span className="font-body text-[0.625rem] uppercase tracking-wide text-black/40">provisoire</span>
              )}
            </div>
            <button
              onClick={() => step(1)}
              disabled={provisional}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white hover:bg-cubdle-yellow/30 disabled:opacity-30 disabled:hover:bg-white"
              title="Période suivante"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>

          {pointsMode && (
            <details className="w-full font-body text-xs text-black/60">
              <summary className="cursor-pointer text-center select-none">Comment sont calculés les points ?</summary>
              <p className="mt-2 text-center">
                Dans chaque jeu, tu marques entre 10 et 100 points selon le nombre de joueurs qui ont fait
                mieux que toi : 100 si personne n'a fait mieux, 10 si tout le monde a fait mieux, 0 si tu
                n'as pas joué. Les journées s'additionnent sur la semaine et le mois.
              </p>
            </details>
          )}
        </div>

        {/* OPTIONS (classement d'un jeu sur un jour) */}
        {isDayGame && !locked && (
          // Une seule ligne : message à gauche, icônes collées à droite
          <div className="mt-3 flex min-h-7 items-center gap-3">
            <span
              className={`flex-1 font-body text-xs leading-4 text-black/60 transition-opacity ${flash ? "opacity-100" : "opacity-0"}`}
            >
              {flash}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <IconToggle
                icon={Coins}
                active={showPoints}
                onToggle={togglePoints}
                onHelp={showFlash}
                help="Points gagnés dans ce jeu"
              />
              {!isToday && (
                <IconToggle
                  icon={History}
                  active={showLate}
                  onToggle={toggleLate}
                  onHelp={showFlash}
                  help="Joueurs en décalé (hors classement)"
                />
              )}
            </div>
          </div>
        )}

        {/* LISTE */}
        <div className="mt-4 max-[425px]:mt-3 flex-1 overflow-y-auto">
          {locked ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock size={28} strokeWidth={2.5} />
              <p className="font-body text-sm text-black/70">
                Termine le jeu du jour pour débloquer ce classement.
              </p>
              <Link
                to={currentGame.to}
                onClick={onClose}
                className="rounded-xl border-2 border-black bg-cubdle-yellow px-4 py-2 font-title font-bold text-sm transition-transform hover:scale-105"
              >
                Jouer
              </Link>
            </div>
          ) : loading && !json ? (
            <p className="font-body text-sm text-black/50 text-center py-4">Chargement...</p>
          ) : isEmpty ? (
            <p className="font-body text-sm text-black/50 text-center py-4">
              Aucun score enregistré {isToday && period === "day" ? "aujourd'hui" : "sur cette période"}.
            </p>
          ) : pointsMode ? (
            pointRows.map((row) => (
              <Row
                key={row.pseudo}
                rank={row.rank}
                pseudo={row.pseudo}
                isMe={row.is_me}
                crowned={row.crowned}
                supporter={row.is_supporter}
                sub={
                  period === "day"
                    ? (
                      // Général du jour : une pastille par jeu, à la couleur du jeu (vide si pas joué)
                      <div className="mt-1 flex gap-1">
                        {games.map((g) => (
                          <span
                            key={g.slug}
                            title={g.label}
                            className={`min-w-[1.75rem] rounded border border-black/60 px-1 text-center text-[0.625rem] font-bold leading-4 ${
                              row.games?.[g.slug] != null ? g.color : "bg-white/60 text-black/30"
                            }`}
                          >
                            {row.games?.[g.slug] ?? "–"}
                          </span>
                        ))}
                      </div>
                    )
                    : `${row.days_played} jour${row.days_played > 1 ? "s" : ""} joué${row.days_played > 1 ? "s" : ""}`
                }
                right={
                  <span className="font-title font-extrabold text-base max-[425px]:text-sm">
                    {row.points} <span className="font-body text-xs font-bold text-black/50">pts</span>
                  </span>
                }
              />
            ))
          ) : (
            gameRows.map((entry, index) => {
              const label = formatScore(entry.score, currentGame, date);
              return (
                <Row
                  key={index}
                  rank={entry.is_late ? null : entry.rank}
                  pseudo={entry.pseudo}
                  isMe={entry.is_me}
                  crowned={entry.crowned}
                  supporter={entry.is_supporter}
                  faded={entry.is_late}
                  right={
                    <div className="flex flex-col items-end">
                      <span className={`font-body font-bold text-base max-[425px]:text-xs ${scoreColor(label)}`}>
                        {label}
                      </span>
                      {showPoints && entry.points != null && (
                        <span className="font-body text-[0.6875rem] text-black/50">+{entry.points} pts</span>
                      )}
                    </div>
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
