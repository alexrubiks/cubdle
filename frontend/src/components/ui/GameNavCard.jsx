import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

function GameNavCard({ to, direction, color, prefix, title }) {
  const isPrev = direction === 'prev';

  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 hover:scale-[1.03] transition-transform shrink-0"
    >
      <span className="hidden lg:block font-body text-xs text-black/60 font-bold uppercase">
        {isPrev ? 'Jeu précédent' : 'Jeu suivant'}
      </span>

      <div
        className={`relative ${color} border-4 border-black rounded-xl flex items-center justify-center
          w-11 h-11 lg:w-40 lg:h-16 px-0 lg:px-3`}
      >
        {isPrev && (
          <ArrowLeft
            size={16}
            strokeWidth={3}
            className="lg:absolute lg:left-2 lg:top-2"
          />
        )}

        <div className="hidden lg:flex flex-col leading-tight text-center">
          <span className="font-title font-extrabold text-xs">
            {prefix}
          </span>
          <span className="font-title font-extrabold text-sm">
            {title}
          </span>
        </div>

        {!isPrev && (
          <ArrowRight
            size={16}
            strokeWidth={3}
            className="lg:absolute lg:right-2 lg:top-2"
          />
        )}
      </div>
    </Link>
  );
}

export default GameNavCard;