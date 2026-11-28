/*
 * Même règle que core/pseudo.py (le serveur reste la référence) :
 * lettres (tous alphabets), chiffres, espace et - _ . ' ( )
 * => pas d'émojis ni de symboles, donc pas de faux badge ❤️ / 👑 dans un pseudo.
 */
export const PSEUDO_MAX_LENGTH = 30;
const ALLOWED = /^[\p{L}\p{M}\p{N} \-_.'’()]+$/u;
const HAS_ALNUM = /[\p{L}\p{N}]/u;

/** Renvoie { pseudo, error } : pseudo nettoyé si valide, sinon message d'erreur. */
export function validatePseudo(raw) {
  const pseudo = (raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!pseudo) return { pseudo: null, error: 'Le pseudo ne peut pas être vide.' };
  if (pseudo.length > PSEUDO_MAX_LENGTH) {
    return { pseudo: null, error: `Le pseudo est trop long (${PSEUDO_MAX_LENGTH} caractères max).` };
  }
  if (!ALLOWED.test(pseudo)) {
    return { pseudo: null, error: "Caractères autorisés : lettres, chiffres, espaces et - _ . ' ( )" };
  }
  if (!HAS_ALNUM.test(pseudo)) {
    return { pseudo: null, error: 'Le pseudo doit contenir au moins une lettre ou un chiffre.' };
  }
  return { pseudo, error: null };
}
