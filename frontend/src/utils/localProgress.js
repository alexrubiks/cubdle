import { API_URLS } from "../utils";

const STORAGE_PREFIX = "cubdle_progress";

const DEFAULT_PROGRESS = {
  cubeur_guesses: [],
  compet_guesses: [],
  ranking_guesses: [],
  podium_guesses: [],
  location_guess: {},

  cubeur_done: false,
  compet_done: false,
  ranking_done: false,
  podium_done: false,
  location_done: false,

  cubeur_latest_hint: null,
  compet_latest_hint: null,
  podium_latest_hint: {},

  pending_scores: {},
};

function getTodayParisDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function getStorageKey() {
  return `${STORAGE_PREFIX}_${getTodayParisDateString()}`;
}

function cleanupOldProgress() {
  const currentKey = getStorageKey();
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(`${STORAGE_PREFIX}_`) && key !== currentKey) {
      localStorage.removeItem(key);
    }
  });
}

export function loadProgress() {
  cleanupOldProgress();
  const saved = localStorage.getItem(getStorageKey());

  if (!saved) return structuredClone(DEFAULT_PROGRESS);

  try {
    return { ...structuredClone(DEFAULT_PROGRESS), ...JSON.parse(saved) };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress) {
  localStorage.setItem(getStorageKey(), JSON.stringify(progress));
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
  localStorage.removeItem(getStorageKey());
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

  fetch(API_URLS.dailyProgress, {
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
    const res = await fetch(API_URLS.dailyProgress, {
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

  for (const field of ["cubeur_guesses", "compet_guesses", "ranking_guesses", "podium_guesses"]) {
    merged[field] = (remote[field]?.length ?? 0) > (local[field]?.length ?? 0)
      ? remote[field]
      : local[field];
  }

  merged.location_guess = Object.keys(local.location_guess || {}).length
    ? local.location_guess
    : remote.location_guess;

  for (const field of ["cubeur_done", "compet_done", "ranking_done", "podium_done", "location_done"]) {
    merged[field] = local[field] || remote[field];
  }

  const hintFields = [
    "cubeur_latest_hint",
    "compet_latest_hint",
    "podium_latest_hint",
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
    const res = await fetch(API_URLS.progressSync, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ local_progress: local }),
    });
    if (!res.ok) return local;

    const merged = await res.json();
    saveProgress(merged);
    return merged;
  } catch {
    return local;
  }
}

// ── Scores : logique de retry inchangée, mais découplée du progress ──

export async function submitScore(game, score) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    markPendingScore(game, score);
    return;
  }

  try {
    const ok = await postScore(game, score);
    if (ok) clearPendingScore(game);
    else markPendingScore(game, score);
  } catch {
    markPendingScore(game, score);
  }
}

function markPendingScore(game, score) {
  const progress = loadProgress();
  progress.pending_scores = progress.pending_scores || {};
  progress.pending_scores[game] = score;
  saveProgress(progress);
}

function clearPendingScore(game) {
  const progress = loadProgress();
  if (progress.pending_scores) delete progress.pending_scores[game];
  saveProgress(progress);
}

async function postScore(game, score) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(API_URLS.scoresSubmit, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ game, score }),
  });
  return res.ok;
}

export async function flushPendingScores() {
  const progress = loadProgress();
  const pending = progress.pending_scores || {};
  for (const [game, score] of Object.entries(pending)) {
    const ok = await postScore(game, score);
    if (ok) clearPendingScore(game);
  }
}