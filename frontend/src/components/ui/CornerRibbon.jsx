/**
 * Bandeau en biais dans le coin supérieur droit (jeu terminé + score).
 * Blanc par défaut, vert pour un PERFECT, jaune pour un COUP DE BOL.
 * Son axe passe par le coin bas droit de la carte : symétrique autour de cette diagonale.
 * Le parent doit être en `relative overflow-hidden`.
 */
const RIBBON_BG = {
  'PERFECT': 'bg-cubdle-green',
  'COUP DE BOL': 'bg-cubdle-yellow',
};

export default function CornerRibbon({ label }) {
  if (!label) return null;
  // Carré invisible collé à droite, de la hauteur de la carte : le bandeau est centré dedans,
  // donc son axe (diagonale à 45°) passe exactement par le coin bas droit, quelle que soit la hauteur.
  return (
    <span className="pointer-events-none absolute top-0 right-0 h-full aspect-square">
      <span
        aria-label={`Terminé : ${label}`}
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45
          w-[10.625rem] max-[425px]:w-[9.375rem]
          ${RIBBON_BG[label] ?? 'bg-white'} border-y-2 border-black
          py-[0.1875rem] max-[425px]:py-[0.125rem]
          text-center font-title font-extrabold uppercase tracking-wide text-black
          text-[0.625rem] max-[425px]:text-[0.53rem] leading-none whitespace-nowrap
        `}
      >
        {label}
      </span>
    </span>
  );
}
