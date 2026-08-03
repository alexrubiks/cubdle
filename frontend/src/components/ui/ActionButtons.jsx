import { Trophy } from 'lucide-react';

function ActionButtons({ onLeaderboard, onHowToPlay }) {
  return (
    <div className="flex gap-2.5 w-full mt-6 max-w-sm px-8 mx-auto">
      <button
        onClick={onLeaderboard}
        className="flex-1 py-2.5 bg-cubdle-yellow border-4 border-black rounded-xl font-title font-extrabold text-sm max-[425px]:text-[11px] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
      >
        <Trophy className="w-[17px] h-[17px] max-[425px]:w-[13px] max-[425px]:h-[13px]" />
        <span>Classements</span>
      </button>

      <button
        onClick={onHowToPlay}
        className="flex-1 py-2.5 bg-white border-4 border-black rounded-xl font-title font-extrabold text-sm max-[425px]:text-[11px] hover:scale-105 active:scale-95 transition-transform"
      >
        Comment jouer
      </button>
    </div>
  );
}

export default ActionButtons;