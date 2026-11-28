"""
Validation des pseudos.

Liste blanche : lettres (tous alphabets, accents compris), chiffres, espace et - _ . ' ( )
=> pas d'émojis ni de symboles, donc impossible d'imiter le badge ❤️ des soutiens
(ou la couronne 👑) dans son pseudo. Même règle côté front (frontend/src/utils/pseudo.js).
"""
import re
import unicodedata

PSEUDO_MAX_LENGTH = 30
ALLOWED_PUNCTUATION = set(" -_.'’()")
ALLOWED_HELP = "lettres, chiffres, espaces et - _ . ' ( )"


def validate_pseudo(raw):
    """Renvoie (pseudo_nettoyé, None) si valide, (None, message d'erreur) sinon."""
    pseudo = unicodedata.normalize("NFC", raw or "")
    pseudo = re.sub(r"\s+", " ", pseudo).strip()

    if not pseudo:
        return None, "Le pseudo ne peut pas être vide."

    if len(pseudo) > PSEUDO_MAX_LENGTH:
        return None, f"Le pseudo est trop long ({PSEUDO_MAX_LENGTH} caractères max)."

    if any(not (c.isalnum() or c in ALLOWED_PUNCTUATION) for c in pseudo):
        return None, f"Caractères autorisés : {ALLOWED_HELP}."

    if not any(c.isalnum() for c in pseudo):
        return None, "Le pseudo doit contenir au moins une lettre ou un chiffre."

    return pseudo, None
