const API_BASE = 'http://localhost:8000/api/';

// const API_BASE = "https://api.cubdle.alexrubiks.fr";

export const API_URLS = {
  guessCubeur: `${API_BASE}guess/cubeur/`,
  guessRanking: `${API_BASE}guess/ranking/`,
  guessPodium: `${API_BASE}guess/podium/`,
  guessLocation: `${API_BASE}guess/location/`,
  guessCompet: `${API_BASE}guess/competition/`,
  cubeurs: `${API_BASE}cubeurs/`,
  competitions: `${API_BASE}competitions/`,
  daily: `${API_BASE}daily/`,
  yesterday: `${API_BASE}yesterday/`,
};

export const EVENTS_SINGLE = new Set(['333bf', '444bf', '555bf', '333mbf']);

export const EVENTS_ORDER = [
  '333', '222', '444', '555', '666', '777',
  '333bf', '333fm', '333oh', 'clock', 'minx',
  'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf',
];

export const EVENT_LABEL = {
  '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5',
  '666': '6x6', '777': '7x7', '333bf': '3BLD', '333fm': 'FMC',
  '333oh': 'OH', 'clock': 'Clock', 'minx': 'Mega', 'pyram': 'Pyra',
  'skewb': 'Skewb', 'sq1': 'SQ1', '444bf': '4BLD', '555bf': '5BLD',
  '333mbf': 'MBLD',
};

export function compareList(userList, targetList) {
  if (!userList?.length && !targetList?.length) return 'tile-correct';
  if (!userList?.length || !targetList?.length)  return 'tile-wrong';

  const userSet   = new Set(userList.map(s => s.trim().toLowerCase()));
  const targetSet = new Set(targetList.map(s => s.trim().toLowerCase()));

  if (
    userSet.size === targetSet.size &&
    [...userSet].every(v => targetSet.has(v))
  ) return 'tile-correct';

  const hasCommon = [...userSet].some(v => targetSet.has(v));
  return hasCommon ? 'tile-partial' : 'tile-wrong';
}


export function compareMonth(userMonth, targetMonth) {
  return compareList(
    userMonth?.split('-'),
    targetMonth?.split('-'),
  );
}


export function compareValues(userValue, targetValue, isYear = false) {
  const emptyUser   = userValue  === null || userValue  === undefined || userValue  === '';
  const emptyTarget = targetValue === null || targetValue === undefined || targetValue === '';

  if (emptyUser !== emptyTarget) return 'tile-wrong';
  if (userValue === targetValue)  return 'tile-correct';

  const u = Number(userValue);
  const t = Number(targetValue);

  if (Number.isNaN(u) || Number.isNaN(t)) return 'tile-wrong';

  const diff      = Math.abs(u - t);
  const threshold = isYear ? 1 : 5;

  if (diff <= threshold) return 'tile-near';
  return 'tile-partial';
}


// valeur normale : plus grand = flèche haut
export function getDirection(userValue, targetValue) {
  const u = Number(userValue);
  const t = Number(targetValue);
  if (Number.isNaN(u) || Number.isNaN(t)) return null;
  if (u === t) return null;
  return t > u ? 'up' : 'down';
}

// classement : plus petit = meilleur = flèche haut
export function getRankingDirection(userValue, targetValue) {
  const u = Number(userValue);
  const t = Number(targetValue);
  if (Number.isNaN(u) || Number.isNaN(t)) return null;
  if (userValue === null || targetValue === null) return null;
  if (u === t) return null;
  return t < u ? 'up' : 'down';
}