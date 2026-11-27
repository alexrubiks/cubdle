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
        pointer-events-none absolute right-[-2.75rem] top-[1.625rem] max-[425px]:right-[-2.625rem] max-[425px]:top-[1.3125rem]
        w-[10.625rem] max-[425px]:w-[9.375rem] rotate-45
        bg-black py-[0.3125rem] max-[425px]:py-[0.25rem]
        text-center font-title font-extrabold uppercase tracking-wide text-white
        text-[0.625rem] max-[425px]:text-[0.53rem] leading-none
        shadow-[0_1px_0_rgba(0,0,0,0.25)]
      "
    >
      {label}
    </span>
  );
}
