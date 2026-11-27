/**
 * Bandeau noir en biais dans le coin supérieur droit (jeu terminé + score).
 * Le parent doit être en `relative overflow-hidden`.
 */
export default function CornerRibbon({ label }) {
  if (!label) return null;
  return (
    <span
      aria-label={`Terminé : ${label}`}
      className="
        pointer-events-none absolute right-[-44px] top-[26px] max-[425px]:right-[-42px] max-[425px]:top-[21px]
        w-[170px] max-[425px]:w-[150px] rotate-45
        bg-black py-[5px] max-[425px]:py-[4px]
        text-center font-title font-extrabold uppercase tracking-wide text-white
        text-[10px] max-[425px]:text-[8.5px] leading-none
        shadow-[0_1px_0_rgba(0,0,0,0.25)]
      "
    >
      {label}
    </span>
  );
}
