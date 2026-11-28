import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';

/**
 * Badge « A soutenu Cubdle » (User.is_supporter, coché à la main dans l'admin).
 * Icône dessinée, pas un caractère : impossible à imiter dans un pseudo.
 * Même comportement que la couronne : un tap affiche la bulle 2 s.
 */
export default function SupporterBadge({ size = 14 }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const label = 'A soutenu Cubdle';

  return (
    <span className="relative shrink-0 inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setOpen(false), 2000);
        }}
        aria-label={label}
        title={label}
        className="leading-none transition-transform hover:scale-110"
      >
        <Heart size={size} strokeWidth={2.5} className="text-black fill-cubdle-red" />
      </button>
      {open && (
        <span className="absolute left-[calc(100%+6px)] top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-lg bg-black px-2 py-1 font-body text-[0.6875rem] font-bold text-white">
          {label}
        </span>
      )}
    </span>
  );
}
