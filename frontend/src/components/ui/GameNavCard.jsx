import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

function GameNavCard({ to, direction, color, prefix, title }) {
  const isPrev = direction === 'prev';

  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 hover:scale-[1.03] transition-transform"
    >
      <span className="font-body text-xs text-black/60 font-bold uppercase">
        {isPrev ? 'Jeu précédent' : 'Jeu suivant'}
      </span>

      <div className={`relative w-40 h-16 ${color} border-4 border-black rounded-xl flex items-center justify-center px-3`}>

        {isPrev && (
          <ArrowLeft
            size={18}
            strokeWidth={3}
            className="absolute left-2 top-2"
          />
        )}

        <div className="flex flex-col leading-tight text-center">
          <span className="font-title font-extrabold text-xs">
            {prefix}
          </span>

          <span className="font-title font-extrabold text-sm">
            {title}
          </span>
        </div>

        {!isPrev && (
          <ArrowRight
            size={18}
            strokeWidth={3}
            className="absolute right-2 top-2"
          />
        )}

      </div>
    </Link>
  );
}

export default GameNavCard;