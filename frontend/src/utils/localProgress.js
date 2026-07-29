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
};


function getTodayParisDateString() {
  // Renvoie YYYY-MM-DD en heure de Paris, peu importe le fuseau du navigateur
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // en-CA donne directement le format YYYY-MM-DD
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

  if (!saved) {
    return structuredClone(DEFAULT_PROGRESS);
  }

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}


export function saveProgress(progress) {
  localStorage.setItem(
    getStorageKey(),
    JSON.stringify(progress)
  );
}


export function addGuess(field, value) {
  const progress = loadProgress();

  progress[field].unshift(value);

  saveProgress(progress);

  return progress;
}


export function saveDone(field) {
  const progress = loadProgress();

  progress[field] = true;

  saveProgress(progress);

  return progress;
}


export function getGuesses(field) {
  const progress = loadProgress();

  return progress[field];
}


export function getDone(field) {
  const progress = loadProgress();

  return progress[field];
}


export function setLocationGuess(latitude, longitude) {
  const progress = loadProgress();

  progress.location_guess = {
    latitude,
    longitude,
  };

  saveProgress(progress);

  return progress;
}

export function saveGuess(field, value) {
  const progress = loadProgress();

  progress[field] = value;

  saveProgress(progress);
}

export function resetProgress() {
  localStorage.removeItem(getStorageKey());
}

export function saveLatestHint(field, hint) {
  const progress = loadProgress();
  progress[`${field}_latest_hint`] = hint;
  saveProgress(progress);
}

export function getLatestHint(field) {
  const progress = loadProgress();
  return progress[`${field}_latest_hint`] ?? null;
}