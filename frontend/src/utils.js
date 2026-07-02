const API_BASE = 'http://localhost:8000/api';

// const API_BASE = "https://api.cubdle.alexrubiks.fr";

export const API_URLS = {
  guessCubeur: `${API_BASE}/guess/cubeur/`,
  guessRanking: `${API_BASE}/guess/ranking/`,
  guessPodium: `${API_BASE}/guess/podium/`,
  guessLocation: `${API_BASE}/guess/location/`,
  guessCompet: `${API_BASE}/guess/competition/`,
  cubeurs: `${API_BASE}/cubeurs/`,
  competitions: `${API_BASE}/competitions/`,
  daily: `${API_BASE}/daily/`,
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