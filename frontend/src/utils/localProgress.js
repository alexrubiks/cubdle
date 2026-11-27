import { API_URLS } from "../utils";
import { getParisToday } from "./dates";

const STORAGE_PREFIX = "cubdle_progress";

const DEFAULT_PROGRESS = {
  cubeur_guesses: [],
  compet_guesses: [],
  ranking_guesses: [],
  podium_guesses: [],
  nr_guesses: [],
  location_guess: {},

  cubeur_done: false,
  compet_done: false,
  ranking_done: false,
  podium_done: false,
  location_done: false,
  nr_done: false,

  cubeur_latest_hint: null,
  compet_latest_hint: null,
  podium_latest_hint: {},

  pending_scores: {},
};

// ── Date "active" ──
// Toutes les fonctions de ce module lisent/écrivent la progression du défi
// de la date active. Par défaut : aujourd'hui (Paris). Les pages de jeu
// l'imposent via <GameRoute date=...> (jour courant ou archive).
let activeDate = null;

export function setActiveDate(date) {
  activeDate = date;
}

export function getActiveDate() {
  return activeDate ?? getParisToday();
}

export function isArchiveDate(date = getActiveDate()) {
  return date !== getParisToday();
}

/** Ajoute ?date=<date active> à une URL d'API. */
export function withDate(url, date = getActiveDate()) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}date=${date}`;
}

function getStorageKey(date = getActiveDate()) {
  return `${STORAGE_PREFIX}_${date}`;
}

// On garde la progression des MAX_STORED_DAYS derniers jours joués
// (aujourd'hui + archives, pour le calendrier), jamais celle du jour actif.
const MAX_STORED_DAYS = 150;

/** Jeux terminés par date, d'après la progression locale : {date: [slugs]}. */
export function getLocalDoneByDate() {
  const result = {};
  for (const key of getStoredDayKeys()) {
    const date = key.slice(STORAGE_PREFIX.length + 1);
    const progress = loadProgress(date);
    result[date] = ["cubeur", "compet", "ranking", "podium", "nr", "location"].filter((g) => progress[`${g}_done`]);
  }
  return result;
}

function getStoredDayKeys() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
    .sort();
}

function cleanupOldProgress() {
  const currentKey = getStorageKey();
  const todayKey = getStorageKey(getParisToday());
  const keys = getStoredDayKeys();
  keys.slice(0, Math.max(0, keys.length - MAX_STORED_DAYS)).forEach((key) => {
    if (key !== currentKey && key !== todayKey) localStorage.removeItem(key);
  });
}

export function loadProgress(date = getActiveDate()) {
  cleanupOldProgress();
  const saved = localStorage.getItem(getStorageKey(date));

  if (!saved) return structuredClone(DEFAULT_PROGRESS);

  try {
    return { ...structuredClone(DEFAULT_PROGRESS), ...JSON.parse(saved) };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress, date = getActiveDate()) {
  localStorage.setItem(getStorageKey(date), JSON.stringify(progress));
}

export function addGuess(field, value) {
  const progress = loadProgress();
  progress[field].unshift(value);
  saveProgress(progress);
  pushProgress(progress); // best-effort, fire-and-forget
  return progress;
}

export function saveDone(field) {
  const progress = loadProgress();
  progress[field] = true;
  saveProgress(progress);
  pushProgress(progress);
  return progress;
}

export function getGuesses(field) {
  return loadProgress()[field];
}

export function getDone(field) {
  return loadProgress()[field];
}

export function setLocationGuess(latitude, longitude) {
  const progress = loadProgress();
  progress.location_guess = { latitude, longitude };
  saveProgress(progress);
  pushProgress(progress);
  return progress;
}

export function saveGuess(field, value) {
  const progress = loadProgress();
  progress[field] = value;
  saveProgress(progress);
  pushProgress(progress);
}

export function resetProgress() {
  getStoredDayKeys().forEach((key) => localStorage.removeItem(key));
}

export function saveLatestHint(field, hint) {
  const progress = loadProgress();
  progress[`${field}_latest_hint`] = hint;
  saveProgress(progress);
  pushProgress(progress);
}

export function getLatestHint(field) {
  return loadProgress()[`${field}_latest_hint`] ?? null;
}

// ── Synchro serveur : explicite, jamais implicite dans les getters ──

function pushProgress(progress) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  fetch(withDate(API_URLS.dailyProgress), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(progress),
  }).catch(() => {}); // best-effort, le cache local reste la vérité affichée
}

// À appeler explicitement au montage d'une page de jeu si connecté,
// pour récupérer un état joué sur un autre appareil.
export async function refreshFromServer() {
  const token = localStorage.getItem("access_token");
  if (!token) return loadProgress();

  try {
    const res = await fetch(withDate(API_URLS.dailyProgress), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return loadProgress();

    const remote = await res.json();
    const local = loadProgress();
    const merged = mergeProgress(local, remote);
    saveProgress(merged);
    return merged;
  } catch {
    return loadProgress(); // offline : on reste sur le cache local
  }
}


function mergeProgress(local, remote) {
  const merged = { ...local };

  for (const field of ["cubeur_guesses", "compet_guesses", "ranking_guesses", "podium_guesses", "nr_guesses"]) {
    merged[field] = (remote[field]?.length ?? 0) > (local[field]?.length ?? 0)
      ? remote[field]
      : local[field];
  }

  merged.location_guess = Object.keys(local.location_guess || {}).length
    ? local.location_guess
    : remote.location_guess;

  for (const field of ["cubeur_done", "compet_done", "ranking_done", "podium_done", "location_done", "nr_done"]) {
    merged[field] = local[field] || remote[field];
  }

  const hintFields = [
    "cubeur_latest_hint",
    "compet_latest_hint",
    "podium_latest_hint",
    "nr_latest_hint",
  ];

  for (const field of hintFields) {
    const localValue = local[field];

    if (
      localValue &&
      (
        typeof localValue !== "object" ||
        Object.keys(localValue).length > 0
      )
    ) {
      merged[field] = localValue;
    } else {
      merged[field] = remote[field] ?? DEFAULT_PROGRESS[field];
    }
  }

  return merged;
}

// À appeler explicitement dans AuthCallback juste après avoir stocké le token.
export async function syncOnLogin() {
  const local = loadProgress();
  const token = localStorage.getItem("access_token");
  if (!token) return local;

  try {
    const res = await fetch(withDate(API_URLS.progressSync), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ local_progress: local }),
    });
    if (!res.ok) return local;

    const merged = await res.json();
    saveProgress(merged);
    await flushPendingScores();
    return merged;
  } catch {
    return local;
  }
}

// ── Scores : logique de retry inchangée, mais découplée du progress ──

export async function submitScore(game, score, date = getActiveDate()) {
  if (score === undefined || score === null) {
    console.error(`submitScore("${game}") called with invalid score:`, score);
    return;
  }

  const token = localStorage.getItem("access_token");

  if (!token) {
    markPendingScore(game, score, date);
    return;
  }

  try {
    const status = await postScore(game, score, date);
    if (status === "retry") markPendingScore(game, score, date);
    else clearPendingScore(game, date);
  } catch {
    markPendingScore(game, score, date);
  }
}

function markPendingScore(game, score, date) {
  const progress = loadProgress(date);
  progress.pending_scores = progress.pending_scores || {};
  progress.pending_scores[game] = score;
  saveProgress(progress, date);
}

function clearPendingScore(game, date) {
  const progress = loadProgress(date);
  if (progress.pending_scores) delete progress.pending_scores[game];
  saveProgress(progress, date);
}

/**
 * Renvoie "ok", "drop" (refus définitif : jour non accessible, données
 * invalides… → inutile de réessayer) ou "retry" (réseau, 5xx, 401).
 */
async function postScore(game, score, date) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(API_URLS.scoresSubmit, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ game, score, date }),
  });
  if (res.ok) return "ok";
  if ([400, 403, 404].includes(res.status)) return "drop";
  return "retry";
}

/** Renvoie les scores en attente, pour tous les jours stockés. */
export async function flushPendingScores() {
  if (!localStorage.getItem("access_token")) return;

  for (const key of getStoredDayKeys()) {
    const date = key.slice(STORAGE_PREFIX.length + 1);
    const pending = loadProgress(date).pending_scores || {};

    for (const [game, score] of Object.entries(pending)) {
      try {
        const status = await postScore(game, score, date);
        if (status !== "retry") clearPendingScore(game, date);
      } catch {
        // réseau : on réessaiera plus tard
      }
    }
  }
}
